# Cyvora GitHub Pages Safety Boundary

## Canonical showcase

Only `docs/cyvora-full-app-showcase.html` is deployed to GitHub Pages.

The workflow copies it to the deployment artifact as `index.html`.

## Public landing and product tour

The canonical file includes:

1. A public landing screen.
2. A fully mocked interactive app showcase.
3. A public-only demo flow with no private-app unlock action.

The GitHub Pages site does **not** implement authentication and does **not** expose private runtime URLs, access codes, or execution endpoints. Any real app access remains outside the Pages showcase.

## Never include on Pages

- Secrets or API keys
- Access codes or passwords
- Private runtime URLs
- Server routes
- Worker code
- Databases or tenant files
- Real customer information
- Live connector operations
- Payment processing
- Mutation endpoints

## Static mock rule

Every company, task, output, approval, cost, incident, connector, and worker state shown on Pages must be fictional or explicitly mocked.
