# Cozy Friends Server

This directory deploys one **Homestead 1.3.7** Minecraft Java server in the
`cozy-friends` namespace. It is intentionally gated: these manifests describe
the desired workload, but they do not prove that the LAN VIP, router, WAN, pack,
credentials, or client are ready.

## Workload layout

- `homestead` is a single-replica StatefulSet with `OnDelete` updates and a
  240-second termination grace period. Never scale this world horizontally.
- The pod is schedulable only on a node labeled
  `workload.minecraft=true`. Label the verified 32-GiB node after checking
  allocatable capacity; do not replace this with a hostname selector.
- `data-homestead-0` is a 100-GiB Longhorn RWO world volume. Its recurring-job
  labels attach the existing Longhorn daily snapshot/weekly backup group. The
  volume has one Longhorn replica in this cluster, so this is not Minecraft HA.
- `homestead-pack` is a private 2-GiB Longhorn RWO PVC. The server mounts it at
  `/pack` read-only; the ZIP is not in Git, an image, or an OCI registry.
- The gameplay Service is the only `LoadBalancer`. The headless and backup
  metrics Services are internal. There is deliberately no RCON Service and no
  UDP Service.

All containers use pinned image digests, run as non-root with RuntimeDefault
seccomp, drop all capabilities, disallow privilege escalation, and do not
receive a service-account token. Only `/data` and declared `emptyDir` mounts are
writable.

## Pack staging and checksum

Download **Homestead Server Pack 1.3.7** only from the official server-pack page:
<https://cozystudios.org/homestead/server-pack/>. Keep the ZIP on a trusted,
private workstation until the pack PVC is ready. Inspect `HOW-TO-RUN.md`,
`variables.txt`, `server.properties`, `mods/`, and `config/` before staging it.
Confirm the pack is Minecraft 1.20.1, Fabric, Java 17, and does not require an
additional public port.

The expected SHA-256 for the approved ZIP is:

```text
38e90816b5eb6bd5a3b66096ad60d08bd9c8d69c00b4d27c6bc38f4233fd9e81
```

Record the downloaded filename, byte size, source URL, and download date in the
operator's private change record. A restricted, temporary helper pod may mount
`homestead-pack` at `/pack`, copy the ZIP to
`/pack/Homestead-1.3.7-server-pack.zip`, and calculate the same SHA-256 inside
the cluster. Delete that helper after the checksum matches. Do not paste the
ZIP, its contents, or credentials into Git, chat, or logs.

The StatefulSet's non-root `stage-homestead-pack` init container verifies this
digest, streams the archive with BusyBox, normalizes the archive's read-only
directory modes, and copies the wrapper directory contents into `/data`. The
main image starts from that verified data and keeps
`SKIP_GENERIC_PACK_UPDATE_CHECK=true`; this avoids the image's root-only
generic-pack reapply path while preserving the official ZIP as the private
source of truth. Do not remove the init container or re-enable generic-pack
reapplication without repeating the non-root startup proof.

## EULA and allowlist gate

The owner accepted the Minecraft EULA; `configmap.yaml` therefore sets
`EULA=TRUE`. Keep that setting tied to the owner's acceptance and restart the
single-replica StatefulSet only through the normal `OnDelete` procedure.

Whitelist protection is enabled with both `ENABLE_WHITELIST=TRUE` and
`ENFORCE_WHITELIST=TRUE`. The non-root `whitelist-sync` sidecar polls the
internal approval API every 60 seconds with the SOPS-provided
`whitelist-sync-token` and adds each approved, validated Java username through
localhost RCON. It only adds usernames; it never removes an entry, writes a
Secret, or exposes RCON.
Manual administration remains in-pod only (for example,
`rcon-cli whitelist add <username>` from the Minecraft container). The RCON
password is supplied only from the SOPS Secret; never put it in a manifest,
command history, or a Service. Keep the router closed until at least the owner
is allowlisted and has joined from the LAN with the exact 1.3.7 client.

## Secret boundary

`cozy-friends.secret.example.yaml` is a value-free boundary describing the
required keys. Create a local `cozy-friends.secret.yaml`, populate these keys
inside the existing SOPS/age workflow, and apply the decrypted Secret locally
before Argo synchronization:

- `rcon-password`
- `whitelist-sync-token`
- `restic-password`
- `restic-repository`
- `s3-access-key-id`
- `s3-secret-access-key`
- `s3-region`

The populated Secret must remain SOPS-encrypted and is intentionally excluded
from `kustomization.yaml`. Use a least-privilege S3 identity limited to the
Restic repository. Never print, read back, commit, or send plaintext secret
values through this repository workflow.

## Verified VIP and public edge gate

`service-gameplay.yaml` selects the LAN-validated MetalLB VIP
`10.0.0.254/32`. The Service has a ready local endpoint, but the router WAN
rule remains a separate launch gate. Before opening it, confirm the router
reservation and the outside-network path.

The only intended router rule is:

```text
WAN TCP 25565 -> verified MetalLB VIP TCP 25565
```

Do not forward UDP, RCON 25575, NodePorts, SSH/Talos/Kubernetes ports, or the
API server. Keep UPnP disabled for this mapping. `mc.popinvites.com` must be an
explicit Cloudflare DNS-only A record pointing to the current home WAN IPv4;
the wildcard's proxied response is not sufficient for Minecraft TCP.

## Backup and restore

The `itzg/mc-backup` sidecar reaches RCON at `127.0.0.1:25575`, runs an
application-aware Restic backup at `03:00` UTC, and uses the configured
retention (`7` daily, `4` weekly, `3` monthly). Its read-only `/data` mount is
coordinated with `save-off`, `save-all`, the backup, and `save-on`; the sidecar
must restore `save-on` after a failed backup as well.
The pod remains non-root; its mounted scheduler invokes the image's one-shot
backup mode at 03:00 UTC because the image's built-in `crond` requires root.

The read-only hook ConfigMap writes two atomic node-exporter textfiles into the
shared `/metrics` `emptyDir`:

- `minecraft_backup_last_exit_code` after every attempt
- `minecraft_backup_last_success_timestamp_seconds` only after exit code `0`

A pod restart clears this `emptyDir`, so a success timestamp is intentionally
absent until a backup is proven again. Restic is the primary recovery artifact;
Longhorn snapshots/backups are a secondary crash-consistent disaster-recovery
layer, not an HA mechanism.

Before public launch:

1. Create a known marker in a running test world.
2. Observe a successful Restic snapshot and prune.
3. Restore the snapshot into a throwaway PVC.
4. Start a disconnected throwaway Homestead pod against the restored data.
5. Confirm the marker and world load, then remove the disposable resources.
6. Keep one pre-launch backup until the first real play session and another
   restore test are complete.

## Launch checklist

Do not announce or expose the server until all of the following are true:

- EULA acceptance, SOPS secret application, official pack checksum, Java 17,
  and a successful local server/client version match are recorded.
- The eligible node has `workload.minecraft=true`, the world and pack PVCs are
  bound, probes are ready, and backup metrics are being scraped.
- The verified VIP works from the LAN and the owner is allowlisted and can join.
- The router TCP rule is added only after the LAN test; an outside-network TCP
  check to `mc.popinvites.com:25565` succeeds. An on-LAN result alone can be
  hidden by NAT loopback.
- The public Cozy guide is reachable separately at `cozy.popinvites.com`; it
  does not expose private IPs, credentials, RCON, or router details.
- An external five-minute TCP monitor and HTTPS monitor are active before
  launch. Keep the router and DNS rule closed if any credential, client, WAN,
  VIP, or restore gate is incomplete.

To withdraw access, remove the router rule first, then remove or stop the
explicit Minecraft DNS/DDNS record, take an application-aware backup, and only
then scale or remove the workload. Retain both PVCs, encrypted secrets, and the
last proven Restic/Longhorn recovery artifacts.
