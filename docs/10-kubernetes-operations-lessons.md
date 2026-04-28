# Kubernetes Operations Lessons

Notes from the first real homelab incident/debugging session.

## Incident Summary

The cluster woke up with several pods in `CrashLoopBackOff` or error states, including CoreDNS, Argo CD components, Tailscale ingress pods, Headlamp, and Cloudflare Tunnel.

The important lesson was that these were mostly downstream symptoms. The useful diagnostic direction was to check the shared cluster dependencies first:

```bash
kubectl get nodes -o wide
kubectl get pods -A -o wide
kubectl get events -A --sort-by=.lastTimestamp | tail -80
kubectl -n kube-system logs ds/kube-proxy --tail=100
kubectl -n kube-system logs ds/kube-flannel --tail=100
kubectl -n kube-system logs deploy/coredns --tail=100
```

## What the Failure Taught

Kubernetes self-healing means:

> Kubernetes can recreate desired state somewhere healthy.

It does not mean:

> Kubernetes can magically repair the only broken node underneath the cluster.

On a single-node cluster, every workload depends on the same machine, same CNI state, same kube-proxy state, same disk, and same network path. If that foundation breaks, Kubernetes may keep restarting pods on broken ground.

## Single Node vs Multi-Node

### Single-node cluster

Good for:

- learning Talos
- learning `kubectl`
- learning manifests
- GitOps practice
- simple personal workloads

Weak against:

- node crash
- CNI/kube-proxy breakage
- disk failure
- network failure
- control-plane failure

Replicas still help with container/app failures, but all replicas live on the same node unless there are other schedulable nodes.

### Two-node cluster

A practical mini-rack step:

```text
node1: control-plane + light workloads
node2: worker workloads
```

This teaches scheduling and node separation, but it is not true control-plane HA. If the only control-plane node dies, the Kubernetes API dies with it. Existing workloads on the worker may keep running, but the cluster cannot be managed normally until the control-plane returns.

### Three-node cluster

The realistic HA learning shape:

```text
node1: control-plane + worker
node2: control-plane + worker
node3: control-plane + worker
```

With three control-plane nodes, etcd can keep quorum if one node fails:

```text
2/3 members remain healthy -> Kubernetes API stays alive
```

This is the minimum shape that demonstrates real Kubernetes control-plane resilience.

## Replicas

A replica is another copy of the same pod managed by a controller such as a Deployment.

Example:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 2
```

Replicas help with:

- app/container crashes
- rolling updates
- readiness/liveness probe failures
- keeping service availability when one pod is unhealthy

Replicas do not protect a one-node cluster from:

- the node dying
- CNI/kube-proxy breaking
- disk/network failure on that node
- control-plane failure

For stateless apps on a future multi-node cluster, use `replicas: 2` or more and spread them across nodes.

## Controllers Matter

Prefer controllers over naked pods:

- `Deployment` for stateless apps
- `StatefulSet` for stateful identity/storage-sensitive apps
- `DaemonSet` for one pod per node, such as kube-proxy or CNI components
- `Job` / `CronJob` for run-to-completion tasks

A naked `Pod` is not the normal resilient deployment unit.

## Completed Pods

`Completed` means the pod ran successfully and exited with code `0`.

Common sources:

- Jobs
- CronJobs
- one-off `kubectl run --restart=Never` diagnostic commands

Preview completed pods:

```bash
kubectl get pods -A --field-selector=status.phase=Succeeded
```

Clean them up:

```bash
kubectl delete pod -A --field-selector=status.phase=Succeeded
```

Do not mass-delete failed pods until logs have been inspected if they are useful for diagnosis.

## Diagnosing Cluster-Wide Pod Failures

When many unrelated workloads fail at once, avoid starting with app-specific fixes. Check shared infrastructure first:

1. Nodes
2. Events
3. CoreDNS
4. CNI / flannel
5. kube-proxy / service routing
6. Kubernetes API reachability from inside the cluster
7. Recent node reboots or machine config changes

Useful tests:

```bash
kubectl get nodes -o wide
kubectl get pods -A -o wide
kubectl get events -A --sort-by=.lastTimestamp | tail -80
kubectl get svc -A
kubectl get endpoints kubernetes -o yaml
```

Inside-cluster service/DNS check:

```bash
kubectl run netcheck --rm -i --restart=Never --image=busybox:1.36 -- \
  sh -c 'nslookup kubernetes.default.svc 10.96.0.10; wget -T 5 -qO- http://nginx.default.svc || true'
```

## Cloudflare Tunnel / Personal Site Lesson

The personal site path is:

```text
Browser
  -> Cloudflare DNS/proxy
  -> Cloudflare Tunnel
  -> cloudflared pod
  -> nginx.default.svc.cluster.local:80
  -> nginx pod
```

`danieljcheung.com` and `www.danieljcheung.com` should both point to the same tunnel service target.

Diagnostic order:

```bash
dig +short danieljcheung.com
dig +short www.danieljcheung.com
curl -I https://danieljcheung.com
curl -I https://www.danieljcheung.com
kubectl -n cloudflare logs deploy/cloudflared --tail=100
```

If one hostname fails but the internal service works for both Host headers, the likely issue is Cloudflare tunnel/DNS/edge propagation rather than nginx.

## Personal Operations Lesson

When the goal is learning, diagnose before fixing.

Good assistant/operator behavior:

- state the hypothesis
- show the command to test it
- explain what each result means
- ask before making cluster changes

Bad behavior:

- applying speculative fixes before the learner has a chance to investigate

This morning was a useful reminder that homelab incidents are learning reps, not just outages to make disappear.
