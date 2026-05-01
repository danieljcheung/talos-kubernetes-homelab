# Build Log

This is the chronological build log for my Talos Kubernetes homelab.

## Phase 1 — Hardware Acquired

I started with a small form factor homelab machine:

- Intel Core i5-8500T
- 16GB RAM
- 256GB SSD

The machine came with Windows preinstalled, but the goal was to turn it into a dedicated Kubernetes node.

## Phase 2 — Choosing the Operating System

The first idea was to install Ubuntu Server and run k3s directly on bare metal. That would have worked, but I decided to use **Talos Linux** instead.

The reason was that Talos is more Kubernetes-native:

- It is immutable
- It is managed through an API
- It does not rely on SSH-based server administration
- It has a smaller attack surface
- It better reflects modern platform engineering practices

This made the project more valuable as a resume project and as a learning environment.

## Phase 3 — Creating the Installer USB

I downloaded the Talos Linux `metal-amd64.iso` because the homelab machine uses an Intel x86_64 CPU.

I used Raspberry Pi Imager to flash the ISO to a USB drive:

1. Open Raspberry Pi Imager
2. Choose custom OS image
3. Select the Talos `metal-amd64.iso`
4. Select the USB drive
5. Write the image
6. Boot the homelab machine from USB

## Phase 4 — Networking

Talos displayed the node IP on its dashboard. The machine received:

```text
10.0.0.97/24
```

For Talos commands, I used the IP without the CIDR suffix:

```text
10.0.0.97
```

The Kubernetes API endpoint used port `6443`:

```text
https://10.0.0.97:6443
```

## Phase 5 — Generating Talos Config

From my Mac, I generated the Talos configuration:

```bash
talosctl gen config homelab-k8s https://10.0.0.97:6443
```

Because this is a single-node cluster, the control plane also needs to run workloads. I enabled:

```yaml
cluster:
  allowSchedulingOnControlPlanes: true
```

I learned that the YAML formatting matters a lot here. A small capitalization or indentation mistake can prevent the config from applying.

## Phase 6 — Applying Config and Installing Talos

After fixing the config formatting, I applied the control plane config to the node.

```bash
talosctl apply-config --insecure --nodes 10.0.0.97 --file controlplane.yaml
```

This step replaced the preinstalled Windows environment and installed/configured Talos on the internal SSD.

## Phase 7 — Bootstrap

After Talos was installed and the node rebooted, I bootstrapped Kubernetes:

```bash
talosctl bootstrap --nodes 10.0.0.97 --endpoints 10.0.0.97
```

Then I configured Kubernetes access and verified the cluster with `kubectl`.

## Current Result

Talos Linux is installed and Kubernetes is bootstrapped on bare metal.

The homelab is now ready for the next phase: deploying real workloads and managing them through GitOps.

## Lessons Learned

- Ethernet is the easiest and most reliable path for Talos setup
- Router DHCP reservation is safer than manually configuring a static IP at the beginning
- Talos is not administered like Ubuntu; there is no normal SSH workflow
- `talosctl` config/cert context matters after initial insecure setup
- YAML formatting errors can look scarier than they are
- For a single-node cluster, scheduling on the control plane must be enabled

## Phase 8 — First Kubernetes Workload

After bootstrapping Kubernetes, I deployed a simple nginx workload to confirm the cluster was working end-to-end.

The goal of this step was not to deploy a complex application. It was to prove that the cluster could successfully:

- schedule a pod
- pull and run a container image
- expose the workload through a Kubernetes Service
- serve traffic over the local network

Commands used:

```bash
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --port=80 --type=NodePort
kubectl get pods
kubectl get svc nginx
```

The NodePort service made nginx reachable from another machine on the LAN using the Talos node IP and the assigned service port.

This was the first successful application deployment on the homelab cluster.

## Phase 9 — From Manual Deployments to GitOps

The nginx deployment was created manually with `kubectl`, which is useful for validating the cluster but not how I want to operate the homelab long term.

The next goal is to move from manual commands to a GitOps workflow:

```text
GitHub repository
        ↓
Argo CD watches the repo
        ↓
Argo CD syncs Kubernetes manifests
        ↓
Cluster state matches Git
```

This will make GitHub the source of truth for applications and infrastructure configuration.

The next technical milestones are:

1. Convert the nginx test deployment into Kubernetes YAML manifests
2. Commit those manifests to this repository
3. Install Argo CD inside the cluster
4. Connect Argo CD to this GitHub repository
5. Let Argo CD manage the test application automatically


## Phase 10 — Installing Argo CD

After confirming the cluster could run a manual nginx workload, I installed Argo CD to move toward GitOps.

I created a dedicated namespace for Argo CD:

```bash
kubectl create namespace argocd
```

Then I installed the official Argo CD manifests:

```bash
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

I watched the Argo CD pods come online:

```bash
kubectl get pods -n argocd
```

To access the UI locally, I used port-forwarding:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Then I opened:

```text
https://localhost:8080
```

This gave me a self-hosted Argo CD instance running inside my own Kubernetes cluster.

## Phase 11 — First GitOps Application

After publishing this repository to GitHub, I connected Argo CD to it and created my first GitOps-managed application.

Argo CD application settings:

```text
Application name: nginx
Project: default
Repository: https://github.com/danieljcheung/talos-kubernetes-homelab.git
Revision: HEAD
Path: manifests/nginx
Cluster: https://kubernetes.default.svc
Namespace: default
Sync policy: Manual
```

After creating the application, I synced it from the Argo CD UI.

At this point, the deployment flow became:

```text
GitHub repository
        ↓
Argo CD watches manifests/nginx
        ↓
Argo CD applies Kubernetes manifests
        ↓
Talos Kubernetes cluster runs nginx
```

This was the first GitOps milestone for the homelab.

## What This Enables

With Argo CD connected to GitHub, the cluster can now be managed declaratively.

Instead of manually creating resources with one-off `kubectl` commands, I can define the desired state in Git and let Argo CD reconcile the cluster toward that state.

This enables:

- version-controlled infrastructure changes
- repeatable application deployments
- visible sync and health status
- drift detection between Git and the live cluster
- a foundation for managing real homelab services

The next step is to replace the generic nginx test with a small custom homelab landing page, then continue adding services through GitOps.

## Phase 12 — Private Argo CD Access over Tailscale

After getting Argo CD working through local port-forwarding, I added private dashboard access using the Tailscale Kubernetes Operator.

The goal was to avoid exposing the Argo CD admin dashboard to the public internet while still making it reachable from my own devices.

The private access path is now:

```text
Mac / PC on Tailscale
        ↓
https://argocd.tail2be9f6.ts.net
        ↓
Tailscale Ingress
        ↓
argocd-server Service
        ↓
Argo CD pods
```

This created a cleaner operational model:

- public services can be exposed separately through a public edge such as Cloudflare Tunnel
- administrative services stay private on the tailnet
- Kubernetes Services can be exposed without router port forwarding
- access is tied to Tailscale identity instead of an open public endpoint

### Operator Setup

The Tailscale Kubernetes Operator was installed with Helm using an OAuth client restricted to Kubernetes-related tags and permissions.

The operator added Kubernetes CRDs and controllers that allow Kubernetes resources to request Tailscale networking behavior.

### Ingress Setup

To expose Argo CD privately, I created a Kubernetes Ingress using the Tailscale ingress class:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-tailscale
  namespace: argocd
spec:
  ingressClassName: tailscale
  defaultBackend:
    service:
      name: argocd-server
      port:
        number: 443
  tls:
    - hosts:
        - argocd
```

The important line is:

```yaml
ingressClassName: tailscale
```

That tells Kubernetes that this Ingress should be handled by the Tailscale Operator instead of a normal public ingress controller.

After provisioning, Argo CD became reachable at:

```text
https://argocd.tail2be9f6.ts.net
```

## What I Learned

This phase connected several Kubernetes concepts:

- **CRDs** extend Kubernetes with new resource types used by operators.
- **Operators** watch Kubernetes resources and automate infrastructure behavior.
- **Ingress** defines HTTP/HTTPS routing into cluster Services.
- **Ingress classes** select which controller should handle a given Ingress.
- **Tailscale** can provide private zero-trust access to internal services without exposing them publicly.

The key design decision was separating private admin access from public application hosting.

```text
Private admin plane: Argo CD, dashboards, internal tools → Tailscale
Public app plane: personal site / public workloads → Cloudflare Tunnel or public ingress
```

This is a safer and more production-like pattern than putting admin dashboards directly on the public internet.

## Phase 13 — Headlamp Kubernetes Dashboard

After Argo CD was available privately through Tailscale, I added Headlamp as a Kubernetes dashboard.

Argo CD answers the GitOps question:

```text
What does Git want the cluster to run?
```

Headlamp answers the live operations question:

```text
What is the cluster actually running right now?
```

This makes the homelab easier to operate because I can inspect namespaces, workloads, services, events, and other Kubernetes resources from a browser instead of relying only on `kubectl`.

### Headlamp Service Discovery

Headlamp was installed through Helm, but the namespace was not immediately obvious. I checked the cluster for the installed Service and pods:

```bash
kubectl get svc -A | grep -i headlamp
kubectl get pods -A | grep -i headlamp
```

The Headlamp Service was installed in `kube-system` as:

```text
my-headlamp
```

The Service listens on port `80`, so the Tailscale Ingress points to:

```text
namespace: kube-system
service: my-headlamp
port: 80
```

### Private Headlamp Access over Tailscale

I added a Tailscale Ingress for Headlamp:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: headlamp-tailscale
  namespace: kube-system
spec:
  ingressClassName: tailscale
  defaultBackend:
    service:
      name: my-headlamp
      port:
        number: 80
  tls:
    - hosts:
        - headlamp
```

After applying it, Headlamp became available privately at:

```text
https://headlamp.tail2be9f6.ts.net
```

### Dashboard Access Pattern

At this point the cluster has two private admin dashboards:

```text
https://argocd.tail2be9f6.ts.net   → GitOps control plane
https://headlamp.tail2be9f6.ts.net → Kubernetes resource dashboard
```

Both are routed through the Tailscale Kubernetes Operator rather than being exposed publicly.

The resulting admin plane is:

```text
Trusted device on Tailscale
        ↓
Tailscale HTTPS hostname
        ↓
Tailscale Kubernetes Operator
        ↓
Kubernetes Ingress
        ↓
Internal dashboard Service
```

This keeps cluster administration private while still making the dashboards convenient to use from my own devices.

## Updated Current Result

The homelab now has:

- Talos Linux installed on bare metal
- a single-node Kubernetes cluster
- a GitOps workflow through Argo CD
- private Argo CD access through Tailscale
- private Headlamp access through Tailscale
- a documented separation between private admin services and future public workloads

The next phase is to deploy a real persistent service, likely n8n with Postgres, through GitOps.

## Phase 14 — Personal Website on Kubernetes

I replaced the temporary nginx landing page with my personal website and kept the deployment GitOps-managed through Argo CD.

The website is intentionally minimal and static. It is served by nginx from a Kubernetes `ConfigMap` containing:

- `index.html`
- `styles.css`

The nginx deployment mounts both files into:

```text
/usr/share/nginx/html/index.html
/usr/share/nginx/html/styles.css
```

This kept the application simple while still making the live site part of the cluster's declarative state.

### Service Model

The nginx Service was changed from `NodePort` to `ClusterIP`.

Reason: the public site should be reached through Cloudflare Tunnel, not by exposing a node port or forwarding router traffic to the homelab.

The internal service target is:

```text
http://nginx.default.svc.cluster.local:80
```

For local debugging, I can still use:

```bash
kubectl port-forward svc/nginx 8080:80
```

and open:

```text
http://localhost:8080
```

That local `127.0.0.1` endpoint is only a debugging tunnel from my workstation through the Kubernetes API; it is not the public serving path.

## Phase 15 — Cloudflare Tunnel Public Site Access

I bought the domain:

```text
danieljcheung.com
```

I then connected the Kubernetes-hosted nginx site through Cloudflare Tunnel.

Current public state:

- `https://danieljcheung.com` works
- `https://www.danieljcheung.com` does not work yet

The intended routing is:

```text
danieljcheung.com      -> Cloudflare Tunnel -> nginx.default.svc.cluster.local:80
www.danieljcheung.com  -> Cloudflare Tunnel -> nginx.default.svc.cluster.local:80
```

The likely remaining fix is adding or correcting the `www` public hostname/DNS route in Cloudflare so it points to the same tunnel target as the root domain.

### Security Posture

This setup is secure enough for a personal static site because:

- the site is static and has very low application attack surface
- the Kubernetes Service is internal-only (`ClusterIP`)
- there is no router port forwarding
- Cloudflare Tunnel uses outbound connectivity from the cluster
- no real tunnel token is committed to Git
- admin dashboards remain private on Tailscale

I would describe the setup as production-minded, not fully production-grade yet.

Remaining production hardening:

- pin `cloudflare/cloudflared` instead of using `latest`
- add readiness/liveness probes
- consider multiple cloudflared replicas
- add NetworkPolicies
- add monitoring/alerting
- document rebuild/disaster recovery steps

## Phase 16 — First Real Kubernetes Incident and Operations Lessons

The first meaningful incident was waking up to several pods in `CrashLoopBackOff` or error states at the same time.

Affected components included:

- CoreDNS
- Argo CD components
- Tailscale ingress pods
- Headlamp
- Cloudflare Tunnel

The key lesson was that many unrelated pods failing together usually points to shared cluster infrastructure, not separate app bugs.

The useful diagnostic path was:

```bash
kubectl get nodes -o wide
kubectl get pods -A -o wide
kubectl get events -A --sort-by=.lastTimestamp | tail -80
kubectl -n kube-system logs ds/kube-proxy --tail=100
kubectl -n kube-system logs ds/kube-flannel --tail=100
kubectl -n kube-system logs deploy/coredns --tail=100
```

The broader Kubernetes lesson was:

```text
Kubernetes can recreate desired state somewhere healthy.
It cannot magically repair the only unhealthy node underneath a single-node cluster.
```

In a single-node cluster, replicas can help with app/container crashes, but they cannot protect against node-level failures such as broken CNI state, kube-proxy/service routing problems, disk failure, or the control-plane being unavailable.

This led to a clearer future architecture plan:

```text
Short term:
  1 Talos node for learning and simple workloads

Next practical step:
  2-node mini rack
  - node1: control-plane + light workloads
  - node2: worker workloads

Best HA learning shape:
  3 small nodes
  - all control-plane + worker
  - etcd quorum can survive one node failure
```

Other lessons from this session:

- `Completed` pods are usually successful run-to-completion pods, often from Jobs or one-off diagnostics.
- Completed pods can be cleaned with:

```bash
kubectl delete pod -A --field-selector=status.phase=Succeeded
```

- Use Deployments/StatefulSets/DaemonSets instead of naked Pods for real workloads.
- Most current homelab apps are already managed by controllers.
- `www.danieljcheung.com` and `danieljcheung.com` should both route through the same Cloudflare Tunnel target.
- If one Cloudflare hostname fails but the internal Kubernetes Service works for both Host headers, suspect Cloudflare DNS/tunnel/edge propagation before changing nginx.

A separate concise notes page was added at:

```text
docs/10-kubernetes-operations-lessons.md
```


## Phase 17 — Observability Stack: Prometheus, Grafana, Loki, and Alloy

I added the first full observability stack to the homelab.

The stack is:

```text
Metrics:
node-exporter + kube-state-metrics
        ↓
Prometheus
        ↓
Grafana

Logs:
Kubernetes pod logs
        ↓
Grafana Alloy
        ↓
Loki
        ↓
Grafana

Alerts:
Prometheus rules
        ↓
Alertmanager
```

Installed Helm releases in the `monitoring` namespace:

- `monitoring` — kube-prometheus-stack
- `loki` — Grafana Loki
- `alloy` — Grafana Alloy

Key lessons:

- Prometheus is for metrics, Loki is for logs, Grafana is the UI, and Alloy is the collector.
- Node Exporter needs host-level access, so Pod Security blocked it until the `monitoring` namespace was explicitly labeled privileged.
- Privileged Pod Security should be scoped to infrastructure namespaces, not applied globally.
- Loki does not collect logs by itself; Alloy ships pod logs to Loki.
- Loki's Helm chart defaults to a scalable mode, so single-node homelab installs need explicit `SingleBinary` settings and `read/write/backend` replicas set to `0`.
- Because the cluster does not have a storage provisioner yet, Loki is running without persistence for now.
- With persistence disabled, Loki needed writable paths under `/tmp/loki` instead of the default `/var/loki` read-only container filesystem.

Current limitation: this is learning-grade observability. Before relying on it for production-style incident response, add private Grafana access, real secrets, Alertmanager routes, persistent storage, and backups.

Detailed notes were added at:

```text
docs/11-observability-stack.md
```


## Phase 18 — Private Grafana Access and Cloudflare Tunnel Reliability

I exposed Grafana privately over Tailscale so the monitoring dashboard is reachable from trusted devices without making it public.

The private admin surface now includes:

```text
Argo CD  -> https://argocd.tail2be9f6.ts.net
Headlamp -> https://headlamp.tail2be9f6.ts.net
Grafana  -> https://grafana.tail2be9f6.ts.net
```

I also added my final resume PDF to the Kubernetes-hosted nginx site and linked it from the contact section. The file is served directly by nginx from the same GitOps-managed ConfigMap-backed site.

After that, I hit intermittent Cloudflare bad gateway / host errors from different devices. The important diagnostic result was that nginx and the Kubernetes Service were healthy inside the cluster while external requests through Cloudflare intermittently returned 502s after several seconds.

That narrowed the issue to the Cloudflare Tunnel path rather than the nginx app itself:

```text
Cloudflare edge -> cloudflared connector -> Kubernetes DNS/service -> nginx
```

To improve reliability, I changed the tunnel deployment to:

- run two `cloudflared` replicas instead of one
- force `cloudflared` to use HTTP/2 transport instead of QUIC
- add stricter container security settings:
  - drop all Linux capabilities
  - use the runtime default seccomp profile
  - run as non-root

The lesson: replicas help with connector availability, but Cloudflare Tunnel still has external edge/network behavior that can fail even when the cluster is healthy. If this continues, the next serious architecture step is a small VPS public edge with WireGuard or Tailscale back to the homelab.


## Phase 19 — First Custom Alerts

I added the first custom Prometheus rules for the homelab.

The rules live in:

```text
manifests/monitoring/homelab-alerts.yaml
```

The first two alerts are intentionally simple and practical:

- `PodRestartingFrequently` — warns when a pod restarts more than 3 times in 15 minutes.
- `NginxSitePodDown` — fires as critical if the nginx deployment serving my personal website has no available replicas for 2 minutes.

I decided not to rely on a `probe_success` public-site alert yet because that requires blackbox-exporter or another external probe source. The better order is to first route Kubernetes-native alerts through Grafana Alerting, then add blackbox-exporter for true external uptime monitoring.

The notification direction is Grafana Alerting contact points and notification policies rather than raw ntfy webhooks. This keeps alert routing easier to manage from the private Grafana UI.

