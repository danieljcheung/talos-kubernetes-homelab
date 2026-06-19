# PreviewApp Operator GitOps Setup

Date: 2026-06-19

## Purpose

The PreviewApp Operator manages dynamic, ephemeral preview environments (PreviewApps) on the Talos homelab cluster. It reconciles custom `PreviewApp` resources to automatically provision and tear down web workloads, enabling developer previews without manual cluster configuration.

## Architecture

The operator integrates GitOps and dynamic controller reconciliation to manage preview lifecycles:

```text
GitHub (danieljcheung/previewapp-operator)
  ↓ [Build & Push Container Image on Push to main]
GitHub Container Registry (ghcr.io)
  ↓
Argo CD Sync
  ↓ [Deploys Operator to previewapp-system]
Kubernetes Cluster (Talos)
  ↓
Developer / Pipeline applies PreviewApp CR (into previews namespace)
  ↓ [Reconciliation Loop]
PreviewApp Operator Controller creates:
  ├─ Deployment (Runs container, non-root, resource-constrained)
  ├─ ClusterIP Service (Exposes app container port to cluster)
  └─ Ingress (Exposed via ingress-nginx Class and ingress controller)
  ↓
External Traffic
  ↓ [Requests to *.popinvites.com]
Cloudflare Tunnel & DNS
  ↓
ingress-nginx Controller (within cluster)
  ↓ [Routes based on Host header]
PreviewApp Ingress -> Service -> Pod
  ↓
TTL Expiration -> Controller deletes PreviewApp CR -> OwnerRefs delete Deployment/Service/Ingress
```

## Repositories and Paths

- **Operator Source Code Repository:** `danieljcheung/previewapp-operator` (Argo URL: `https://github.com/danieljcheung/previewapp-operator.git`)
- **Operator Deploy Manifests Path:** `deploy/gitops/previewapp` in the source repository.
- **GitOps Manifests Repository:** `danieljcheung/talos-kubernetes-homelab`
- **Argo CD Application Location:** `manifests/argocd/apps/previewapp-operator.yaml` in the GitOps repository.

## Namespaces

- **Operator Namespace:** `previewapp-system` (houses the operator deployment, service accounts, and RBAC configs).
- **Target Workload Namespace:** `previews` (where individual `PreviewApp` instances and their generated deployments/services/ingresses are deployed).

## Image Promotion Flow

The controller image is managed by the GitHub Actions workflow at `.github/workflows/controller-image.yml` in the operator source repository:

1. **Validation:** Pushes and pull requests to `main` run tests (`make test`) and verify that generated CRD manifests are clean (`make manifests generate && git diff --exit-code`).
2. **Build and Release:** On a successful push to `main`, the image is built using Docker Buildx and pushed to GitHub Container Registry (GHCR):
   - Controller Image: `ghcr.io/danieljcheung/previewapp-controller:latest`
   - Git SHA Tag: `ghcr.io/danieljcheung/previewapp-controller:<git-sha>`

## Operator Behavior

The operator reconciles `PreviewApp` resources inside the target namespace. For every active `PreviewApp` CR, the controller executes the following actions:

### 1. Resource Generation

- **Deployment:**
  - Standard container replica size: 1.
  - Image is retrieved from `spec.image` (pattern validation enforces GHCR host: `^ghcr\.io/.+`).
  - Target container port matches `spec.appPort`.
  - **Security Context:** Runs as non-root (UID `1000`, GID `1000`, FSGroup `1000`), drops all capabilities (`ALL`), blocks privilege escalation, uses runtime-default seccomp profiles, and disables service account token automounting.
  - **Resource Quotas:** Requests `25m` CPU / `64Mi` Memory; limits `250m` CPU / `256Mi` Memory.
- **Service:**
  - Configures a `ClusterIP` service mapping port 80 to the target container port (`spec.appPort`).
- **Ingress:**
  - Configures an Ingress resource with `ingressClassName: nginx` mapping the root path `/` to the ClusterIP Service.

All generated resources declare Kubernetes owner references pointing back to the parent `PreviewApp` custom resource to ensure automatic cleanup via cascade deletion.

### 2. Status and Conditions

The controller updates the `status` subresource of the `PreviewApp` resource, exposing the following fields:
- `phase`: Displays `Ready` if the deployment has at least one available replica; otherwise, displays `Reconciling`.
- `url`: Computed public HTTPS routing address, e.g., `https://<host>.popinvites.com`.
- `expiresAt`: Computed date/time (creation time + `ttlSeconds`) indicating when the preview environment will expire.
- `observedGeneration`: The latest reconciled resource generation.
- `conditions`: List of standard conditions reflecting resource readiness:
  - `DeploymentReady` (`True` when available replicas > 0)
  - `ServiceReady` (`True` once the ClusterIP Service is created/updated)
  - `IngressReady` (`True` once the Ingress is created/updated)
  - `Ready` (`True` when the deployment is ready and traffic is serving)

### 3. TTL Expiry and Cleanup

During reconciliation, the controller evaluates the current system time against the computed `status.expiresAt`. 
If the current time has surpassed `expiresAt`, the controller issues a delete call on the `PreviewApp` custom resource. Kubernetes garbage collection then cleans up the associated Deployment, Service, and Ingress resources automatically.

## PopInvites Routing Domain

Public routing uses the domain `*.popinvites.com`. 

1. Cloudflare DNS and Cloudflare Tunnels are configured to route wildcard subdomain traffic (`*.popinvites.com`) to the homelab's `ingress-nginx` controller.
2. The `ingress-nginx` controller matches the incoming host header (e.g. `<host>.popinvites.com`, where `<host>` is specified by `spec.route.host` on the PreviewApp CR) against the generated Ingress rule and forwards the request to the corresponding ClusterIP Service.
