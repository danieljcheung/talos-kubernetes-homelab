# Cozy Friends companion site

This directory delivers the static Cozy Friends guide at `cozy.popinvites.com`. The
site source and Vite build live under `site/cozy`; this workload only serves the
three generated browser assets from a restricted Kubernetes namespace.

## Build and ConfigMap contract

`configmap.yaml` is generated state, not a hand-authored copy of the site. Its
`data` section must contain exactly these keys:

- `index.html` from `site/dist-cozy/index.html`
- `app.js` from `site/dist-cozy/assets/app.js`
- `app.css` from `site/dist-cozy/assets/app.css`

The committed manifest begins with empty block-scalar values so it remains a
valid, Kustomize-compatible ConfigMap before the first build. Do not sync this
empty placeholder as the public site. Build and synchronize the ConfigMap before
creating or syncing the Argo application:

```bash
make build-cozy
make sync-cozy
make verify-cozy
```

The equivalent direct commands are:

```bash
npm --prefix site run build:cozy
node scripts/generate-configmap.mjs \
  --dist site/dist-cozy \
  --configmap manifests/cozy-friends-site/configmap.yaml
node scripts/generate-configmap.mjs --check \
  --dist site/dist-cozy \
  --configmap manifests/cozy-friends-site/configmap.yaml
```

The generator owns the ConfigMap `data` section. Do not manually edit the
asset values; rebuild `site/cozy` and run the sync command instead. Keep the
rendered ConfigMap below Kubernetes' 1 MiB object limit. The generated bundle
must reference only the three mounted files and must not add font, image, or
other asset keys without a matching workload mount and generator contract.

## Kubernetes delivery

`manifests/argocd/apps/cozy-friends-site.yaml` watches this directory with the
repository's standard Argo CD source and destination. The application targets
namespace `cozy-friends-site`; the namespace manifest applies restricted Pod
Security Admission labels.

The Deployment runs one `nginxinc/nginx-unprivileged` replica on HTTP port 8080.
The image uses the immutable OCI index digest for
`nginxinc/nginx-unprivileged:1.27.5-alpine`:

```text
sha256:65e3e85dbaed8ba248841d9d58a899b6197106c23cb0ff1a132b7bfe0547e4c0
```

The container runs as UID/GID 101 with RuntimeDefault seccomp, no service
account token, no privilege escalation, a read-only root filesystem, and all
Linux capabilities dropped. The ConfigMap is mounted read-only at the HTML and
asset paths. Writable nginx cache, runtime, and temporary paths are isolated in
`emptyDir` volumes. The ClusterIP Service exposes port 80 and forwards to
container port 8080.

The NetworkPolicies default-deny ingress and egress. Only TCP 8080 from Pods in
the namespace labeled `kubernetes.io/metadata.name: ingress-nginx` is allowed;
there is no application egress rule. Keep the ingress-nginx namespace and its
label intact so the existing Cloudflare Tunnel path can reach the site.

## Cloudflare wildcard prerequisite

Before syncing this application, confirm the existing proxied Cloudflare
Tunnel still has a public wildcard hostname for `*.popinvites.com` targeting
`ingress-nginx` and preserving the `Host` header. That wildcard must cover
`cozy.popinvites.com`.

Do not create a second tunnel, a separate `cozy` DNS record, or a Cloudflare
Access policy for this public friend guide. The signed-out request flow is:

```text
browser -> Cloudflare proxied wildcard -> existing Cloudflare Tunnel
        -> ingress-nginx (Host: cozy.popinvites.com)
        -> cozy-friends-site Service:80 -> nginx Pod:8080
```

After the generated ConfigMap is committed and Argo reports the Deployment,
Service, and Ingress healthy, verify `https://cozy.popinvites.com` in a signed-out
browser. Confirm that Cloudflare still resolves the hostname to its proxied
addresses and that no private LAN address or credential is present in the
rendered guide.

## Username approval API

The public guide posts exact Java usernames to the same-host `/api/usernames`
route. The `/api` Ingress path targets the internal
`Service/cozy-friends-approval-api` on port 8080; it is ClusterIP-only. The
token-authenticated operator page is `https://cozy.popinvites.com/#admin`.

Requests persist in the one-instance CloudNativePG
`Cluster/cozy-friends-approval-db` on Longhorn. Apply the encrypted
`cozy-friends-approval.secret.yaml` locally through SOPS; it is intentionally
excluded from this Kustomization. The API also needs the runtime-only
`ghcr-danieljcheung` image-pull Secret in this namespace because its GHCR
package is private. Copy/apply that Secret through the trusted workstation
workflow; never commit it or print its credentials.

The `homestead` whitelist-sync sidecar fetches the approved feed with the
shared sync token every 60 seconds and adds validated names through localhost
RCON. No API Service, RCON Service, router rule, or approval-specific metrics
endpoint is created for this workflow.

## Files

- `namespace.yaml`: restricted application namespace
- `configmap.yaml`: generated `index.html`, `app.js`, and `app.css`
- `deployment.yaml`: hardened one-replica unprivileged nginx workload
- `service.yaml`: internal port 80 to 8080 ClusterIP Service
- `ingress.yaml`: `cozy.popinvites.com` nginx Ingress
- `networkpolicy.yaml`: ingress-nginx-only ingress and default-deny egress
- `kustomization.yaml`: complete resource set for this workload
