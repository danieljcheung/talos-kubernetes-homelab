# Cozy Friends Server — Homestead 1.3.7

This runbook is the operating record for the Cozy Friends Minecraft Java
server and its public companion guide. It describes the repository-local
implementation, verified live evidence, and remaining operator gates; it is
not a public-launch claim.

Current checkpoint: the MetalLB chart is installed, the separate Cozy guide
is Argo-synced and reachable at `https://cozy.popinvites.com`, and the
LAN-verified MetalLB candidate is `10.0.0.254/32`. The Minecraft workload,
DDNS updater, router TCP rule, backup credentials, client path, and external
monitor remain intentionally gated.

Primary source links:

- [Official Homestead server pack](https://cozystudios.org/homestead/server-pack/)
- [Homestead installation guide](https://cozystudios.org/client-guides/installing-homestead/)
- [FTB additions guide for Modrinth](https://cozystudios.org/client-guides/ftb-mods-modrinth/)
- [Homestead copyright license](https://cozystudios.org/homestead/copyright-license/)
- [Homestead Modrinth version `WMsE2fOj`](https://modrinth.com/modpack/homestead/version/WMsE2fOj)

## 1. Intended topology and exposure

The two public names intentionally use different paths:

```text
Minecraft Java client
  -> DNS-only mc.popinvites.com
  -> current home WAN IPv4
  -> router TCP 25565
  -> MetalLB VIP 10.0.0.254/32
  -> cozy-friends/homestead gameplay Service
  -> homestead-0 StatefulSet pod

Web browser
  -> proxied *.popinvites.com wildcard
  -> existing Cloudflare Tunnel
  -> ingress-nginx (Host: cozy.popinvites.com)
  -> cozy-friends-site Ingress and ClusterIP Service
  -> unprivileged nginx pod
```

`mc.popinvites.com` must be an explicit Cloudflare `A` record for the current home WAN IPv4 with **DNS only** (gray cloud). It overrides the proxied wildcard for that exact name. The `cloudflare-ddns` workload maintains this record every five minutes and has no Service. Do not expose the Kubernetes API, Talos, node SSH, NodePorts, RCON, or any UDP port.

`cozy.popinvites.com` remains covered by the existing proxied `*.popinvites.com` Tunnel route. Do not create a second tunnel, a separate `cozy` DNS record, or a Cloudflare Access policy for the public guide. The guide contains no private IPs or credentials.

MetalLB is only a LAN address-advertisement and Kubernetes failover mechanism. It is not a firewall, DDoS service, encryption boundary, or substitute for the router rule. `externalTrafficPolicy: Local` is required on the gameplay Service so logs can retain the real client source address.

## 2. Launch gates and current status

Verified at the current checkpoint:

1. Kubernetes context `admin@noderoy-1` is reachable; all three Talos
   nodes are `Ready`, Longhorn is provisioned, and the existing monitoring,
   ingress-nginx, kube-proxy, and Cloudflare Tunnel paths were inspected.
2. MetalLB chart `0.16.1` is installed; its controller and all three speakers
   are `Ready`. A temporary selector-matching `LoadBalancer` Service received
   `10.0.0.254`, and LAN TCP/HTTP probes succeeded; the temporary resources
   were deleted. The production pool and gameplay Service remain unsynced.
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

Remaining launch gates:

1. Add only WAN TCP `25565` -> `10.0.0.254:25565` through the Rogers Xfinity
   app. Do not forward UDP, RCON, NodePorts, or admin ports.
2. Enter the Cloudflare DNS API token, Minecraft RCON password, Restic
   password/repository, and least-privilege S3/R2 values through local SOPS.
3. Supply explicit EULA acceptance and exact case-sensitive Java usernames,
   then create the allowlist before exposing the WAN rule.
4. Stage the verified ZIP onto the private pack PVC, sync MetalLB and
   Minecraft only after the secret is applied, and wait for a ready endpoint.
5. Prove a known world marker through an application-aware backup, throwaway
   restore, and disconnected throwaway server start.
6. Verify a LAN client through `mc.popinvites.com`, then activate and test
   UptimeRobot TCP and HTTPS monitors from outside the home network.

The router's web UI delegates port-forward configuration to the Rogers Xfinity
app, so the edge rule is still intentionally absent. Do not infer Minecraft
readiness from the repository or the public guide alone.

## 3. Official artifact record

Download only from the official [server-pack page](https://cozystudios.org/homestead/server-pack/), which links the 1.3.7 Google Drive object. Do not reconstruct a server from the client `.mrpack`; CozyStudios publishes a separate official server pack.

| Field | Recorded value |
| --- | --- |
| Filename | `Homestead1.3.7_server_pack.zip` |
| Source | [CozyStudios Homestead Server Pack](https://cozystudios.org/homestead/server-pack/) → official 1.3.7 download |
| Source-advertised size | `512M` |
| Observed HTTP content length | `537016567` bytes (about `512.14 MiB`) |
| Expected SHA-256 | `38e90816b5eb6bd5a3b66096ad60d08bd9c8d69c00b4d27c6bc38f4233fd9e81` |
| Staging status | Must be downloaded and verified on the trusted workstation; no ZIP is committed here |

At staging time, verify both the byte count and digest before copying the ZIP to the private `homestead-pack` Longhorn PVC. For example:

```bash
wc -c Homestead1.3.7_server_pack.zip
shasum -a 256 Homestead1.3.7_server_pack.zip
```

Inspect `HOW-TO-RUN.md`, `variables.txt`, `server.properties`, `mods/`, and `config/`. Confirm Minecraft `1.20.1`, Fabric, Java `17`, and no additional public TCP or UDP port. The trusted-workstation smoke test may use `GENERIC_PACK` with `GENERIC_PACK_STRIP_DIRS=1` when the archive has one wrapper directory. The deployed restricted pod instead verifies and unpacks the ZIP with its non-root `stage-homestead-pack` init container, then skips the image's root-only generic-pack reapply path. Confirm a 1.3.7 client joins and the server stops cleanly before the helper pod copies the ZIP into `/pack` and is deleted.

The copyright terms permit private or public hosting, but do not permit republishing a derived server image or redistributing the pack. Keep the archive private.

## 4. EULA, allowlist, and administration

The intended initial server settings are:

```text
EULA=TRUE                         # only after explicit owner acceptance
TYPE=FABRIC
VERSION=1.20.1
SKIP_GENERIC_PACK_UPDATE_CHECK=true # pack-stager.sh owns verified ZIP staging
MEMORY=8G
ONLINE_MODE=TRUE
ENABLE_WHITELIST=TRUE
ENFORCE_WHITELIST=TRUE
ENABLE_RCON=TRUE
RCON_PORT=25575
MAX_PLAYERS=10
DIFFICULTY=normal
MODE=survival
VIEW_DISTANCE=8
SIMULATION_DISTANCE=6
MOTD=Cozy Friends Server | Homestead 1.3.7
```

Do not copy a username from a display name or launcher nickname. Add the exact Java username supplied by the owner through localhost-only RCON after the secret exists, and keep the router rule closed until the owner can join locally:

```bash
kubectl -n cozy-friends exec homestead-0 -c minecraft -- \
  rcon-cli whitelist add '<exact-case-sensitive-java-username>'
kubectl -n cozy-friends exec homestead-0 -c minecraft -- \
  rcon-cli whitelist list
```

Use the same command with `whitelist remove` when an allowlist entry must be withdrawn. Do not put a real username, RCON password, or secret output in this document. RCON has no Kubernetes Service and must not receive a router rule.

## 5. Build, ConfigMap sync, and GitOps delivery

The companion site is a separate Vite target under `site/cozy`; it does not alter portfolio routing or import portfolio-only rendering code. Build the generated ConfigMap before syncing the site Application:

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

The exact child Application manifests are under `manifests/argocd/apps/`. Argo manages the workload and MetalLB configuration resources; the MetalLB Helm release itself remains a deliberate manual platform install.

## 6. Secrets and SOPS boundary

The repository follows the existing [SOPS workflow](12-sops-secrets-workflow.md): encrypted `.secret.yaml` files are stored in Git, real values are decrypted only on the trusted admin workstation, and the resulting Secret is piped directly to Kubernetes. Argo does not receive plaintext values from Git.

The Cozy Friends Secret contains RCON, Restic, repository, and least-privilege S3 values. The Cloudflare DDNS Secret contains only the scoped Zone DNS Read/Edit token for `popinvites.com`. Keep both encrypted files excluded from their Kustomization resources. Apply them locally before syncing the corresponding Application, without printing or inspecting values:

```bash
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
sops --decrypt manifests/cozy-friends/cozy-friends.secret.yaml | kubectl apply -f -
sops --decrypt manifests/cloudflare-ddns/cloudflare-ddns.secret.yaml | kubectl apply -f -

kubectl -n cozy-friends get secret cozy-friends-secrets -o name
kubectl -n cloudflare-ddns get secret cloudflare-ddns-token -o name
```

The final two commands verify only Secret metadata. Never place a token, password, private key, S3 endpoint credential, or decrypted YAML in this runbook or in command output. The existing [Cloudflare DDNS README](../manifests/cloudflare-ddns/README.md) documents the token file mount and scope.

## 7. MetalLB install and upgrade

MetalLB is Layer 2 only, chart `0.16.1`, with one `autoAssign: false` `/32`
pool at the LAN-verified candidate `10.0.0.254`, selected only by the Cozy
Friends gameplay Service. Read [`manifests/metallb/README.md`](../manifests/metallb/README.md)
before changing it. The chart is installed and ready; sync the pool only
after the WAN rule and remaining launch gates are complete.

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

Only after the MetalLB gameplay Service has the verified VIP and works from the LAN, create this single rule:

```text
WAN TCP 25565 -> <verified-minecraft-vip> TCP 25565
```

Keep UPnP disabled for this mapping. Do not forward UDP, RCON `25575`, NodePorts, node SSH/Talos/Kubernetes ports, or the API server. If pack inspection identifies a voice-chat UDP requirement, stop and request a separate port/security decision; do not widen this rule.

## 9. Backups and restore

The Minecraft StatefulSet has one replica and a 100 GiB Longhorn RWO world volume (`data-homestead-0`). A single replica is deliberate: never scale the same world horizontally. Longhorn replica count 1 is persistent storage, not high availability; application-aware Restic backups are the primary recovery artifact and Longhorn snapshots/external backups are secondary crash-consistent protection.

The `itzg/mc-backup:2026.8.0` sidecar runs Restic at `0 3 * * *`, reaches RCON only at `127.0.0.1:25575`, and must issue `save-off`, `save-all`, backup, then `save-on`, including `save-on` after a failed backup. Retention is seven daily, four weekly, and three monthly snapshots. Restic and S3 values come only from the encrypted Secret.

The backup and node-exporter textfile sidecars share an `emptyDir` mounted at `/metrics`. The hook writes:

```text
minecraft_backup_last_success_timestamp_seconds <unix-seconds>
minecraft_backup_last_exit_code <exit-code>
```

A restart clears this `emptyDir` by design; the success metric must be absent until a backup is proven. Do not treat logs alone as backup-freshness proof.

Before public launch:

1. Create a unique marker in the running world.
2. Observe one successful Restic backup and prune operation.
3. Restore it into a throwaway PVC.
4. Start a disconnected throwaway Homestead pod against the restored data.
5. Confirm the marker and world load.
6. Remove disposable resources only after confirmation.
7. Keep the pre-launch backup through the first real play session and perform another restore check.
8. Confirm the Longhorn daily snapshot/weekly external-backup attachment separately.

If the primary backup alert fires, stop destructive maintenance, inspect the backup sidecar and RCON/save sequence, verify Restic repository reachability and S3 authorization without printing credentials, and do not claim a recoverable backup until a restore succeeds.

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

The planned external monitors are intentionally outside the home network: a five-minute custom TCP check of `mc.popinvites.com:25565` and a five-minute HTTPS check of `https://cozy.popinvites.com` expecting HTTP 200. They cover DNS, WAN, router, VIP, and public website failures that in-cluster Prometheus cannot see.

## 11. Failure modes and first response

| Symptom | First response |
| --- | --- |
| Kubernetes API unreachable | Stop all mutation. Restore workstation/API routing and repeat read-only preflight. |
| VIP allocation or ARP fails | Remove the temporary validation resources, check DHCP/ARP/subnet/interface and kube-proxy mode, and do not open WAN forwarding. |
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

1. Disable/remove the router WAN TCP `25565` rule.
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
