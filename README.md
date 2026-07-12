# Cyvora AI Command Center

<p align="center">
  <img src="./public/cyvora-logo.png" alt="Cyvora logo" width="720" />
</p>

Cyvora is an AI Command Center for founder-led operations: an operating system for turning objectives into companies, departments, teams, agents, tasks, connectors, and outputs.

## What this project does

- captures a business objective from the founder
- previews the generated operating structure before execution
- requires approval before the build or mission can start
- supports a local-only free mode for development and testing
- keeps the UI focused on hierarchy, execution, and control

## Access and monetization model

Cyvora is designed so the founder and builder can use it locally for free while the product evolves.

- Local mode: free for founder and builder use
- Public demo mode: free, seeded, read-only, resettable
- Builder tier: paid hosted access with stronger harness controls
- Operator tier: paid production access with multi-company support and auditability
- Enterprise tier: custom deployment, SLA, and dedicated runtime

The monetization model is based on infrastructure, safety, and production capacity rather than generic AI chat.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3003` in your browser if the local server is running on the canonical Cyvora port.

## Free local Codex mode

If you want to use Codex without OpenAI billing on your own machine, run:

```bash
npm run codex:free -- "your prompt here"
```

The first run may download a local model into Ollama. After that, it stays local to your machine.

## Project notes

- The app is designed to run in local, demo, and later production modes.
- The public demo mode is read-only.
- Approval gates are intentionally required before execution.
- The remaining production work is tracked in [PRODUCTION_ROADMAP.md](./PRODUCTION_ROADMAP.md).
- The first production deployment path and worker loop are documented in [DEPLOYMENT_FLYIO.md](./DEPLOYMENT_FLYIO.md).
- The current product direction is documented in [VISION_AI.md](./VISION_AI.md).

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying)
