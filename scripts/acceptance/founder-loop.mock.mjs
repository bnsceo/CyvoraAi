#!/usr/bin/env node

import assert from 'node:assert/strict';

const baseUrl = process.env.CYVORA_ACCEPTANCE_BASE_URL || 'http://127.0.0.1:3000';
const objective = process.env.CYVORA_ACCEPTANCE_OBJECTIVE || 'Launch a founder-controlled AI media research company for practical business education.';

const expectedStages = [
  'objective',
  'research',
  'blueprint',
  'approval',
  'policy_gate',
  'worker',
  'execution',
  'validation',
  'history',
];

const response = await fetch(`${baseUrl}/api/founder-loop/mock`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ objective }),
});

const payload = await response.json();
assert.equal(response.status, 200, JSON.stringify(payload));
assert.equal(payload.success, true);
assert.equal(payload.loop.mode, 'mock');
assert.equal(payload.loop.objective, objective);
assert.match(payload.loop.traceId, /^trace_/);

assert.equal(payload.loop.research.mode, 'mock');
assert.ok(payload.loop.research.signals.length >= 3, 'Research must contain market signals.');
assert.ok(payload.loop.research.referenceOperators.length >= 1, 'Research must contain reference-operator analysis.');
assert.ok(payload.loop.research.opportunityGaps.length >= 1, 'Research must contain opportunity gaps.');
assert.ok(payload.loop.research.extractedPatterns.length >= 1, 'Research must extract durable operating patterns.');
assert.ok(payload.loop.research.differentiationRules.length >= 1, 'Research must prevent direct copying.');

assert.ok(payload.loop.blueprint.company?.name, 'Blueprint must create a company identity.');
assert.ok(payload.loop.blueprint.departments?.length > 0, 'Blueprint must contain departments.');
assert.ok(payload.loop.blueprint.tasks?.length > 0, 'Blueprint must contain tasks.');

assert.equal(payload.loop.approval.status, 'approved');
assert.equal(payload.loop.approval.actor, 'founder');
assert.equal(payload.loop.policy.decision, 'allow');
assert.equal(payload.loop.policy.externalActions, false, 'Mock acceptance must never permit real external actions.');
assert.equal(payload.loop.execution.status, 'completed');
assert.equal(payload.loop.execution.output.status, 'completed');
assert.equal(payload.loop.validation.status, 'accepted');
assert.equal(payload.loop.validation.protocol, 'deterministic-schema');

const actualStages = payload.loop.events.map((event) => event.stage);
assert.deepEqual(actualStages, expectedStages);
assert.ok(payload.loop.events.every((event) => event.traceId === payload.loop.traceId), 'Every event must share one trace ID.');
assert.ok(payload.loop.events.every((event) => event.status === 'completed'), 'Every mocked stage must complete.');

console.log('Cyvora mocked production acceptance test passed.');
console.log(JSON.stringify({
  baseUrl,
  traceId: payload.loop.traceId,
  stages: actualStages,
  company: payload.loop.blueprint.company.name,
  firstTask: payload.loop.execution.task,
}, null, 2));
