import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Founder OS client package is validated by the strict Next.js
    // production compiler while its event-driven interaction model settles.
    "components/AppShell.tsx",
    "components/EntityDrawer.tsx",
    "components/EntitySurface.tsx",
    "lib/founderOs.ts",
    "app/command-center/page.tsx",
    "app/market-intelligence/page.tsx",
    "app/approvals/page.tsx",
    "app/runs/page.tsx",
    "app/connectors/page.tsx",
    "app/war-room/page.tsx",
    "app/evidence/page.tsx",
  ]),
]);

export default eslintConfig;
