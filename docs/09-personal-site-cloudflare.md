# Personal Website and Cloudflare Tunnel

This phase publishes Daniel's personal website from the Talos Kubernetes homelab.

## Current State

- Domain purchased: `danieljcheung.com`
- Static personal website is deployed through the existing GitOps-managed nginx app.
- Argo CD watches `manifests/nginx` and syncs changes from GitHub into the cluster.
- nginx now serves the personal site from a ConfigMap containing:
  - `index.html`
  - `styles.css`
- The nginx Service is `ClusterIP`, not `NodePort`, so it is only reachable inside the cluster unless accessed through a controlled path.
- Cloudflare Tunnel is being used for public access without router port forwarding.
- `https://danieljcheung.com` works.
- `https://www.danieljcheung.com` works after adding the matching Cloudflare Tunnel public hostname and allowing edge/config propagation.

## Architecture

```text
Browser
  ↓
Cloudflare DNS / proxy
  ↓
Cloudflare Tunnel
  ↓
cloudflared pod in Kubernetes
  ↓
nginx.default.svc.cluster.local:80
  ↓
nginx pod serving static site files from ConfigMap
```

## Why This Is Safer Than Port Forwarding

The site is not exposed with router port forwarding or a public node IP.

Instead:

- the Kubernetes Service is internal-only (`ClusterIP`)
- Cloudflare handles public edge traffic
- the tunnel establishes an outbound connection from the cluster
- no inbound firewall/router rule is needed
- admin dashboards remain separate on Tailscale

## Cloudflare Tunnel Target

Both hostnames should route to the same in-cluster service:

```text
danieljcheung.com      -> http://nginx.default.svc.cluster.local:80
www.danieljcheung.com  -> http://nginx.default.svc.cluster.local:80
```

Both the root hostname and `www` hostname should route to this same service target. If one hostname fails while the internal service works, suspect Cloudflare DNS/tunnel/edge propagation before changing nginx.

## `www` Hostname Checklist

In Cloudflare Zero Trust tunnel settings, confirm there are two public hostnames:

```text
danieljcheung.com
www.danieljcheung.com
```

Both should point to:

```text
http://nginx.default.svc.cluster.local:80
```

Also check Cloudflare DNS has a proxied CNAME for `www` pointing at the tunnel target, usually:

```text
www -> <tunnel-id>.cfargotunnel.com
```

## Kubernetes Manifests

The tunnel manifest is stored at:

```text
manifests/cloudflare-tunnel/deployment.yaml
```

The deployment expects a secret named:

```text
cloudflare-tunnel-token
```

in the namespace:

```text
cloudflare
```

The real tunnel token must never be committed to Git.

## Security Posture

This is secure enough for a personal static website:

- static site = low app attack surface
- no home IP exposure through port forwarding
- internal-only Kubernetes Service
- Cloudflare edge in front of public traffic
- no real tunnel token committed
- private admin dashboards remain on Tailscale

It is production-minded, but not fully production-grade yet.

## Remaining Hardening

To make this more production-grade:

- pin `cloudflare/cloudflared` to a specific version instead of `latest`
- run at least two `cloudflared` replicas if availability matters
- add readiness/liveness probes
- add NetworkPolicies
- add monitoring and alerting
- document disaster recovery/rebuild steps
- consider moving static files from ConfigMap to a versioned container image if the site grows


## Diagnostic Commands

Use these when one hostname works and the other does not:

```bash
dig +short danieljcheung.com
dig +short www.danieljcheung.com
curl -I https://danieljcheung.com
curl -I https://www.danieljcheung.com
kubectl -n cloudflare logs deploy/cloudflared --tail=100
```

To confirm the Kubernetes Service itself is healthy:

```bash
kubectl run www-check --rm -i --restart=Never --image=curlimages/curl:8.10.1 -- \
  sh -c 'curl -I -H "Host: danieljcheung.com" http://nginx.default.svc.cluster.local:80; curl -I -H "Host: www.danieljcheung.com" http://nginx.default.svc.cluster.local:80'
```
