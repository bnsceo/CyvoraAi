# Cyvora Operating-System Frontend Architecture

## Product definition

Cyvora is a founder-controlled operating system for researching, designing, launching, governing, and operating AI-native companies.

It is not a dashboard collection and not a chatbot wrapper.

## Six operating systems

### 1. Control
- Command Center
- Founder mission intake
- Executive AI briefing
- Priority queue
- Runtime posture
- Cost posture

### 2. Intelligence
- Market Intelligence
- Trend discovery
- Competitor and operator analysis
- Ethical reverse engineering
- Evidence and source provenance
- Opportunity scoring
- Blueprint directives

### 3. Structure
- Companies
- Headquarters
- Departments
- Teams
- Agent registry
- Connector assignments
- Company lifecycle

### 4. Execution
- Tasks
- Approval queue
- Policy gates
- Worker runs
- Provider selection
- Output validation
- Result acceptance

### 5. Safety
- Harness Engineering
- Security and permissions
- Cost ceilings
- Sandboxing
- Rollback posture
- War Room
- Incident recovery

### 6. Memory
- History
- Outputs
- Decisions
- Validation records
- Audit events
- Institutional memory

## Required primary surfaces

1. Command Center
2. Market Intelligence
3. Companies
4. Headquarters
5. Agents & Tasks
6. Approvals
7. Connectors
8. Harness Engineering
9. Policy & Security
10. War Room
11. History & Memory

## Canonical operating loop

Objective
→ Research
→ Blueprint
→ Founder Approval
→ Company Instantiation
→ Task Approval
→ Policy Gate
→ Worker Claim
→ Execution
→ Validation
→ Founder Acceptance
→ History and Institutional Memory

## Frontend rules

- Every surface must expose state, owner, risk, cost, and next action.
- Every consequential action must show its approval requirement.
- Every execution must show its task, policy decision, provider, validation result, and trace.
- Mobile must support reviewing company details, approving work, inspecting incidents, and reviewing results.
- Public demo data must be clearly labeled as seeded or mocked.
- No operating capability may be removed merely to simplify the visual design.
