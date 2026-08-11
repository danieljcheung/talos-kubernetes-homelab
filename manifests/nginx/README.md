# nginx Personal Website

This directory contains Daniel Cheung's personal website served by nginx inside Kubernetes. The website source lives in `site/` as a Vite React/TypeScript app; this directory receives the built static assets for GitOps delivery.

Argo CD watches this directory through the `nginx` app, so commits to GitHub become the desired state for the live site.

## Current State

- Website source is maintained in `site/`, not hand-authored directly in the ConfigMap.
- The built site is embedded in `configmap.yaml` as deterministic keys:
  - `index.html`
  - `app.js`
  - `app.css`
- `binaryData` preserves `Daniel_Cheung_Final_Resume.pdf` so the existing resume URL remains available.
- `deployment.yaml` mounts the HTML file, deterministic `/assets/app.js`, deterministic `/assets/app.css`, and the resume PDF into nginx's web root.
- `service.yaml` exposes nginx internally as a `ClusterIP` service.
- Public access is handled by Cloudflare Tunnel instead of NodePort/router port forwarding.
- `https://danieljcheung.com` works.
- `https://www.danieljcheung.com` works through the same Cloudflare Tunnel target.

## Site Build and ConfigMap Sync

Prerequisites:

- Node.js and npm
- dependencies installed once from the site directory:

```bash
cd site && npm install
```

Frontend checks and build commands live in `site/package.json`:

```bash
cd site && npm test
cd site && npm run build
```

From the repository root, sync the latest built assets into the nginx ConfigMap:

```bash
make sync
```

Before committing, verify the ConfigMap still matches the current build output:

```bash
make verify
```

`make sync` reads `site/dist/index.html`, `site/dist/assets/app.js`, and `site/dist/assets/app.css`, then rewrites the ConfigMap `data` section with the fixed keys nginx mounts. Do not manually edit generated `index.html`, `app.js`, or `app.css` inside `configmap.yaml`; those changes will be overwritten by the next sync and can make `make verify` fail. Update `site/`, rebuild, then sync instead.

The generator preserves the existing `binaryData` section, including `Daniel_Cheung_Final_Resume.pdf`.

## Site Behavior

The React site includes a dual light/dark theme toggle, a Dither Kit-derived canvas visual, and an all-public-GitHub-project snapshot rendered from `site/src/data/projects.ts`. These are application behaviors from the built bundle; the Kubernetes delivery path remains static nginx assets in a ConfigMap.

## Deployment Model

```text
GitHub
  -> Argo CD
  -> manifests/nginx
  -> ConfigMap + Deployment + ClusterIP Service
  -> nginx pod
  -> Cloudflare Tunnel
  -> danieljcheung.com
```

## Verify In-Cluster Site

```bash
kubectl get pods -l app=nginx
kubectl get svc nginx
kubectl port-forward svc/nginx 8080:80
```

Then open:

```text
http://localhost:8080
```

## Files

- `configmap.yaml`: generated website `index.html`, `app.js`, and `app.css`, plus preserved resume `binaryData`
- `deployment.yaml`: nginx deployment mounting HTML, deterministic assets, and the resume PDF
- `service.yaml`: internal HTTP service for Cloudflare Tunnel routing
