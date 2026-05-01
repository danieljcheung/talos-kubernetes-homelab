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

  homelab["Talos Kubernetes Homelab<br/>Bare-metal mini PC · i5-8500T · 16GB RAM"]

  dan -->|kubectl / talosctl| homelab
  dan -->|private dashboard access| tailscale
  github -->|desired state| homelab
  cloudflare -->|public site traffic| homelab
  tailscale -->|private HTTPS ingress| homelab
  homelab -->|alerts| telegram

  classDef external fill:#eef2ff,stroke:#4f46e5,color:#111827
  classDef user fill:#ecfeff,stroke:#0891b2,color:#111827
  classDef cluster fill:#f0fdf4,stroke:#16a34a,color:#111827

  class github,cloudflare,tailscale,telegram external
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

  subgraph cluster["Talos Kubernetes Homelab"]
    direction TB

    subgraph gitops["GitOps + Workloads"]
      direction LR
      argocd["Argo CD<br/>Sync controller"]
      nginx["nginx Site<br/>danieljcheung.com"]
      future["Future Apps<br/>n8n · Postgres"]
      argocd --> nginx
      argocd -. planned .-> future
    end

    subgraph access["Access Layer"]
      direction LR
      cloudflared["cloudflared<br/>Tunnel connector"]
      tsIngress["Tailscale Ingress<br/>Private dashboards"]
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
  end

  github -->|manifests| argocd
  cloudflare -->|public HTTPS| cloudflared --> nginx
  tailscale -->|private HTTPS| tsIngress
  tsIngress --> argocd
  tsIngress --> grafana
  tsIngress --> headlamp
  tsIngress --> longhorn
  alertmanager -->|notifications| telegram
  sops -. decrypt/apply from admin Mac .-> cluster

  classDef external fill:#eef2ff,stroke:#4f46e5,color:#111827
  classDef gitops fill:#fff7ed,stroke:#ea580c,color:#111827
  classDef access fill:#eff6ff,stroke:#2563eb,color:#111827
  classDef obs fill:#fdf2f8,stroke:#db2777,color:#111827
  classDef platform fill:#f0fdf4,stroke:#16a34a,color:#111827
  classDef storage fill:#fefce8,stroke:#ca8a04,color:#111827

  class github,cloudflare,tailscale,telegram external
  class argocd,nginx,future gitops
  class cloudflared,tsIngress access
  class alloy,loki,prometheus,grafana,alertmanager obs
  class headlamp,longhorn,sops platform
  class pvcs storage
```

## Access Model

- Public traffic only reaches the personal site through Cloudflare Tunnel.
- Admin dashboards stay private through Tailscale ingress.
- Secrets are encrypted in Git with SOPS and applied from the trusted admin machine for now.
- Longhorn provides persistent volumes, but the current single-node setup is not highly available until more nodes are added.
