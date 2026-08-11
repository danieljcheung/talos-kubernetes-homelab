# Homelab Architecture

This document shows the current architecture of the Talos Kubernetes homelab.

## System Context

```mermaid
flowchart TB
  dan["Dan's Devices<br/>MacBook · PC · Phone"]
  github["GitHub<br/>GitOps Repository"]
  cloudflare["Cloudflare<br/>DNS + Tunnel"]
  tailscale["Tailscale<br/>Private Mesh"]
  telegram["Telegram<br/>Alert Delivery"]
  s3["AWS S3<br/>Longhorn Backups"]

  homelab["Talos Kubernetes Homelab<br/>2 bare-metal SFF nodes<br/>1 control plane · 1 worker"]

  dan -->|kubectl / talosctl| homelab
  dan -->|private dashboard access| tailscale
  github -->|desired state| homelab
  cloudflare -->|public site traffic| homelab
  tailscale -->|private HTTPS ingress| homelab
  homelab -->|alerts| telegram
  homelab -->|volume backups| s3

  classDef external fill:#eef2ff,stroke:#4f46e5,color:#111827
  classDef user fill:#ecfeff,stroke:#0891b2,color:#111827
  classDef cluster fill:#f0fdf4,stroke:#16a34a,color:#111827

  class github,cloudflare,tailscale,telegram,s3 external
  class dan user
  class homelab cluster
```

## Cluster Container View

```mermaid
flowchart TB
  github["GitHub Repo"]
  cloudflare["Cloudflare Edge"]
  tailscale["Tailscale Mesh"]
  telegram["Telegram"]
  s3["AWS S3<br/>Longhorn Backups"]

  subgraph cluster["Talos Kubernetes Homelab"]
    direction TB

    subgraph nodes["Physical Nodes"]
      direction LR
      cp["desktop-j7rbie4<br/>control plane"]
      worker["desktop-bvomtdn<br/>worker"]
    end

    subgraph gitops["GitOps + Workloads"]
      direction LR
      argocd["Argo CD<br/>Sync controller"]
      nginx["nginx Site<br/>danieljcheung.com"]
      future["Future Apps<br/>n8n"]
      companyBrain["Company Brain<br/>Next.js app planned"]
      postgres["CloudNativePG<br/>Company Brain Postgres"]
      previewappOperator["PreviewApp Operator<br/>previewapp-system"]
      previewapps["PreviewApp Previews<br/>previews namespace"]
      whisper["Whisper<br/>Private clipboard"]

      argocd --> nginx
      argocd --> whisper
      argocd --> postgres
      companyBrain --> postgres
      argocd -. planned .-> future
      argocd --> previewappOperator
      previewappOperator -. creates/reconciles .-> previewapps
    end

    subgraph access["Access Layer"]
      direction LR
      cloudflared["cloudflared<br/>Tunnel connector"]
      tsIngress["Tailscale Ingress<br/>Private dashboards"]
      ingressNginx["ingress-nginx<br/>Ingress Controller"]
    end

    subgraph observability["Observability"]
      direction LR
      alloy["Alloy<br/>Log collector"]
      loki["Loki<br/>Logs"]
      prometheus["Prometheus<br/>Metrics"]
      grafana["Grafana<br/>Dashboards"]
      alertmanager["Alertmanager<br/>Routing"]

      alloy --> loki --> grafana
      prometheus --> grafana
      prometheus --> alertmanager
    end

    subgraph platform["Platform Services"]
      direction LR
      headlamp["Headlamp<br/>Kubernetes UI"]
      longhorn["Longhorn<br/>Persistent storage"]
      sops["SOPS Secrets<br/>Encrypted in Git"]
    end

    longhorn --> pvcs["PVCs<br/>Stateful data"]
    postgres --> pvcs
  end

  github -->|manifests| argocd
  cloudflare -->|public HTTPS| cloudflared --> nginx
  cloudflare -->|public HTTPS *.popinvites.com| cloudflared --> ingressNginx --> previewapps
  tailscale -->|private HTTPS| tsIngress
  tsIngress --> argocd
  tsIngress --> grafana
  tsIngress --> whisper
  tsIngress --> headlamp
  tsIngress --> longhorn
  alertmanager -->|notifications| telegram
  longhorn -->|external backups| s3
  sops -. decrypt/apply from admin Mac .-> cluster

  classDef external fill:#eef2ff,stroke:#4f46e5,color:#111827
  classDef gitops fill:#fff7ed,stroke:#ea580c,color:#111827
  classDef access fill:#eff6ff,stroke:#2563eb,color:#111827
  classDef obs fill:#fdf2f8,stroke:#db2777,color:#111827
  classDef platform fill:#f0fdf4,stroke:#16a34a,color:#111827
  classDef storage fill:#fefce8,stroke:#ca8a04,color:#111827

  class github,cloudflare,tailscale,telegram,s3 external
  class argocd,nginx,whisper,future,previewappOperator,previewapps gitops
  class cloudflared,tsIngress,ingressNginx access
  class alloy,loki,prometheus,grafana,alertmanager obs
  class headlamp,longhorn,sops platform
  class pvcs storage
```

## Access Model

- Public traffic only reaches the personal site through Cloudflare Tunnel.
- Public preview environments are exposed dynamically under subdomains of `popinvites.com` using Cloudflare wildcard routing to the internal `ingress-nginx` controller.
- Admin dashboards stay private through Tailscale ingress.
- Secrets are encrypted in Git with SOPS and applied from the trusted admin machine for now.
- Longhorn provides persistent volumes and external AWS S3 backups, but the current two-node setup is still not a fully highly available storage/control-plane design.
- The cluster currently uses one control-plane node and one worker node. This is cleaner than two control-plane nodes because etcd HA should use three control-plane members.
## Planned Cozy Friends public paths (gated)

The planned Homestead 1.3.7 hosting design adds two intentionally different
routes under `popinvites.com`:

```text
Minecraft Java
  -> mc.popinvites.com explicit DNS-only A record
  -> home WAN IPv4 -> router TCP 25565
  -> MetalLB Layer 2 VIP 10.0.0.32/32 (candidate)
  -> cozy-friends/homestead gameplay Service

Web browser
  -> proxied *.popinvites.com wildcard
  -> existing Cloudflare Tunnel -> ingress-nginx
  -> Host: cozy.popinvites.com
  -> cozy-friends-site Service
```

The `mc` record must be gray-cloud/DNS-only; `cozy` remains covered by the
existing proxied wildcard. No second Tunnel, RCON Service, UDP forwarding, or
Cloudflare Access policy is part of this design. The candidate VIP is not
router-verified, so this is a planned route rather than deployment evidence.
Public launch remains gated by the verified LAN/DHCP/WAN path, explicit EULA
acceptance, allowlist usernames, local secrets, client smoke test, backup
restore, and outside-network monitors.

The Minecraft world uses one StatefulSet replica and Longhorn replica count 1.
That combination is persistent storage, not high availability: a node or disk
failure can still require restore. Application-aware Restic backups are the
primary recovery artifact; Longhorn snapshots and external backups are
secondary disaster recovery. The [Cozy Friends Server runbook](19-cozy-friends-server.md)
covers operations and rollback.
