# Talos Kubernetes Homelab

This repository documents my bare-metal Kubernetes homelab built with **Talos Linux** on small form factor PCs.

The goal of this project is to learn Kubernetes and platform engineering by running a real cluster on real hardware, not just local containers or cloud tutorials. I chose Talos Linux because it is purpose-built for Kubernetes, immutable, API-managed, and closer to modern production infrastructure than a traditional Ubuntu server install.

## Current Status

✅ Hardware acquired  
✅ Talos Linux booted from USB  
✅ Talos installed to the internal SSD  
✅ Kubernetes cluster bootstrapped  
✅ Second Talos node added as a worker  
✅ First nginx workload deployed and exposed with NodePort  
✅ Public GitHub repository published  
✅ Argo CD installed inside the cluster  
✅ First GitOps app synced from GitHub  
✅ Private Argo CD access configured over Tailscale  
✅ Headlamp dashboard installed and exposed privately over Tailscale  
✅ Personal website deployed through GitOps-managed nginx  
✅ Cloudflare Tunnel serving `danieljcheung.com` and `www.danieljcheung.com` without router port forwarding
✅ First real Kubernetes incident documented with operations lessons
✅ Observability stack installed: Prometheus, Grafana, Alertmanager, Loki, and Alloy
✅ SOPS workflow added for encrypted Git-tracked secrets
✅ Longhorn installed for Kubernetes-native persistent storage
✅ Longhorn external backups configured to S3-compatible Cloudflare R2 and restore-tested
✅ CloudNativePG Postgres created for the Company Brain app
✅ PreviewApp operator GitOps setup configured
🔄 Third node / control-plane expansion in progress
⏭️ Next: finish converting the former worker into the third control-plane member

## Hardware

- **Control plane:** `desktop-j7rbie4`
  - Intel Core i5-8500T
  - 16GB RAM
  - 256GB SSD
  - Ethernet
- **Worker:** `desktop-bvomtdn`
  - Dell OptiPlex 3070-class small form factor node
  - Intel Core i5 9th gen
  - 16GB RAM
  - 256GB SSD
  - Ethernet
- **New node:** hostname pending
  - 32GB RAM
  - 1TB storage
  - Added as the most capable node for the move toward a three-node control-plane cluster

The intended end state is three Talos nodes, all acting as control-plane members and all schedulable for homelab workloads. This gives etcd a real three-member quorum while still using all available hardware for applications.

## Architecture

```mermaid
flowchart TB
  dan["Dan's Devices<br/>MacBook · PC · Phone"]
  github["GitHub<br/>GitOps Repository"]
  cloudflare["Cloudflare<br/>DNS + Tunnel"]
  tailscale["Tailscale<br/>Private Mesh"]
  telegram["Telegram<br/>Alert Delivery"]

  subgraph cluster["Talos Kubernetes Homelab"]
    direction TB
    argocd["Argo CD<br/>GitOps"]
    site["nginx Personal Site<br/>danieljcheung.com"]
    previews["Preview Environments<br/>*.popinvites.com"]
    tunnel["cloudflared<br/>Public tunnel connector"]
    dashboards["Private Dashboards<br/>Grafana · Headlamp · Longhorn"]
    monitoring["Observability<br/>Prometheus · Loki · Alloy · Alertmanager"]
    storage["Longhorn<br/>Persistent Volumes"]
    secrets["SOPS<br/>Encrypted secrets in Git"]

    argocd --> site
    argocd --> previews
    tunnel --> site
    tunnel --> previews
    monitoring --> dashboards
    storage --> site
  end

  dan -->|kubectl / talosctl| cluster
  github -->|desired state| argocd
  cloudflare -->|public HTTPS| tunnel
  tailscale -->|private HTTPS| dashboards
  monitoring -->|alerts| telegram
  secrets -. decrypt/apply .-> cluster

  classDef external fill:#eef2ff,stroke:#4f46e5,color:#111827
  classDef user fill:#ecfeff,stroke:#0891b2,color:#111827
  classDef platform fill:#f0fdf4,stroke:#16a34a,color:#111827
  classDef workload fill:#fff7ed,stroke:#ea580c,color:#111827
  classDef ops fill:#fdf2f8,stroke:#db2777,color:#111827
  classDef storageClass fill:#fefce8,stroke:#ca8a04,color:#111827

  class github,cloudflare,tailscale,telegram external
  class dan user
  class argocd,dashboards,secrets platform
  class site,tunnel,previews workload
  class monitoring ops
  class storage storageClass
```

See [Architecture](docs/14-architecture.md) for the larger system context and cluster container view.

## Cozy Friends routes (gated)

The companion guide and token-authenticated approval API are live behind the
existing Cloudflare Tunnel, but this is not a public Minecraft-launch claim.
The friend-facing promise is a shared Homestead world for **chilling, building,
and adventuring with friends**. The guide shows a live countdown to
**Thursday, August 13, 2026 at 8:00 PM Eastern Daylight Time (EDT,
UTC−04:00)**; August is EDT rather than UTC−05:00.

The guide recommends **only CurseForge** for clients. Use the official
[Homestead 1.3.7 CurseForge file](https://www.curseforge.com/minecraft/modpacks/homestead-cozy/files/8110152):
install the CurseForge app, search for Homestead, choose `1.3.7`, allocate
`8 GiB` client RAM, and launch. No Prism Launcher, Modrinth App, or
reconstructed-pack path is presented as an alternate launcher instruction.

```text
Minecraft Java -> DNS-only mc.popinvites.com -> home WAN IPv4
               -> router TCP 25565 -> MetalLB VIP -> Cozy Friends Service

Browser -> proxied *.popinvites.com -> existing Cloudflare Tunnel
        -> ingress-nginx -> cozy.popinvites.com Ingress -> Cozy guide Service
```

Infrastructure evidence currently recorded includes the Argo-synced guide/API
returning HTTP 200, the installed MetalLB chart and production
`minecraft-public` pool at the LAN-verified `10.0.0.254/32`, the ready
Homestead pod, the DNS-only `mc` record, the owner's accepted EULA, and a
successful application-aware Restic snapshot plus throwaway restore. The
restored Homestead server loaded the official pack and returned the known
world marker over localhost-only RCON. The VIP is outside the router DHCP
range (`.2`–`.253`) and has a ready local endpoint. These facts do not prove a
public Minecraft client, WAN forwarding, or outside-network monitor.

Remaining owner/operator launch gates are explicit:

1. The owner adds only WAN TCP `25565` -> `10.0.0.254:25565` in the Rogers
   Xfinity app; no UDP, RCON, NodePort, or admin forwarding.
   Optional voice chat uses UDP `24454` only after a separate explicit router
   decision and external test; it is not part of the initial TCP launch.
2. A person submits their name and exact, case-sensitive Java username through
   the Turnstile-protected form; the owner approves the owner row and confirms
   the local allowlist entry.
3. After the LAN test, the owner joins from outside the home network with the
   CurseForge profile and activates five-minute UptimeRobot TCP/HTTPS checks.

The form sends `POST /api/usernames` JSON
`{"name":"...","username":"...","turnstileToken":"..."}`. The API accepts
`name` only from 1–80 characters, `username` only when it matches
`^[A-Za-z0-9_]{3,16}$`, verifies Turnstile Siteverify for hostname
`cozy.popinvites.com`, and persists `requester_name` plus `username` in the
CloudNativePG-backed database. The owner reviews pending requests at
`cozy.popinvites.com/#admin`; approved names reach Minecraft through the
internal feed and localhost-only RCON. The API is ClusterIP-only: no public
API Service, RCON Service, or router exposure is allowed.

`VITE_TURNSTILE_SITE_KEY` is public browser build configuration.
`TURNSTILE_SECRET_KEY` is private SOPS-managed runtime data and must never be
printed, committed, or bundled. Longhorn's replica count 1 provides persistent
storage, not high availability; application-aware Restic backups are the
primary recovery path, with Longhorn snapshots/backups as secondary disaster
recovery.

See [Cozy Friends Server](docs/19-cozy-friends-server.md) for the gated
runbook, edge settings, secret rotation, approval migration, and rollback
order.

## Why Talos?

I originally considered Ubuntu Server with k3s, but decided to use Talos Linux because it gives the project a stronger infrastructure focus.

Talos is different from a normal Linux server:

- No SSH into the node
- No traditional package manager
- Minimal immutable operating system
- Managed through `talosctl`
- Designed specifically for Kubernetes
- Smaller attack surface
- Better fit for learning modern Kubernetes operations

## Setup Journey

The first machine arrived with Windows preinstalled, so the first major step was wiping the internal drive and replacing it with Talos Linux. The second node was later added as a dedicated worker using the original cluster's worker machine config. The cluster is now being expanded toward a three-node control-plane layout.

High-level process:

1. Downloaded the Talos `metal-amd64.iso`
2. Flashed it to a USB drive with Raspberry Pi Imager
3. Booted the homelab machine from USB
4. Found the node IP on the Talos dashboard
5. Generated Talos machine configs from my Mac
6. Enabled scheduling on the control plane for a single-node cluster
7. Applied the Talos control plane config
8. Installed Talos to the internal SSD
9. Rebooted into the installed system
10. Bootstrapped Kubernetes
11. Confirmed the cluster was up with `kubectl`

## Documentation

- [Hardware and Goals](docs/01-hardware-and-goals.md)
- [Talos Linux Installation](docs/02-talos-linux-install.md)
- [Admin Workstation Setup](docs/03-admin-workstation-setup.md)
- [Cluster Bootstrap](docs/04-cluster-bootstrap.md)
- [GitOps Roadmap](docs/05-gitops-roadmap.md)
- [Argo CD GitOps Setup](docs/06-argocd-gitops.md)
- [Private Access with Tailscale](docs/07-tailscale-private-access.md)
- [Kubernetes Dashboards](docs/08-kubernetes-dashboards.md)
- [Personal Website and Cloudflare Tunnel](docs/09-personal-site-cloudflare.md)
- [Cozy Friends Server Runbook](docs/19-cozy-friends-server.md)
- [Kubernetes Operations Lessons](docs/10-kubernetes-operations-lessons.md)
- [Observability Stack](docs/11-observability-stack.md)
- [SOPS Secrets Workflow](docs/12-sops-secrets-workflow.md)
- [Longhorn Storage](docs/13-longhorn-storage.md)
- [Architecture](docs/14-architecture.md)
- [CloudNativePG for Company Brain](docs/15-cloudnativepg-company-brain.md)
- [PreviewApp Operator GitOps Setup](docs/16-previewapp-operator-gitops.md)
- [Whisper Learnings and Issues](docs/17-whisper-learnings-and-issues.md)
- [Build Log](docs/build-log.md)
- [nginx Personal Website](manifests/nginx/README.md)
- [Cloudflare Tunnel Manifests](manifests/cloudflare-tunnel/README.md)
- [Monitoring Manifests](manifests/monitoring/README.md)
- [Resume Notes](docs/resume-notes.md)

## Skills Demonstrated

- Kubernetes administration
- Talos Linux / immutable infrastructure
- Bare-metal cluster operations
- `talosctl` and `kubectl`
- Linux/Kubernetes networking concepts
- Infrastructure documentation
- GitOps with Argo CD
- Private admin access with Tailscale
- Kubernetes dashboard operations with Headlamp
- Static website hosting on Kubernetes
- Cloudflare Tunnel public access without port forwarding
- Kubernetes persistent storage with Longhorn
- SOPS-based encrypted secret management
- Architecture documentation with Mermaid diagrams
- Security-aware system design

## Next Steps

- Pin and harden the `cloudflared` deployment
- Deploy n8n and Postgres through GitOps
- Enable recurring Longhorn backup jobs for selected volumes
- Deploy and back up the first real stateful workload
- Configure Alertmanager routes and production-grade alerting
- Deploy security-focused workloads for experimentation
