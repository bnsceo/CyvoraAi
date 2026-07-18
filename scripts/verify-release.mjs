import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'app/companies/page.tsx',
  'components/CompanyDetailSurface.tsx',
  'lib/stateMachine.ts',
  'lib/useBreakpoint.ts',
  'lib/useOverlayA11y.ts',
  'lib/db.ts',
  'worker/execution_worker.py',
  'worker/supervisor_router.py',
  'docs/FRONTEND_BACKEND_BRIDGE.md',
  'docs/RELEASE_GATE.md',
  'docs/product-tour.html',
];

const forbiddenFiles = [
  '.github/workflows/apply-traceability-fast.yml',
  '.github/workflows/kick-traceability.yml',
  '.github/workflows/finish-traceability.yml',
];

const errors = [];

for (const file of requiredFiles) {
  try {
    await access(file);
  } catch {
    errors.push(`Missing required file: ${file}`);
  }
}

for (const file of forbiddenFiles) {
  try {
    await access(file);
    errors.push(`Temporary importer must not exist: ${file}`);
  } catch {
    // Expected.
  }
}

try {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  for (const script of ['lint', 'typecheck', 'build', 'verify']) {
    if (!packageJson.scripts?.[script]) errors.push(`Missing package script: ${script}`);
  }
} catch (error) {
  errors.push(`Unable to validate package.json: ${error instanceof Error ? error.message : String(error)}`);
}

if (errors.length) {
  console.error('\nCyvora release structure verification failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Cyvora release structure verification passed.');
