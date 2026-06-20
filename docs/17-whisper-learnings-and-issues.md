# Whisper Learnings and Issues

Date: 2026-06-19

## What Whisper Is

Whisper is my private, short-lived clipboard for trusted devices. I use it to move links, commands, tokens, environment blocks, and notes between machines without setting up a database or permanent storage.

The current deployment is intentionally small:

```text
GitHub image tag
  -> homelab GitOps repo pins image
  -> Argo CD applies manifests/whisper
  -> Deployment/Service/Ingress run in namespace whisper
  -> Tailscale Ingress exposes the app privately as whisper
```

## Current Kubernetes Shape

- **Namespace:** `whisper`
- **Argo CD Application:** `manifests/argocd/apps/whisper.yaml`
- **Workload manifests:** `manifests/whisper/`
- **Container image:** pinned manually in `manifests/whisper/deployment.yaml`
- **Replica count:** `1`
- **Deployment strategy:** `Recreate`
- **Service:** ClusterIP on port `3000`
- **Ingress:** Tailscale ingress, private hostname `whisper`
- **Secrets:** `whisper-env` supplies runtime environment values

## Why One Replica

Whisper stores snippets in server process memory. That means every pod would have its own independent snippet pool.

So the deployment uses:

```yaml
replicas: 1
strategy:
  type: Recreate
```

My learning: scaling a stateless-looking web app is not automatically safe. If the state is in memory, multiple replicas can split user data across pods unless there is shared storage, Redis, Postgres, or sticky routing.

## GitOps Promotion Model

Whisper uses manual image promotion, like the operator flow:

```text
CI/build process publishes ghcr.io/danieljcheung/whisper:<sha-tag>
  -> I update manifests/whisper/deployment.yaml with the chosen image tag
  -> commit to talos-kubernetes-homelab
  -> Argo CD syncs the cluster to that Git state
```

This is useful because the cluster runs only what is pinned in Git. The downside is that promotion is manual until image automation is added.

## Issues and Tradeoffs

### In-memory snippets disappear on restart

This is intentional for privacy, but it means:

- pod restart wipes snippets
- node restart wipes snippets
- deployment rollout wipes snippets
- there is no recovery path

For Whisper, this is acceptable because the app is for short-lived transfer, not storage.

### Tailscale-only access is safer but less shareable

Whisper is exposed through Tailscale ingress, not the public Cloudflare path. That keeps it private to trusted devices and avoids turning a clipboard into a public service.

Tradeoff: it is not useful for sharing with people outside my trusted network.

### Secrets must stay out of plaintext Git

The app depends on `WHISPER_PASSWORD` and `WHISPER_SESSION_SECRET`. These values should stay in Kubernetes secrets managed through the homelab secret workflow, not in normal docs or public commits.

### Health checks should match the real app

The probes currently hit `/login`. This is simple and effective because the app should always serve the login page even before authentication.

Learning: probes should check a stable route that proves the process is serving HTTP without needing a user session.

## What I Learned

- A Kubernetes Deployment keeps the web process running, but it does not make app state durable.
- A Service gives the pod a stable internal endpoint even when pod IPs change.
- Ingress decides how traffic reaches the Service.
- GitOps means the image tag in Git is the source of truth, not whatever I built locally.
- Manual promotion is slower, but it makes rollouts understandable and reversible.
- Security posture comes from small scope: one private app, one replica, no database, private ingress, non-root container, and no persisted snippets.

## Future Improvements

- Add a short `manifests/whisper/README.md` checklist for day-to-day operations.
- Move secrets fully into the SOPS workflow if any plaintext secret file still exists locally.
- Add image automation later if manual promotion becomes annoying.
- Consider Redis only if I intentionally want multiple replicas or durable snippets.
