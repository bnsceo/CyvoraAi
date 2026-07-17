# Cyvora Operating-System Frontend Architecture

Cyvora is a founder-controlled operating system for researching, designing, launching, governing, and operating AI-native companies.

## Six operating systems

### Control
Command Center, founder mission intake, Executive AI briefing, priorities, runtime posture, and cost posture.

### Intelligence
Market research, trend discovery, competitor and operator analysis, ethical reverse engineering, evidence provenance, opportunity scoring, and blueprint directives.

### Structure
Companies, Headquarters, departments, teams, agents, connectors, and company lifecycle.

### Execution
Tasks, approval queues, policy gates, workers, providers, validation, and result acceptance.

### Safety
Harness Engineering, security, budgets, sandboxing, rollback, War Room, and incident recovery.

### Memory
History, outputs, decisions, validation records, audit events, and institutional memory.

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

Objective → Research → Blueprint → Founder Approval → Company Instantiation → Task Approval → Policy Gate → Worker Claim → Execution → Validation → Founder Acceptance → History and Institutional Memory

## Frontend rules

- Every surface exposes state, owner, risk, cost, and next action.
- Every consequential action shows its approval requirement.
- Every execution shows its task, policy decision, provider, validation result, and trace.
- Mobile supports company details, approvals, incidents, and result review.
- Public demo data is clearly labeled as seeded or mocked.
- No operating capability is removed merely to simplify the visual design.
