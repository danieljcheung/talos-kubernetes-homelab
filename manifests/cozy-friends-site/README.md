# Cozy Friends companion site

This directory delivers the static Cozy Friends guide at `cozy.popinvites.com`. The
site source and Vite build live under `site/cozy`; this workload serves the three
generated browser assets plus the six fixed WebP assets from a restricted
Kubernetes namespace.

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

The Cozy-only `binaryData` section must contain exactly these six keys, encoded
from the corresponding files in `site/dist-cozy/assets`:

- `cozy-calendar.webp`
- `cozy-connect.webp`
- `cozy-download.webp`
- `cozy-hero.webp`
- `cozy-sapling.webp`
- `cozy-user.webp`

The sprite backgrounds use the site's `#fcf3e2` field color; the sapling also
has transparent edges so the same mark can sit inside the olive launch button.

The Deployment projects each binary key to `/usr/share/nginx/html/assets/<key>`,
which is the public `/assets/<key>` URL. Do not add placeholders or manually
edit encoded values. The generator fails when a fixed asset is missing or an
unexpected build asset would otherwise be omitted.

The committed ConfigMap can remain without binary entries until the first
complete build, but the workload is not ready to sync until all six WebP files
exist and the generator has run:

```bash
export VITE_TURNSTILE_SITE_KEY='<public site key from the Turnstile widget>'
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

The generator owns both ConfigMap sections and emits deterministic key order.
It rejects rendered output at or above Kubernetes' 1 MiB object limit, so keep
the complete generated manifest below that limit. Portfolio defaults continue
to preserve their existing `binaryData` section and do not apply this Cozy
asset contract.

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

The public guide also reads same-host `GET /api/minecraft/status`. The API
performs a short-timeout Minecraft Java Server List Ping against the internal
`homestead-headless.cozy-friends.svc.cluster.local:25565` Service and returns
only aggregate `online`, `players`, `maxPlayers`, and `checkedAt` fields. It
does not use RCON and never exposes player names, IPs, MOTD, version, or the
raw status response. Successful results are cached briefly to avoid polling
Minecraft for every browser request; an unavailable server returns HTTP 503.

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
- `configmap.yaml`: generated text assets plus the six fixed WebP `binaryData` keys
- `deployment.yaml`: hardened one-replica nginx workload mounting all nine keys
- `service.yaml`: internal port 80 to 8080 ClusterIP Service
- `ingress.yaml`: `cozy.popinvites.com` nginx Ingress
- `networkpolicy.yaml`: ingress-nginx-only ingress and default-deny egress
- `kustomization.yaml`: complete resource set for this workload
