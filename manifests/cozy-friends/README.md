# Cozy Friends Server

This directory deploys one **Homestead 1.3.7** Minecraft Java server in the
`cozy-friends` namespace. It is intentionally gated: current evidence covers
the MetalLB VIP/pool, ready local endpoint, owner EULA acceptance, and
encrypted Secret contracts, but does not claim that a public Minecraft client,
WAN router rule, backup restore, or external monitor has been proven.

## Public guide and launch promise

The companion guide promises a shared Homestead world for **chilling,
building, and adventuring with friends** and shows a live countdown to
**Thursday, August 13, 2026 at 8:00 PM Eastern Daylight Time (EDT,
UTC−04:00)**. The public client path is **CurseForge only**: use the
[official Homestead 1.3.7 CurseForge file](https://www.curseforge.com/minecraft/modpacks/homestead-cozy/files/8110152),
install the CurseForge app, choose Homestead `1.3.7`, allocate `8 GiB`, and
launch. Do not advertise Prism Launcher, Modrinth App, or a reconstructed
server pack as alternate launcher paths.

The public request form collects a person's name, exact case-sensitive Java
username, and a Cloudflare Turnstile token before creating a request. It sends
`POST /api/usernames` JSON
`{"name":"...","username":"...","turnstileToken":"..."}`. The API validates
name length 1–80 and username `^[A-Za-z0-9_]{3,16}$`, verifies Siteverify for
hostname `cozy.popinvites.com`, and persists `requester_name` plus `username`
in the approval database. Approval is still required before the sidecar can
add a name through localhost-only RCON.

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
`ENFORCE_WHITELIST=TRUE`. The public form collects a person's name and exact,
case-sensitive Java username and requires Turnstile before it sends
`{"name":"...","username":"...","turnstileToken":"..."}` to
`POST /api/usernames`. The API validates names to 1–80 characters and
usernames to `^[A-Za-z0-9_]{3,16}$`, verifies the token for hostname
`cozy.popinvites.com`, and stores `requester_name` with the username.

The owner reviews pending requests at `https://cozy.popinvites.com/#admin` and
approves only exact Java usernames. The non-root `whitelist-sync` sidecar then
polls the internal approval API every 60 seconds with the SOPS-provided
`whitelist-sync-token` and adds each approved, validated username through
localhost RCON. It only adds usernames; it never removes an entry, writes a
Secret, or exposes RCON.

Manual administration remains in-pod only (for example,
`rcon-cli whitelist add <username>` from the Minecraft container). The RCON
password is supplied only from the SOPS Secret; never put it in a manifest,
command history, or a Service. Keep the router closed until at least the
owner is approved, allowlisted, and has joined from the LAN with the exact
CurseForge Homestead `1.3.7` client.

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

Turnstile values belong to the companion site, not this Minecraft Secret:
`VITE_TURNSTILE_SITE_KEY` is public build configuration, while the API's
`TURNSTILE_SECRET_KEY` is stored under `turnstile-secret-key` in the encrypted
site approval Secret. Rotate the server secret only through the trusted SOPS
editor and an apply pipe; never print it, put it in this workload, or expose it
to Minecraft/RCON.

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

The following infrastructure/configuration evidence is already recorded:

- The owner accepted the EULA; the encrypted SOPS Secret contracts, official
  pack checksum, Java 17 settings, and successful local server startup are
  documented.
- The eligible node has `workload.minecraft=true`, the world and pack PVCs are
  bound, and the Homestead probes are ready.
- The MetalLB chart, `minecraft-public` pool, `10.0.0.254/32` VIP, and local
  endpoint are verified; the public guide/API is separate and reachable at
  `cozy.popinvites.com`.

The following owner/operator gates remain to be evidenced before announcing or
exposing the server:

- A person submits a name and exact case-sensitive Java username through the
  Turnstile-protected form; the owner approves the owner request and verifies
  the allowlist entry.
- The operator proves the known-marker application-aware Restic backup and
  throwaway restore sequence above. Backup logs alone are not proof.
- The owner adds only WAN TCP `25565` -> the verified MetalLB VIP, after the
  LAN test. An outside-network TCP check to `mc.popinvites.com:25565` must
  succeed; an on-LAN result alone can be hidden by NAT loopback.
- The owner joins from outside the home network with the CurseForge
  Homestead `1.3.7` profile and activates five-minute TCP/HTTPS monitors.

Do not forward UDP, RCON, NodePorts, SSH/Talos/Kubernetes ports, or the API
server. Keep UPnP disabled. Keep the router rule closed if any owner input,
client, WAN, backup/restore, or external-monitor gate is incomplete.

To withdraw access, remove the router rule first, then remove or stop the
explicit Minecraft DNS/DDNS record, take an application-aware backup, and only
then scale or remove the workload. Retain both PVCs, encrypted secrets, and the
last proven Restic/Longhorn recovery artifacts.
