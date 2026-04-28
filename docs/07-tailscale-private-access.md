# Private Access with Tailscale

This document describes how private administrative access is handled in the Talos Kubernetes homelab.

## Goal

Argo CD is an administrative dashboard. It should not be exposed directly to the public internet.

Instead, the homelab uses Tailscale to make Argo CD reachable only from devices connected to the private tailnet.

## Architecture

```text
Trusted device on Tailscale
        ↓
argocd.tail2be9f6.ts.net
        ↓
Tailscale Ingress
        ↓
argocd-server Service
        ↓
Argo CD pods
```

## Why Tailscale?

Tailscale provides a private zero-trust network across trusted devices. For this homelab, it is used for the admin plane:

- Argo CD dashboard
- future internal dashboards
- future monitoring/admin tooling

This avoids opening router ports for sensitive services.

## Kubernetes Operator

The Tailscale Kubernetes Operator runs inside the cluster and watches Kubernetes resources.

It was installed with Helm using a Tailscale OAuth client with Kubernetes-scoped tags and write permissions for the operator's required resources.

The operator adds CRDs and controllers that let Kubernetes resources request Tailscale networking behavior.

## Argo CD Ingress

Argo CD was exposed privately with a Kubernetes Ingress using the Tailscale ingress class.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-tailscale
  namespace: argocd
spec:
  ingressClassName: tailscale
  defaultBackend:
    service:
      name: argocd-server
      port:
        number: 443
  tls:
    - hosts:
        - argocd
```

The resulting private URL is:

```text
https://argocd.tail2be9f6.ts.net
```

## Verification

Useful commands:

```bash
kubectl get ingress -n argocd
kubectl describe ingress argocd-tailscale -n argocd
kubectl get pods -n tailscale -o wide
tailscale status
```

The Tailscale status output should show an `argocd` device/service in the tailnet.

## Design Decision

The homelab separates private and public access:

```text
Private admin plane → Tailscale
Public application plane → Cloudflare Tunnel or public ingress
```

This keeps admin tooling private while still allowing selected public workloads to be exposed intentionally.
