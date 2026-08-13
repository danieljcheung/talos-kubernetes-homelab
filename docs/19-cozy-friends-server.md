# Cozy Friends Server — Homestead 1.3.7

This runbook is the operating record for the Cozy Friends Minecraft Java
server and its public companion guide. It describes the repository-local
implementation, verified live evidence, and remaining operator gates; it is
not a public-launch claim.

Current checkpoint: the MetalLB chart is installed, the Cozy guide and
token-authenticated approval API are Argo-synced and reachable at
`https://cozy.popinvites.com`, and the LAN-verified MetalLB VIP is
`10.0.0.254/32`. The Homestead pod is ready with the whitelist-sync sidecar.
The owner has accepted the EULA. The S3-compatible Longhorn backup target is
healthy, the application-aware Restic snapshot and textfile success metric
are proven, and a disconnected throwaway Homestead pod loaded the restored
world and returned its known marker over localhost-only RCON. The MetalLB
pool, encrypted Secret contracts, and DNS-only `mc` record are
infrastructure/configuration evidence, not proof of public play. This runbook
makes no claim that a public Minecraft client join, router TCP forwarding, or
external monitor has been proven.

## Public guide promise and launch target

The friend-facing promise is simple: **a shared Homestead world for chilling,
building, and adventuring with friends**. The guide shows a live countdown to
**Thursday, August 13, 2026 at 8:00 PM Eastern Daylight Time (EDT,
UTC−04:00)**. August uses EDT, not UTC−05:00; the countdown target is a
scheduled invitation, not evidence that public Minecraft access is already
open.

The public guide recommends **only CurseForge** as the launcher path. Link
friends to the [Homestead 1.3.7 CurseForge file](https://www.curseforge.com/minecraft/modpacks/homestead-cozy/files/8110152):
install the CurseForge app, search for Homestead, choose version `1.3.7`,
allocate `8 GiB` of client RAM, and launch. Do not present Prism Launcher,
Modrinth App, or a reconstructed server pack as alternate public launcher
instructions.

Before a request can be reviewed, the public form collects the person's name
(`name`) and exact, case-sensitive Minecraft Java username (`username`), and
requires a Cloudflare Turnstile challenge token (`turnstileToken`). The API
contract is `POST /api/usernames` with JSON
`{"name":"...","username":"...","turnstileToken":"..."}`. The request is not
an allowlist entry until the owner reviews and approves it.

Primary source links:

- [Official Homestead server pack](https://cozystudios.org/homestead/server-pack/)
- [Homestead installation guide](https://cozystudios.org/client-guides/installing-homestead/)
- [FTB additions guide for Modrinth](https://cozystudios.org/client-guides/ftb-mods-modrinth/)
- [Homestead copyright license](https://cozystudios.org/homestead/copyright-license/)
- [Homestead Modrinth version `WMsE2fOj`](https://modrinth.com/modpack/homestead/version/WMsE2fOj)

## 1. Intended topology and exposure

The two public names intentionally use different paths, and LAN Minecraft
clients use the MetalLB VIP while the WAN fallback is node-bound:

```text
LAN Minecraft Java client
  -> MetalLB VIP 10.0.0.254
  -> cozy-friends/homestead gameplay Service
  -> homestead-0 StatefulSet pod

WAN Minecraft Java client
  -> DNS-only mc.popinvites.com
  -> current home WAN IPv4
  -> pending Rogers TCP 25565 rule
  -> talos-ssy-pdo (10.0.0.105)
  -> gameplay Service externalIPs: [10.0.0.105]
  -> homestead-0 StatefulSet pod

Web browser
  -> proxied *.popinvites.com wildcard
  -> existing Cloudflare Tunnel
  -> ingress-nginx (Host: cozy.popinvites.com)
  -> cozy-friends-site Ingress and ClusterIP Service
  -> unprivileged nginx pod
```

`mc.popinvites.com` must be an explicit Cloudflare `A` record for the current
home WAN IPv4 with **DNS only** (gray cloud). It overrides the proxied
wildcard for that exact name. The `cloudflare-ddns` workload maintains this
record every five minutes and has no Service. The gameplay Service remains the
only LoadBalancer: `10.0.0.254` is the LAN VIP and
`externalIPs: [10.0.0.105]` is the direct-node WAN compatibility fallback.
Kubernetes warns `externalIPs` may be deprecated or unsupported in future
clusters, so verify it after upgrades. No extra proxy or NodePort is used.

The initial router rule is pending: WAN TCP `25565` ->
`10.0.0.105:25565`. Optional voice chat is not required for ordinary gameplay;
it requires a separate approved WAN UDP `24454` ->
`10.0.0.105:24454` rule and external voice test. Do not expose the Kubernetes
API, Talos, node SSH, NodePorts, RCON, or other admin ports.

`cozy.popinvites.com` remains covered by the existing proxied
`*.popinvites.com` Tunnel route. Do not create a second tunnel, a separate
`cozy` DNS record, or a Cloudflare Access policy for the public guide. The
guide contains no private IPs or credentials.

MetalLB is only a LAN address-advertisement and Kubernetes failover mechanism.
It is not a firewall, DDoS service, encryption boundary, or substitute for
the router rule. `externalTrafficPolicy: Local` is required on the gameplay
Service so logs can retain the real client source address.

## 2. Launch gates and current status

Verified at the current checkpoint:

1. Kubernetes context `admin@noderoy-1` is reachable; all three Talos
   nodes are `Ready`, Longhorn is provisioned, and the existing monitoring,
   ingress-nginx, kube-proxy, and Cloudflare Tunnel paths were inspected.
2. MetalLB chart `0.16.1` is installed; its controller and all three speakers
   are `Ready`. The production `minecraft-public` pool and
   `homestead-gameplay` Service currently use `10.0.0.254`, and the Service
   reports a ready local endpoint. LAN TCP/HTTP probes succeeded; WAN routing
   remains a separate gate.
3. The router LAN is `10.0.0.0/24` with DHCP `.2`–`.253`. Candidate
   `10.0.0.254` was absent from the router lease page, ARP, and ping.
4. Router WAN IPv4 `99.227.195.189` matches the independent public IPv4 probe.
5. Cloudflare shows `mc.popinvites.com` as DNS-only at that address, the
   `*.popinvites.com` wildcard on the healthy two-replica Tunnel, and the
   public Cozy guide returns HTTP 200.
6. The official ZIP has observed size `537016567` bytes and the recorded
   SHA-256; a non-root local Homestead startup reached the helper image's
   `Done` readiness log. The ZIP remains outside Git and OCI registries.
7. The separate Cozy site Application is Argo-synced and Healthy.
8. The Longhorn S3-compatible `BackupTarget/default` is available; the
   production daily snapshot and weekly external-backup jobs are attached to
   the world volume's `default` recurring-job group. An application-aware
   Restic run produced snapshot `8f2c792a`, reported exit code `0`, and wrote
   the success timestamp metric. A throwaway PVC restore, official pack
   staging, disconnected server start, and localhost-only RCON marker check
   all succeeded.

Remaining owner/operator launch gates (these are evidence and credential
boundaries, not claims that the EULA, MetalLB pool, or encrypted Secret
contracts are absent):

1. The owner must add only WAN TCP `25565` -> `10.0.0.105:25565` through the
   Rogers Xfinity app. Do not forward RCON, NodePorts, or admin ports. Optional
   voice chat requires a separate approved WAN UDP `24454` ->
   `10.0.0.105:24454` rule and external voice test; it is not required for
   ordinary gameplay.
2. The owner must submit a person's name and exact, case-sensitive Java
   username through the Turnstile-protected public form, then use the
   token-gated admin dashboard to approve the owner account. Confirm the
   resulting allowlist entry before exposing WAN access.
3. After the LAN test, the owner must join from a genuinely outside network
   with the CurseForge Homestead `1.3.7` profile, Minecraft `1.20.1`, Fabric,
   Java `17`, and `8 GiB` client RAM. An on-LAN result can be hidden by NAT
   loopback and is not public Internet proof.
4. The owner must create and activate five-minute UptimeRobot TCP and HTTPS
   monitors, complete account/email verification, and observe a successful
   outside-network check. No external monitor is claimed proven here.
5. Friends may submit their own name and exact Java username after the form
   is live; each request still requires Turnstile, owner review, and approval.

Because the WAN path is pinned to the stable node, failure of
`10.0.0.105` or `talos-ssy-pdo` takes WAN gameplay and optional voice chat
offline even if MetalLB moves `10.0.0.254` to another node. LAN clients can
still use the MetalLB VIP. The router rule, allowlist, outside-network join,
and monitors remain pending; this runbook does not claim public launch.

The router's web UI delegates port-forward configuration to the Rogers Xfinity
app, so the edge rule is intentionally still absent from the recorded
checkpoint. Do not infer Minecraft readiness from the repository, DNS, LAN
VIP, or public guide alone.

## 3. Official artifact record

Download only from the official [server-pack page](https://cozystudios.org/homestead/server-pack/), which links the 1.3.7 Google Drive object. Do not reconstruct a server from the client `.mrpack`; CozyStudios publishes a separate official server pack.

| Field | Recorded value |
| --- | --- |
| Filename | `Homestead1.3.7_server_pack.zip` |
| Source | [CozyStudios Homestead Server Pack](https://cozystudios.org/homestead/server-pack/) → official 1.3.7 download |
| Source-advertised size | `512M` |
| Observed HTTP content length | `537016567` bytes (about `512.14 MiB`) |
| Expected SHA-256 | `38e90816b5eb6bd5a3b66096ad60d08bd9c8d69c00b4d27c6bc38f4233fd9e81` |
| Staging status | Verified against the recorded byte count and SHA-256 and staged on the private `homestead-pack` PVC; no ZIP is committed here |

At staging time, verify both the byte count and digest before copying the ZIP to the private `homestead-pack` Longhorn PVC. For example:

```bash
wc -c Homestead1.3.7_server_pack.zip
shasum -a 256 Homestead1.3.7_server_pack.zip
```

Inspect `HOW-TO-RUN.md`, `variables.txt`, `server.properties`, `mods/`, and `config/`. Confirm Minecraft `1.20.1`, Fabric, Java `17`, and no additional public TCP port; the optional voice-chat endpoint is UDP `24454` and must be treated as a separate router rule. The trusted-workstation smoke test may use `GENERIC_PACK` with `GENERIC_PACK_STRIP_DIRS=1` when the archive has one wrapper directory. The deployed restricted pod instead verifies and unpacks the ZIP with its non-root `stage-homestead-pack` init container, then skips the image's root-only generic-pack reapply path. Confirm a 1.3.7 client joins and the server stops cleanly before the helper pod copies the ZIP into `/pack` and is deleted.

The copyright terms permit private or public hosting, but do not permit republishing a derived server image or redistributing the pack. Keep the archive private.

## 4. EULA, allowlist, and administration

The live initial server settings are:

```text
EULA=TRUE                         # owner accepted before startup
TYPE=FABRIC
VERSION=1.20.1
# GENERIC_PACK is intentionally omitted from the runtime env; the non-root
# stage-homestead-pack init container verifies/unpacks the private ZIP.
SKIP_GENERIC_PACK_UPDATE_CHECK=true
MEMORY=8G
ONLINE_MODE=TRUE
ENABLE_WHITELIST=TRUE
ENFORCE_WHITELIST=TRUE
ENABLE_RCON=TRUE
RCON_PORT=25575
MAX_PLAYERS=15
DIFFICULTY=normal
MODE=survival
VIEW_DISTANCE=8
SIMULATION_DISTANCE=6
MOTD=Cozy Friends Server | Homestead 1.3.7
```

Submit the person's name and exact, case-sensitive Java username through the
public Cozy form. The form requires a Cloudflare Turnstile challenge before it
posts `{"name":"...","username":"...","turnstileToken":"..."}` to
`POST /api/usernames`. The API accepts names only when they are 1–80 characters
and usernames only when they match `^[A-Za-z0-9_]{3,16}$`; it verifies the
Turnstile token with Siteverify for the expected hostname
`cozy.popinvites.com` before persisting `requester_name` and `username`.
The owner reviews pending rows at `https://cozy.popinvites.com/#admin`; the
in-cluster sidecar adds approved names through localhost-only RCON. Keep the
router rule closed until the owner can join locally. Do not copy a username
from a display name or launcher nickname.

For a manual removal, use localhost-only RCON and verify the resulting list:

```bash
kubectl -n cozy-friends exec homestead-0 -c minecraft -- \
  rcon-cli whitelist remove '<exact-case-sensitive-java-username>'
kubectl -n cozy-friends exec homestead-0 -c minecraft -- \
  rcon-cli whitelist list
```

Do not put a real username, RCON password, or secret output in this document.
RCON has no Kubernetes Service and must not receive a router rule.

## 5. Build, ConfigMap sync, and GitOps delivery

The companion site is a separate Vite target under `site/cozy`; it does not alter portfolio routing or import portfolio-only rendering code. Build the generated ConfigMap before syncing the site Application:
Before the build, export the public browser key in the trusted build
environment; the Make target also versions the static asset URLs from the
current Git revision so Cloudflare cannot serve an older JavaScript bundle
after a launch update:

```bash
export VITE_TURNSTILE_SITE_KEY='<public site key from the Turnstile widget>'
```


```bash
make build-cozy
make sync-cozy
make verify-cozy
```

The equivalent commands are:

```bash
npm --prefix site run build:cozy
node scripts/generate-configmap.mjs \
  --dist site/dist-cozy \
  --configmap manifests/cozy-friends-site/configmap.yaml
node scripts/generate-configmap.mjs --check \
  --dist site/dist-cozy \
  --configmap manifests/cozy-friends-site/configmap.yaml
```

The generator owns the three ConfigMap assets (`index.html`, `app.js`, and `app.css`). Do not hand-edit generated asset bodies or sync the empty placeholder before a build. See [`manifests/cozy-friends-site/README.md`](../manifests/cozy-friends-site/README.md) for the existing workload contract.

After the required local SOPS Secrets exist and the relevant gates pass, sync child Applications in this order:

```bash
argocd app sync metallb-config
argocd app wait metallb-config --health --sync
argocd app sync cloudflare-ddns
argocd app wait cloudflare-ddns --health --sync
argocd app sync cozy-friends-site
argocd app wait cozy-friends-site --health --sync
argocd app sync cozy-friends
argocd app wait cozy-friends --health --sync
```

The Cozy Friends Secret contains RCON, Restic, repository, and least-privilege
S3 values. The Cloudflare DDNS Secret contains only the scoped Zone DNS Read/Edit
token for `popinvites.com`. The encrypted approval Secret contains the private
admin and sync bearer values plus the Turnstile server secret under
`turnstile-secret-key`; the API receives it as `TURNSTILE_SECRET_KEY`. Keep
these encrypted files excluded from their Kustomization resources. Apply them
locally before syncing the corresponding Application, without printing or
inspecting values:

```bash
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
sops --decrypt manifests/cozy-friends/cozy-friends.secret.yaml | kubectl apply -f -
sops --decrypt manifests/cloudflare-ddns/cloudflare-ddns.secret.yaml | kubectl apply -f -
sops --decrypt manifests/cozy-friends-site/cozy-friends-approval.secret.yaml | kubectl apply -f -

kubectl -n cozy-friends get secret cozy-friends-secrets -o name
kubectl -n cloudflare-ddns get secret cloudflare-ddns-token -o name
kubectl -n cozy-friends-site get secret cozy-friends-approval-secrets -o name
```

`VITE_TURNSTILE_SITE_KEY` is the public site key supplied to the Cozy Vite
build. It may be present in the browser bundle, but `TURNSTILE_SECRET_KEY`
must never be bundled, committed, logged, or entered into a browser. To rotate
the server secret, open the encrypted approval Secret directly in the trusted
SOPS editor, replace only `turnstile-secret-key`, save the encrypted file, and
pipe it to `kubectl apply -f -`; do not run `sops --decrypt` to a terminal, use
shell tracing, or print YAML. Restart the approval API so it reads the new
value, then verify only Secret metadata and API readiness.

Verify the Turnstile boundary from a signed-out browser: the widget must load
on `cozy.popinvites.com`, a missing or failed challenge must show a submission
error and create no database row, and a completed challenge must allow the
request to proceed. For an API smoke check, expect a missing `turnstileToken`
to be rejected with `400`, a failed Siteverify result (including a hostname
other than `cozy.popinvites.com`) with `403`, and invalid `name`/`username`
shapes with `400`; never include a real token or secret in the request log.

The final metadata-only commands above verify object presence, not secret
values. Never place a token, password, private key, S3 endpoint credential,
Turnstile secret, or decrypted YAML in this runbook or in command output. The
existing [Cloudflare DDNS README](../manifests/cloudflare-ddns/README.md)
documents the token file mount and scope.

## 7. MetalLB install and upgrade

MetalLB is Layer 2 only, chart `0.16.1`, with one `autoAssign: false` `/32`
pool at the LAN-verified candidate `10.0.0.254`, selected only by the Cozy
Friends gameplay Service. Read [`manifests/metallb/README.md`](../manifests/metallb/README.md)
before changing it. The chart, production pool, and VIP allocation are
already installed and ready; do not list the pool as a missing launch input.
Future changes still require the router and remaining launch gates below.

Install the namespace and Helm release manually:

```bash
kubectl apply -f manifests/metallb/namespace.yaml
helm repo add metallb https://metallb.github.io/metallb
helm repo update
helm upgrade --install metallb metallb/metallb \
  --version 0.16.1 \
  --namespace metallb-system \
  --values manifests/metallb/values.yaml \
  --wait \
  --timeout 10m
kubectl -n metallb-system rollout status deployment/metallb-controller --timeout=5m
kubectl -n metallb-system rollout status daemonset/metallb-speaker --timeout=5m
```

Only after the address is router-verified and the chart is ready, sync `metallb-config`; do not point Argo at the whole `manifests/metallb/` directory. Validate the one-address pool with the temporary labeled Service in the MetalLB README, test from a LAN client, and delete that temporary Pod and Service immediately afterward. A LAN result is not public Internet proof.

Keep upgrades pinned and review the chart release notes and CRD compatibility:

```bash
helm history metallb -n metallb-system
helm upgrade metallb metallb/metallb \
  --version 0.16.1 \
  --namespace metallb-system \
  --values manifests/metallb/values.yaml \
  --wait \
  --timeout 10m
kubectl -n metallb-system rollout status deployment/metallb-controller --timeout=5m
kubectl -n metallb-system rollout status daemonset/metallb-speaker --timeout=5m
```

For a failed release, use an operator-supplied known-good Helm revision; do not guess a revision or change the VIP as part of an unrelated upgrade:

```bash
helm rollback metallb <known-good-revision> \
  --namespace metallb-system \
  --wait \
  --timeout 10m
```

## 8. Router and Cloudflare settings

### Cloudflare

1. In the authenticated Cloudflare dashboard, confirm the existing public wildcard `*.popinvites.com` routes through the existing Tunnel to `ingress-nginx`, preserves the Host header, and has no Access policy on the friend guide.
2. Create or verify the explicit `mc.popinvites.com` `A` record for the current WAN IPv4, TTL Auto, **DNS only**. Do not change the wildcard or create a second Tunnel.
3. Apply the scoped DDNS Secret locally and sync `cloudflare-ddns`. The updater uses `IP4_DOMAINS=mc.popinvites.com`, `IP6_PROVIDER=none`, `PROXIED=false`, `UPDATE_CRON=*/5 * * * *`, and `UPDATE_ON_START=true`.
4. From a signed-out browser, verify `cozy.popinvites.com` stays on Cloudflare addresses while `mc.popinvites.com` resolves directly to the WAN IPv4. DNS answers alone do not prove TCP reachability.

Cloudflare login, MFA, token creation, and copying the one-time token directly into the local SOPS editor remain user credential boundaries. The agent must not enter, read, or log those values.

### Router

Only after the gameplay Service has the verified MetalLB VIP and works from the
LAN, the owner may add the pending initial rule in the Rogers Xfinity app:

```text
WAN TCP 25565 -> talos-ssy-pdo (10.0.0.105) TCP 25565
```

Keep UPnP disabled. Optional voice chat is not required for ordinary gameplay;
it needs a separate approved rule:

```text
WAN UDP 24454 -> talos-ssy-pdo (10.0.0.105) UDP 24454
```

Do not forward RCON `25575`, NodePorts, node SSH/Talos/Kubernetes ports, the
API server, or any other administrative endpoint. No extra proxy or NodePort
is part of this direct-node path.

## 9. Backups and restore

The Minecraft StatefulSet has one replica and a 100 GiB Longhorn RWO world volume (`data-homestead-0`). A single replica is deliberate: never scale the same world horizontally. Longhorn replica count 1 is persistent storage, not high availability; application-aware Restic backups are the primary recovery artifact and Longhorn snapshots/external backups are secondary crash-consistent protection.

The `itzg/mc-backup:2026.8.0` sidecar runs Restic at `0 3 * * *`, reaches RCON only at `127.0.0.1:25575`, and must issue `save-off`, `save-all`, backup, then `save-on`, including `save-on` after a failed backup. Retention is seven daily, four weekly, and three monthly snapshots. Restic and S3-compatible R2 values come only from the encrypted Secret.

The backup and node-exporter textfile sidecars share an `emptyDir` mounted at `/metrics`. The hook writes:

```text
minecraft_backup_last_success_timestamp_seconds <unix-seconds>
minecraft_backup_last_exit_code <exit-code>
```

A restart clears this `emptyDir` by design; the success metric must be absent until a backup is proven. Do not treat logs alone as backup-freshness proof.

Verified recovery test at the current checkpoint:

1. Created scoreboard marker `restore_test=20260810` in the running world.
2. Ran `/usr/bin/backup now`; the application-aware `save-off`,
   `save-all`, Restic backup, and `save-on` sequence completed successfully.
   Restic snapshot `8f2c792a` was recorded, the exit metric is `0`, and the
   success timestamp metric is present.
3. Restored that snapshot into a throwaway 100-GiB PVC.
4. Staged the verified official pack in an isolated pack PVC and started a
   disconnected throwaway Homestead pod from the restored data.
5. Confirmed the server reached its `Done` signal and returned
   `restore_test=20260810` through localhost-only RCON.
6. Removed the disposable restore pod, Job, PVCs, and isolated pack PVC.

The pre-launch backup must remain until the first real play session; perform
another restore check afterward. The production Longhorn daily snapshot and
weekly external-backup jobs are attached to the world PVC's `default` group.
A restart clears the metrics `emptyDir`, so a success timestamp must be
proven again before treating backup freshness as current.

If the primary backup alert fires, stop destructive maintenance, inspect the
backup sidecar and RCON/save sequence, verify Restic repository reachability
and S3-compatible authorization without printing credentials, and do not claim
a recoverable backup until a restore succeeds.

## 10. Monitoring and logs

Custom rules live in [`manifests/monitoring/rules/homelab-alerts.yaml`](../manifests/monitoring/rules/homelab-alerts.yaml) and retain the existing Prometheus Operator label `release: kube-prometheus-stack`. Each rule uses the existing `severity` label (`warning` or `critical`) so the current Alertmanager path continues to route notifications.

The planned rules are:

| Alert | Signal | Hold time | Severity |
| --- | --- | --- | --- |
| `MinecraftStatefulSetUnavailable` | `kube_statefulset_status_replicas_ready{namespace="cozy-friends",statefulset="homestead"} < 1` | 5m | critical |
| `CozyFriendsSiteUnavailable` | `kube_deployment_status_replicas_available{namespace="cozy-friends-site",deployment="cozy-friends-site"} < 1` | 2m | critical |
| `CloudflareDdnsUnavailable` | `kube_deployment_status_replicas_available{namespace="cloudflare-ddns",deployment="cloudflare-ddns"} < 1` | 10m | warning |
| `MinecraftWorldPVCLowFreeSpace` | Available/capacity bytes for `cozy-friends/data-homestead-0` below `0.15` | 15m | warning |
| `MinecraftBackupFailed` | `minecraft_backup_last_exit_code{namespace="cozy-friends"} != 0` | 5m | warning |
| `MinecraftBackupSuccessMetricAbsent` | `absent_over_time(minecraft_backup_last_success_timestamp_seconds{namespace="cozy-friends"}[30h])` | 10m | critical |
| `MinecraftBackupStale` | `time() - minecraft_backup_last_success_timestamp_seconds{namespace="cozy-friends"} > 108000` | 10m | critical |

The only metric change in this assignment is these planned Prometheus alerts. No gameplay exporter, plugin, dashboard, scrape target, or Alertmanager receiver is added here. Use the existing kube-state-metrics, kubelet PVC metrics, and backup textfile ServiceMonitor when those workloads are deployed.

Loki remains useful for diagnosis, not proof of backup freshness. Review logs in these namespaces with the existing Alloy/Loki path:

```logql
{namespace="cozy-friends"}
{namespace="cozy-friends-site"}
{namespace="cloudflare-ddns"}
{namespace="metallb-system"}
```

Use the existing [observability commands](11-observability-stack.md), and inspect targets/rules from the monitoring namespace after sync:

```bash
kubectl -n monitoring get prometheus,prometheusrule,servicemonitor
kubectl -n monitoring get prometheusrule homelab-alerts
```

The planned external monitors are intentionally outside the home network: a
five-minute custom TCP check of `mc.popinvites.com:25565` and a five-minute
HTTPS check of `https://cozy.popinvites.com` expecting HTTP 200. They cover
DNS, WAN, router, the node-bound `.105` path, and public website failures that
in-cluster Prometheus cannot see; the checks remain a launch gate.

## 11. Failure modes and first response

| Symptom | First response |
| --- | --- |
| Kubernetes API unreachable | Stop all mutation. Restore workstation/API routing and repeat read-only preflight. |
| VIP allocation or ARP fails | Remove the temporary validation resources, check DHCP/ARP/subnet/interface and kube-proxy mode, and do not open WAN forwarding. |
| Stable node `talos-ssy-pdo` / `10.0.0.105` unavailable | WAN gameplay and optional voice chat fail even if MetalLB moves `10.0.0.254`; LAN clients can still use the MetalLB VIP. Restore the node-bound path before public access. |
| WAN is private/CGNAT or inbound TCP is blocked | Stop the direct-hosting path. MetalLB cannot solve CGNAT; use a separately approved relay/Spectrum design instead. |
| `mc` resolves to Cloudflare addresses | The explicit DNS-only record is missing or proxied. Correct Cloudflare/DDNS state before opening the router. |
| `cozy` returns 404/502 | Check wildcard Tunnel, Host preservation, ingress-nginx, Ingress, Service, and generated ConfigMap; do not create a second Tunnel. |
| Minecraft StatefulSet is unavailable | Inspect startup logs, PVC binding, node affinity/capacity, and the ten-minute cold-start probe. Do not scale the world horizontally. |
| Incompatible client or Java crash | Confirm Homestead `1.3.7`, Minecraft `1.20.1`, Fabric, Java `17`, and the official FTB additions; allocate 8 GiB client RAM. |
| Not whitelisted | Request the exact case-sensitive Java username and add it through localhost-only RCON. |
| Backup failure or stale metric | Preserve the world, inspect RCON/save and Restic/S3 paths, and complete a restore before considering the backup healthy. |
| World PVC below 15% free | Confirm a recent restore-tested backup, stop growth safely, and expand or archive through a planned maintenance change; do not delete world data casually. |
| DDNS unavailable | Confirm the explicit record remains DNS-only and check the DDNS logs/token scope. A stale record may still point to an old WAN address. |

## 12. Rollback and withdrawal

Withdraw public reachability before removing platform resources:

1. Disable/remove the router WAN TCP `25565` rule and any separately approved
   WAN UDP `24454` voice-chat rule.
2. Delete the explicit `mc.popinvites.com` record or stop the DDNS workload if direct access must be withdrawn; do not alter the proxied wildcard needed by `cozy`.
3. Complete a successful application-aware backup, then scale the single StatefulSet to zero if the service must stop:

   ```bash
   kubectl -n cozy-friends scale statefulset homestead --replicas=0
   ```

4. Keep the world and pack PVCs, encrypted Secret files, and the last proven Restic/Longhorn backups. Do not delete PVCs as part of routine rollback.
5. Remove the Cozy Friends Ingress/Application if the guide must be withdrawn.
6. Remove the MetalLB pool and advertisement only after every dependent `LoadBalancer` Service and temporary validation resource is gone; uninstall the Helm release last. Never uninstall MetalLB while a router rule still targets its VIP.

For a bad MetalLB chart upgrade, prefer `helm rollback metallb <known-good-revision>` after disabling public traffic as needed. For a bad workload change, revert the Git manifest and let the existing Argo Application reconcile; preserve storage and backups while diagnosing.

## 13. Read-only preflight reference

Run the existing platform checks before any install or edge mutation:

```bash
kubectl config current-context
kubectl get nodes -o wide
kubectl get storageclass
kubectl -n longhorn-system get pods
kubectl -n longhorn-system get backuptarget.longhorn.io default -o yaml
kubectl -n longhorn-system get recurringjobs.longhorn.io
kubectl -n ingress-nginx get svc,pods
kubectl -n cloudflare get deploy,pods
kubectl -n monitoring get prometheus,prometheusrules,servicemonitors
kubectl -n kube-system get configmap kube-proxy -o yaml
kubectl get ns metallb-system
helm list -A
```

Record the DHCP pool and candidate-VIP evidence, verified WAN IPv4, CNI/kube-proxy findings, Prometheus selector/service-account findings, artifact byte count/digest, Argo/site status, restore evidence, external monitor state, and router/DNS changes in the operator's change record. This revision records the installed MetalLB chart and live companion guide; it does not claim that Minecraft public launch is complete.
 
## 14. Username approval and whitelist operations

The public guide and the Minecraft allowlist are connected by a separate,
Turnstile-protected, token-authenticated approval API. This workflow is
intentionally additive to the existing server controls: `ONLINE_MODE=TRUE`,
`ENABLE_WHITELIST=TRUE`, and `ENFORCE_WHITELIST=TRUE` remain required, and an
approved submission is not a substitute for an exact Java username or for the
launch gates above.

### Public request and private decision flow

The browser uses same-origin API paths on `https://cozy.popinvites.com`:

| Operation | Request | Authentication | Meaning |
| --- | --- | --- | --- |
| Submit a request | `POST /api/usernames` with `{"name":"...","username":"...","turnstileToken":"..."}` | Cloudflare Turnstile token, verified server-side | Public form creates or reopens a request. |
| List requests | `GET /api/admin/submissions` | `Authorization: Bearer <admin-token>` | Admin dashboard reads requester names, exact usernames, statuses, and timestamps. |
| Approve | `POST /api/admin/submissions/{id}/approve` | Admin bearer token | Changes one pending row to `approved`. |
| Reject | `POST /api/admin/submissions/{id}/reject` | Admin bearer token | Changes one pending row to `rejected`. |
| Produce the allowlist feed | `GET /api/whitelist/approved.txt` | `Authorization: Bearer <sync-token>` | Returns approved usernames, one per line, for the in-cluster sync sidecar. |

The public form is on the main page at `cozy.popinvites.com` and renders
Turnstile with the public `VITE_TURNSTILE_SITE_KEY`. The API receives the
private `TURNSTILE_SECRET_KEY` from the encrypted approval Secret, sends each
token to Cloudflare Siteverify, and accepts only a successful result whose
expected hostname is `cozy.popinvites.com`. A missing token is a client error;
a failed verification or hostname mismatch is forbidden. The token-gated
operator page is `https://cozy.popinvites.com/#admin`; the `#admin` fragment
selects the dashboard, while the admin token is entered into its password
field and is not part of the URL. The API routes are sent through the
same-host `/api` Ingress path to the internal
`Service/cozy-friends-approval-api` on port `8080`. The API Service is
ClusterIP-only: it is not a public or router-facing port. There is no RCON
Service and no router rule for either RCON or the API.

Use the dashboard to load requests, inspect the person's name and exact
case-sensitive Java username, and act only on rows marked `pending`. A
successful decision returns the updated row with its `decidedAt` timestamp. Do
not copy the admin token into a URL, a shell command, a Git file, a ConfigMap,
a browser bookmark, or chat. Do not use the admin token for the whitelist
feed; the two bearer boundaries are intentionally separate.

### Postgres state and duplicate behavior

`Cluster/cozy-friends-approval-db` is a CloudNativePG-backed Postgres cluster
in namespace `cozy-friends-site`, with the database and owner
`cozy_friends_approval`. The API initializes the `username_submissions` table
and its status index on startup. Its idempotent migration adds the
`requester_name` column and backfills legacy rows with `Legacy requester`
before new requests are persisted. The generated application Secret is
`cozy-friends-approval-db-app`; its `uri` key supplies the API
`DATABASE_URL`. This database is the source of truth; the static site
ConfigMap does not contain requests or approvals. It is a single CNPG
instance on Longhorn, so persistence is not high availability; establish and
preserve a tested database backup/restore path before production.

Each row has an ID, `requester_name`, the submitted `username` spelling, a
case-folded (case-insensitive) unique `username_key`, a status (`pending`,
`approved`, or `rejected`), and submission/decision timestamps. The API trims
the name and username, accepts names only from 1–80 characters, and accepts
usernames only when they match `^[A-Za-z0-9_]{3,16}$`. Turnstile Siteverify
must succeed for `cozy.popinvites.com` before a row is inserted or reopened.
Because uniqueness is on `username_key`, `DanBuilder`, `danbuilder`, and
`DANBUILDER` refer to one submission rather than three accounts:

1. A new valid name/username pair creates one `pending` row and returns `201`.
2. Repeating a username with different casing returns the existing ID and
   current status (`pending` or `approved`) with `200`; it does not create a
   duplicate or reset an approval.
3. Re-submitting a `rejected` username reuses that row, stores the newly
   supplied requester name and spelling/timestamp, clears `decidedAt`, and
   returns it to `pending`.
4. Approve/reject is allowed only while the row is `pending`. A missing ID is
   `404`; trying to decide an already decided row is `409`.
5. Only `approved` rows are emitted in `approved.txt`, ordered by the
   case-folded key. Pending and rejected rows are never emitted.

Rejecting a request therefore prevents future feed output, but the sync
sidecar is deliberately additive and does not remove an already present
Minecraft allowlist entry. If an already-approved player must lose access,
reject the row and then remove the exact Java username through localhost-only
RCON, followed by `whitelist list` verification:

```bash
kubectl -n cozy-friends exec homestead-0 -c minecraft -- \
  rcon-cli whitelist remove '<exact-case-sensitive-java-username>'
kubectl -n cozy-friends exec homestead-0 -c minecraft -- \
  rcon-cli whitelist list
```

### Approved-feed and localhost-RCON reconciliation

The non-root `whitelist-sync` sidecar in `homestead` polls
`http://cozy-friends-approval-api.cozy-friends-site.svc.cluster.local:8080/api/whitelist/approved.txt`
every 60 seconds. It sends the sync bearer token from the
`whitelist-sync-token` Secret key, writes the response only to temporary
storage, validates every line against `[A-Za-z0-9_]{3,16}`, and issues
idempotent `rcon-cli whitelist add` commands to `127.0.0.1` only. It does not
call the Kubernetes API and cannot reach a remote RCON endpoint.

The feed is an authorization boundary, not a public download: a request
without `Authorization: Bearer <sync-token>` receives `401`, and the token
must not be placed in the URL. A successful fetch adds approved names; it
does not replace the existing whitelist and never performs removals. Invalid
lines are skipped while valid lines continue through the allow operation. A
network error or non-success HTTP response makes no whitelist changes; an
individual RCON add failure leaves that name unchanged. All such failures are
retried on the next 60-second cycle, and an unavailable API or database never
causes existing allowlist entries to be discarded.

Check this path without printing credentials:

```bash
kubectl -n cozy-friends-site get deploy,pods,svc,endpointslice
kubectl -n cozy-friends-site rollout status deployment/cozy-friends-approval-api --timeout=5m
kubectl -n cozy-friends-site logs deployment/cozy-friends-approval-api --since=10m
kubectl -n cozy-friends logs statefulset/homestead -c whitelist-sync --since=10m
kubectl -n cozy-friends exec homestead-0 -c minecraft -- \
  rcon-cli whitelist list
```

The API request logger intentionally omits authorization headers and request
bodies. Treat all workload logs as sensitive operational output anyway: never
add a token to a debug message or paste logs containing secret material into an
issue or chat. Ingress-nginx logs can confirm the public `/api` route and
status code; CNPG operator/database logs can distinguish database readiness
from API readiness.

### Encrypted Secret inventory and safe token handling

These values are required, but must never be committed, logged, or copied into
documentation. Handle them only in the trusted SOPS editor, Kubernetes Secret
data, the API/sidecar process environment populated from those Secrets, or
the dashboard's password field:

| Secret object | Required key | Consumer |
| --- | --- | --- |
| `Secret/cozy-friends-approval-secrets` in `cozy-friends-site` | `admin-token` | API `APPROVAL_ADMIN_TOKEN` and the private dashboard operator |
| `Secret/cozy-friends-approval-secrets` in `cozy-friends-site` | `sync-token` | API `APPROVAL_SYNC_TOKEN` |
| `Secret/cozy-friends-secrets` in `cozy-friends` | `whitelist-sync-token` | The 60-second whitelist sidecar |
| `Secret/cozy-friends-approval-db-app` in `cozy-friends-site` | CNPG-generated `uri` | API `DATABASE_URL` |
| `Secret/cozy-friends-approval-secrets` in `cozy-friends-site` | `turnstile-secret-key` | API `TURNSTILE_SECRET_KEY` for Cloudflare Siteverify |

`sync-token` and `whitelist-sync-token` MUST contain the same generated
bearer value. Keep the existing RCON, Restic, repository, and S3 keys in
`cozy-friends-secrets`; adding the sync key does not weaken those boundaries.
The encrypted approval Secret is not a Kustomize plaintext resource and must
not be replaced with an example value.
Create or edit the encrypted approval and Minecraft Secret files in the
trusted workstation's SOPS editor. Paste the admin token, one shared sync
token, and the Turnstile server secret directly into the corresponding
encrypted fields; never display them with `sops --decrypt`, shell tracing,
`kubectl get -o yaml`, JSONPath, `base64 -d`, `env`, or process listings. Apply
only through a pipe, whose output should contain Kubernetes object metadata
rather than values:

```bash
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
sops --decrypt manifests/cozy-friends-site/cozy-friends-approval.secret.yaml | \
  kubectl apply -f -
sops --decrypt manifests/cozy-friends/cozy-friends.secret.yaml | \
  kubectl apply -f -

kubectl -n cozy-friends-site get secret cozy-friends-approval-secrets -o name
kubectl -n cozy-friends get secret cozy-friends-secrets -o name
```

The operator may enter the admin token directly into the password field at
`cozy.popinvites.com/#admin`; do not save it in browser autofill, screenshots,
URL fragments, or clipboard history. For a Turnstile-secret rotation, prepare
the replacement out of band, open the encrypted approval Secret in SOPS,
replace only `turnstile-secret-key`, save it encrypted, and apply it through
the pipe above. Restart the API Deployment so it reads the new
`TURNSTILE_SECRET_KEY`; then verify only Secret metadata, API readiness, and
the signed-out widget/API failure cases in Section 6. Never paste the secret
into a terminal, browser, issue, chat, or generated site bundle.

For admin/sync rotation, prepare a new admin token and one new shared sync
token out of band, update both encrypted Secret keys, apply both SOPS files
without printing them, then restart the API Deployment and the `homestead` pod
so both consumers receive the same value. A brief retry window is safer than
weakening authorization; verify API readiness and one successful sync cycle
after rotation. Never rotate only one of the two sync-token copies.

### First rollout and immutable hook ordering

The first approval rollout is intentionally ordered so the API cannot start
without its database or image and the Minecraft pod cannot mount an old hook:

1. Apply the encrypted approval Secret and the updated encrypted
   `cozy-friends-secrets` through the SOPS pipes above. Do not sync a
   plaintext Secret through Argo.
2. Create or update `Cluster/cozy-friends-approval-db` and wait for
   `cozy-friends-approval-db-app` to be generated with its `uri` key and for
   the CNPG readiness condition to be healthy. The metadata-only checks are:

   ```bash
   kubectl apply -f manifests/cozy-friends-site/approval-db.yaml
   kubectl -n cozy-friends-site get cluster cozy-friends-approval-db -o name
   kubectl -n cozy-friends-site get secret cozy-friends-approval-db-app -o name
   ```

3. Build and push the API image, then record its immutable digest before
   updating `approval-api-deployment.yaml`:

   ```bash
   docker build -f cozy-approval-api/Dockerfile \
     -t ghcr.io/danieljcheung/cozy-friends-approval-api:2026-08-10 .
   docker push ghcr.io/danieljcheung/cozy-friends-approval-api:2026-08-10
   ```

   The committed Deployment currently uses
   `ghcr.io/danieljcheung/cozy-friends-approval-api@sha256:0634a0c60a44a1e9bf48db0be1d6b226002efe3dbcd975b5e4b446a177930816`.
   Never deploy a mutable tag or `latest`.
4. Build/sync the generated Cozy site and sync
   `cozy-friends-site` only after the image is available:

   ```bash
   make build-cozy
   make sync-cozy
   argocd app sync cozy-friends-site
   argocd app wait cozy-friends-site --health --sync
   ```

   Confirm the API Deployment, API ClusterIP Service, Ingress route, CNPG
   Cluster, and static site are all healthy before touching `homestead`.
5. Recreate the immutable `homestead-backup-hooks` ConfigMap so the new
   `whitelist-sync.sh` hook is mounted. An immutable ConfigMap cannot be
   updated in place; use the committed manifest and verify the replacement
   before restarting the server:

   ```bash
   kubectl -n cozy-friends delete configmap homestead-backup-hooks
   kubectl apply -f manifests/cozy-friends/backup-hooks-configmap.yaml
   kubectl -n cozy-friends get configmap homestead-backup-hooks -o name
   ```

6. Restart `homestead` only after the hook and both Secret consumers exist.
   Because the StatefulSet uses `OnDelete`, perform a graceful, operator-
   approved pod restart after a successful backup rather than assuming a
   template change recreated it:

   ```bash
   kubectl -n cozy-friends delete pod homestead-0 --wait=true
   kubectl -n cozy-friends wait --for=condition=ready pod/homestead-0 --timeout=15m
   ```

   Confirm the 240-second termination grace period, Minecraft readiness,
   `whitelist-sync` startup, and the first successful 60-second reconciliation
   before opening or retaining any WAN rule.

Do not publish or push the official Homestead ZIP into the API image. The
official pack remains private, outside Git and OCI registries, and is staged
only through the verified pack workflow in Section 3. The API image must not
contain usernames, tokens, RCON passwords, database credentials, or generated
allowlist data.

### Operational checks, monitoring, and security limits

For a complete smoke check, submit one real exact Java username through the
public form, load the dashboard with the SOPS-held admin token, approve it,
wait for one 60-second cycle, and verify the username with localhost RCON.
Verify a rejected request is absent from the next `approved.txt` response and
remove any previously allowlisted rejected name manually as described above.
Check status and readiness without secret output:

```bash
kubectl -n cozy-friends-site get cluster,pods,deploy,svc,networkpolicy
kubectl -n cozy-friends get pods,networkpolicy
kubectl -n cozy-friends logs homestead-0 -c whitelist-sync --since=15m
kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --since=15m
```

This approval feature adds no approval-specific `/metrics` endpoint,
ServiceMonitor, or PrometheusRule. Existing Kubernetes workload/readiness
and kube-state metrics remain the health signal for the site/API workloads,
and existing CNPG operator metrics/alerts (where enabled) remain the database
signal. The Minecraft backup textfile metrics and existing StatefulSet, PVC,
site, DDNS, and external TCP/HTTPS monitor coverage are unchanged. Do not
interpret the absence of a submission metric as proof that approvals or
allowlist reconciliation are fresh; use API, CNPG, Ingress, and sidecar logs
plus the RCON check above.

The default-deny policies remain mandatory. The API may be reached only
through the existing same-host Ingress path and its internal ClusterIP
Service; it has no WAN listener or router forwarding. The Minecraft sidecar
may call the API Service and `127.0.0.1:25575` only. Never create an RCON
Service, expose `25575`, expose an API NodePort/LoadBalancer, or add a router
rule for either service. Preserve the existing no-Kubernetes-API-access
posture, non-root/RuntimeDefault settings, and dropped capabilities.
