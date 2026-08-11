# MetalLB

This directory contains the platform installation inputs for MetalLB in Layer 2
mode. The Helm chart is installed manually; Argo CD manages only the MetalLB
configuration objects in `config/` after the chart is ready.

## Scope and safety boundary

MetalLB advertises a Kubernetes `LoadBalancer` address on the homelab LAN. It
does not provide a firewall, DDoS protection, encryption, or a replacement for
the router's WAN rule. The only intended consumer of this pool is the Cozy
Friends Minecraft gameplay Service in the `cozy-friends` namespace.

The committed pool contains the candidate address `10.0.0.32/32`. This is a
documented candidate, **not a router-verified or otherwise approved VIP**. Do
not sync or apply `manifests/metallb/config`, create a LoadBalancer Service, or
add a router rule until the candidate-VIP gate below is complete.

## Files

- `namespace.yaml` — privileged Pod Security Admission labels for the
  `metallb-system` infrastructure namespace.
- `values.yaml` — values for MetalLB chart `0.16.1`, including explicit
  controller/speaker resources, Layer 2-only operation, and monitoring.
- `config/` — the one-address `IPAddressPool` and matching
  `L2Advertisement`, managed by Argo CD.
- `../argocd/apps/metallb-config.yaml` — Argo CD child Application for
  `config/`; it intentionally does not manage the Helm release or namespace.

## Preflight and candidate-VIP gate

Before changing the cluster or edge, verify all of the following from the
trusted operations workstation:

1. The Kubernetes API is reachable and the Talos nodes are on the same Layer 2
   LAN. Confirm the node interface and subnet used for MetalLB.
2. `10.0.0.32` is outside the router DHCP range and is not a reservation or an
   active DHCP lease.
3. The address is unused: check the router lease table, ARP/neighbour state,
   ping, existing `LoadBalancer` Services, and existing MetalLB pools.
4. Reserve the address in the router for the MetalLB use case. Record the
   router/DHCP decision in the operations runbook.
5. Confirm the router can forward WAN TCP `25565` to this LAN address and that
   the WAN address is a routable public IPv4 (not private space or CGNAT).

Until these checks are complete, leave the pool and Layer 2 advertisement
unapplied. The address in Git must continue to be described as a candidate;
LAN reachability alone is not proof that the public edge is configured.

## Install order

The namespace and chart must exist before Argo creates the MetalLB custom
resources. `CreateNamespace=false` in the Argo Application is intentional.

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
kubectl -n metallb-system get crd ipaddresspools.metallb.io l2advertisements.metallb.io
```

The monitoring values follow the existing kube-prometheus-stack conventions:
ServiceMonitors and PrometheusRules carry the label `release` with value
`kube-prometheus-stack`, Prometheus is in `monitoring`, and the scrape RBAC
binding uses the existing `kube-prometheus-stack-prometheus` service account.
Confirm those names against the live Prometheus resource before the first
install; do not guess a different release or service account while the cluster
is unreachable.

After the chart controller and speakers are ready **and the candidate-VIP gate
has passed**, sync only the configuration Application:

```bash
argocd app sync metallb-config
argocd app wait metallb-config --health --sync
kubectl -n metallb-system get ipaddresspool,l2advertisement
```

Do not point Argo at `manifests/metallb/` as a whole: the chart remains a
manually installed platform release and `config/` is the only Argo source.

## Temporary Layer 2 validation

Validate allocation before deploying Minecraft, after the candidate-VIP gate
and after the chart is ready. The temporary Pod and Service below deliberately
use the same namespace and Service label selectors as the production pool.

```bash
kubectl -n cozy-friends apply -f - <<'YAML'
apiVersion: v1
kind: Pod
metadata:
  name: metallb-validation
  labels:
    app.kubernetes.io/name: homestead
spec:
  automountServiceAccountToken: false
  securityContext:
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: web
      image: nginxinc/nginx-unprivileged:1.27.1-alpine
      ports:
        - name: http
          containerPort: 8080
      securityContext:
        allowPrivilegeEscalation: false
        capabilities:
          drop:
            - ALL
---
apiVersion: v1
kind: Service
metadata:
  name: metallb-validation
  labels:
    app.kubernetes.io/name: homestead
  annotations:
    metallb.io/address-pool: minecraft-public
    metallb.io/loadBalancerIPs: 10.0.0.32
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  selector:
    app.kubernetes.io/name: homestead
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 8080
YAML

kubectl -n cozy-friends get service metallb-validation -o wide
nc -vz 10.0.0.32 80
kubectl -n cozy-friends delete service/pod metallb-validation
```

The Service should receive `10.0.0.32` and be reachable from a LAN client. If
allocation or ARP fails, remove the temporary resources and stop; do not add a
WAN rule or deploy Minecraft until the address and Layer 2 path are corrected.
The temporary Service must be deleted after validation so the pool remains
reserved for the production gameplay Service.

## Monitoring

The chart values enable the controller and speaker ServiceMonitors and the
built-in stale-config, config-not-loaded, address-pool-exhausted, and address
pool-usage PrometheusRules. The BGP session alert is disabled because neither
FRR nor the frr-k8s backend is installed. Confirm the generated resources and
Prometheus target from the `monitoring` namespace after installation:

```bash
kubectl -n metallb-system get servicemonitor,prometheusrule
kubectl -n monitoring get prometheus
```

## Upgrade

Keep the chart version explicit. Review the MetalLB release notes and CRD
changes, render the candidate release with the checked-in values, and make the
upgrade during a maintenance window. Do not change the address pool or router
rule as part of an unrelated chart upgrade.

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

When selecting a newer chart, update the pinned version in the runbook and
review values/CRD compatibility before changing this command. Keep Layer 2
advertisement and `autoAssign: false` unchanged unless a separate edge review
approves a new design.

## Rollback and removal

For a failed chart upgrade, first stop new public traffic if necessary, then
roll back the Helm release while retaining the CRDs and pool:

```bash
helm history metallb -n metallb-system
helm rollback metallb <known-good-revision> \
  --namespace metallb-system \
  --wait \
  --timeout 10m
```

`<known-good-revision>` is an operator-supplied Helm revision, not a value to
commit to Git. If the failure is in the pool or advertisement, revert that Git
change and sync `metallb-config`; do not uninstall the chart to repair a CR.
Treat CRD downgrades as a compatibility review, not an automatic rollback.

To remove MetalLB entirely, use this order:

1. Remove or disable the router WAN TCP `25565` rule.
2. Stop the Minecraft gameplay Service and delete every temporary or remaining
   `LoadBalancer` Service using this pool.
3. Remove the Argo-managed pool and advertisement, then confirm no MetalLB CRs
   remain.
4. Uninstall the Helm release.
5. Delete `metallb-system` only after all namespaced resources are gone.

Never uninstall the chart while a router rule still targets its VIP or while a
`LoadBalancer` Service still depends on MetalLB.
