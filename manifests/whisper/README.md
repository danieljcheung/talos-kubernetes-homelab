# Whisper Manifests

Private, short-lived clipboard service for trusted devices.

## Resources

- `namespace.yaml` creates the `whisper` namespace.
- `deployment.yaml` runs one non-root Next.js web pod.
- `service.yaml` exposes the pod on port `3000` inside the cluster.
- `tailscale-ingress.yaml` exposes the app privately through Tailscale as `whisper`.
- `whisper-env.secret.yaml` supplies runtime secrets.

## Promotion

Whisper uses manual GitOps promotion:

```text
build/push image tag
  -> update deployment.yaml image
  -> commit to talos-kubernetes-homelab
  -> Argo CD syncs manifests/whisper
```

The pinned image currently lives in:

```text
manifests/whisper/deployment.yaml
```

## Operational Notes

- Keep `replicas: 1`; snippets live in process memory.
- Keep `strategy.type: Recreate`; rolling updates would temporarily split memory state.
- Restarting or redeploying the pod clears all snippets.
- Do not expose this publicly unless the security model is redesigned.
- Use `/login` probes because the login page should be reachable without an authenticated session.
