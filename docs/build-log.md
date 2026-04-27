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
