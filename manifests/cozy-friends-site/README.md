# Cozy Friends companion site

This directory delivers the static Cozy Friends guide at `cozy.popinvites.com`. The
site source and Vite build live under `site/cozy`; this workload only serves the
three generated browser assets from a restricted Kubernetes namespace.

## Public guide contract

The public message is a field-guide invitation to a shared Homestead world for
**chilling, building, and adventuring with friends**. The page displays a live
countdown to **Thursday, August 13, 2026 at 8:00 PM Eastern Daylight Time
(EDT, UTC−04:00)**. August is EDT, so do not document this target as
UTC−05:00.

The public launcher guidance is **CurseForge only**. Link to the official
[Homestead 1.3.7 CurseForge file](https://www.curseforge.com/minecraft/modpacks/homestead-cozy/files/8110152)
and tell friends to install the CurseForge app, search for Homestead, choose
version `1.3.7`, allocate `8 GiB` of client RAM, and launch. Do not add Prism
Launcher, Modrinth App, or reconstructed-pack instructions as alternate
launcher paths.

The public request form collects the person's `name`, the exact
case-sensitive Minecraft Java `username`, and a Cloudflare Turnstile
challenge. It submits exactly:

```json
{
  "name": "requester's name",
  "username": "ExactJavaName",
  "turnstileToken": "browser-generated-token"
}
```

`VITE_TURNSTILE_SITE_KEY` is the public site key used by the browser build and
may be visible in the rendered bundle. The API's `TURNSTILE_SECRET_KEY` is
private, lives only in the encrypted approval Secret, and is used for
Cloudflare Siteverify with expected hostname `cozy.popinvites.com`. Never put
the server secret in this ConfigMap, an image, browser code, Git, logs, or
chat.

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

Export the public Turnstile browser key before building. `make build-cozy`
versions the asset URLs from the current Git revision, which prevents the
Cloudflare edge from serving a previous bundle after a deploy:

```bash
export VITE_TURNSTILE_SITE_KEY='<public site key from the Turnstile widget>'
```

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

The public guide posts a person's name and exact Java username to the
same-host `/api/usernames` route after the Turnstile widget completes. The
request body is exactly
`{"name":"...","username":"...","turnstileToken":"..."}`. The API trims and
validates `name` as 1–80 characters and `username` against
`^[A-Za-z0-9_]{3,16}$`, then calls Cloudflare Siteverify with
`TURNSTILE_SECRET_KEY` and requires the expected hostname
`cozy.popinvites.com` before it persists anything. Missing/invalid Turnstile
tokens and invalid fields must not create a request.

The `/api` Ingress path targets the internal
`Service/cozy-friends-approval-api` on port 8080; it is ClusterIP-only. The
token-authenticated operator page is `https://cozy.popinvites.com/#admin`.
The owner reviews pending rows, sees both `requester_name` and the exact
`username`, and approves or rejects them. Approved rows are emitted to the
protected whitelist feed; the Minecraft sidecar adds them through localhost
RCON. No public API Service, RCON Service, router rule, or approval-specific
metrics endpoint is created.

Requests persist in the one-instance CloudNativePG
`Cluster/cozy-friends-approval-db` on Longhorn. The API's startup migration
adds `requester_name` to the existing `username_submissions` table and
backfills legacy rows as `Legacy requester`; the database remains the source
of truth. Apply the encrypted `cozy-friends-approval.secret.yaml` locally
through SOPS; it is intentionally excluded from this Kustomization. The
Secret contains admin/sync values and the private `turnstile-secret-key`
consumed as `TURNSTILE_SECRET_KEY`; rotate it only in SOPS and never print it.
The public `VITE_TURNSTILE_SITE_KEY` is build configuration, not a substitute
for the server secret.

The API also needs the runtime-only `ghcr-danieljcheung` image-pull Secret in
this namespace because its GHCR package is private. Copy/apply that Secret
through the trusted workstation workflow; never commit it or print its
credentials.

## Turnstile failure checks

From a signed-out browser, confirm the widget loads on
`cozy.popinvites.com`. A missing or failed challenge must show a visible
submission error and leave the database unchanged; a completed challenge must
allow the request to proceed. The API contract is observable without a real
secret: a missing `turnstileToken` is rejected with `400`, a failed Siteverify
result or hostname mismatch with `403`, and invalid name/username shapes with
`400`. Do not paste real tokens into browser history, shell commands, logs, or
issues.

## Files

- `namespace.yaml`: restricted application namespace
- `configmap.yaml`: generated `index.html`, `app.js`, and `app.css`
- `deployment.yaml`: hardened one-replica unprivileged nginx workload
- `service.yaml`: internal port 80 to 8080 ClusterIP Service
- `ingress.yaml`: `cozy.popinvites.com` nginx Ingress
- `networkpolicy.yaml`: ingress-nginx-only ingress and default-deny egress
- `kustomization.yaml`: complete resource set for this workload
