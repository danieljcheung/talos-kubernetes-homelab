# Personal Website and Cloudflare Tunnel

This phase publishes Daniel's personal website from the Talos Kubernetes homelab.

## Current State

- Domain purchased: `danieljcheung.com`
- Static personal website is deployed through the existing GitOps-managed nginx app.
- The website source lives in `site/` as a Vite React/TypeScript app, not as hand-authored HTML/CSS directly inside the ConfigMap.
- Argo CD watches `manifests/nginx` and syncs changes from GitHub into the cluster.
- nginx now serves the personal site from a ConfigMap containing generated static assets:
  - `index.html`
  - `app.js`
  - `app.css`
  - preserved `Daniel_Cheung_Final_Resume.pdf` under `binaryData`
- The nginx Service is `ClusterIP`, not `NodePort`, so it is only reachable inside the cluster unless accessed through a controlled path.
- Cloudflare Tunnel is being used for public access without router port forwarding.
- The tunnel now runs two `cloudflared` replicas for connector redundancy.
- `cloudflared` is pinned to HTTP/2 transport instead of QUIC after intermittent Cloudflare 502/host errors appeared while nginx and the in-cluster Service were healthy.
- `https://danieljcheung.com` works.
- `https://www.danieljcheung.com` works after adding the matching Cloudflare Tunnel public hostname and allowing edge/config propagation.

## Site Build and ConfigMap Delivery

Prerequisites:

- Node.js and npm
- site dependencies installed once:

```bash
cd site && npm install
```

The frontend commands are defined in `site/package.json`:

```bash
cd site && npm test
cd site && npm run build
```

The Vite build emits deterministic asset paths consumed by nginx:

```text
site/dist/index.html
site/dist/assets/app.js
site/dist/assets/app.css
```

From the repository root, copy those built assets into the nginx ConfigMap:

```bash
make sync
```

Then check that the committed ConfigMap is fresh relative to the build output:

```bash
make verify
```

`make sync` updates the ConfigMap `data` entries for `index.html`, `app.js`, and `app.css` while preserving the existing resume PDF in `binaryData`. Do not edit the generated ConfigMap asset bodies manually; edits belong in `site/`, followed by a frontend build and `make sync`. Manual changes to embedded generated assets are not source-of-truth and can be rejected by `make verify`.

The current React site opens on a press-driven amber soul-orb introduction. Soul essence forms the About, Work, and Resume navigation, while pressing the settled orb opens Chat. These features do not change the deployment path: Argo CD still syncs `manifests/nginx`, nginx still serves static files from the ConfigMap, and Cloudflare Tunnel still routes both public hostnames to the same in-cluster Service.

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
## Cozy Friends routes on `popinvites.com` (planned and gated)

The planned Cozy Friends companion guide is a separate workload from this
personal site. The existing proxied `*.popinvites.com` wildcard and Tunnel
should continue to route the browser path:

```text
browser -> Cloudflare proxied wildcard -> existing Tunnel
        -> ingress-nginx (Host: cozy.popinvites.com)
        -> cozy-friends-site Service
```

Do not create a second Tunnel, a separate `cozy` DNS record, or a Cloudflare
Access policy for the public guide. The Minecraft path is intentionally
different and must use an explicit gray-cloud/DNS-only record:

```text
Java client -> mc.popinvites.com DNS-only A record
            -> home WAN IPv4 -> router TCP 25565
            -> MetalLB LAN-verified VIP 10.0.0.254/32
```

The router reports DHCP `.2`–`.253`; `.254` was absent from the lease page,
ARP, and ping during preflight. The WAN address `99.227.195.189` matches an
independent public probe. The router's web UI delegates port-forward setup to
the Rogers Xfinity app, so the TCP 25565 edge rule remains pending.
Public launch is still gated by the EULA, allowlist, local secrets, client,
backup-restore, and outside-network monitor checks. The plan uses Longhorn
replica count 1, which provides persistent storage rather than high
availability; application-aware Restic backups are the primary recovery path.
[Cozy Friends Server runbook](19-cozy-friends-server.md) for the edge rule,
SOPS boundary, and rollback order.

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
- keep at least two `cloudflared` replicas if availability matters
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
