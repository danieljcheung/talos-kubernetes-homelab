# Kubernetes Dashboards

After setting up private access to Argo CD through Tailscale, I added Kubernetes dashboard tooling for day-to-day cluster visibility.

The goal was not to expose administrative dashboards publicly. Instead, the cluster uses Tailscale Ingress so admin tools are only reachable from devices on my tailnet.

## Dashboards

### Argo CD

Argo CD is the GitOps control plane for the cluster.

Private URL:

```text
https://argocd.tail2be9f6.ts.net
```

Ingress manifest:

```text
argocd-tailscale-ingress.yaml
```

This routes private Tailscale HTTPS traffic to the `argocd-server` Service in the `argocd` namespace.

### Headlamp

Headlamp is a Kubernetes dashboard for browsing cluster resources, workloads, namespaces, services, and events from a web UI.

Private URL:

```text
https://headlamp.tail2be9f6.ts.net
```

Ingress manifest:

```text
headlamp-tailscale-ingress.yaml
```

In this cluster, the Headlamp Service was installed in the `kube-system` namespace as `my-headlamp` on port `80`.

## Access Model

The admin access model is:

```text
Admin device on Tailscale
        ↓
Tailscale HTTPS name
        ↓
Tailscale Kubernetes Operator
        ↓
Kubernetes Ingress
        ↓
Internal Service
        ↓
Dashboard pod
```

This keeps administrative interfaces private while still making them convenient to reach from trusted devices.

## Security Notes

- Argo CD and Headlamp are not exposed through router port forwarding.
- Dashboard access depends on Tailscale identity and tailnet membership.
- The Kubernetes API and dashboard tools should still be treated as sensitive admin surfaces.
- Tokens used to log into Headlamp should be scoped carefully and rotated when needed.

## What This Adds

This phase adds a practical operations layer on top of the bare-metal cluster:

- GitOps visibility through Argo CD
- Kubernetes resource visibility through Headlamp
- Private dashboard access through Tailscale
- A cleaner separation between admin services and future public workloads
