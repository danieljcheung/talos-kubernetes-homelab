# Monitoring Manifests

Helm values for the homelab observability stack.

## Components

- `kube-prometheus-stack-values.yaml` — Prometheus, Grafana, Alertmanager, node-exporter, kube-state-metrics
- `loki-values.yaml` — single-binary Loki for log storage/querying
- `alloy-values.yaml` — Grafana Alloy DaemonSet for Kubernetes log collection
- `homelab-alerts.yaml` — first custom Prometheus rules for pod restarts and nginx availability

## Install / Upgrade

```bash
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  -f manifests/monitoring/kube-prometheus-stack-values.yaml

helm upgrade --install loki grafana/loki \
  --namespace monitoring \
  -f manifests/monitoring/loki-values.yaml

helm upgrade --install alloy grafana/alloy \
  --namespace monitoring \
  -f manifests/monitoring/alloy-values.yaml
```

## Namespace Pod Security

Node-level agents such as node-exporter and Alloy may need privileged namespace permissions.

```bash
kubectl label namespace monitoring \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/audit=privileged \
  pod-security.kubernetes.io/warn=privileged \
  --overwrite
```

Keep this scoped to infrastructure namespaces only.

## Local Grafana Access

```bash
kubectl -n monitoring port-forward svc/monitoring-grafana 3000:80
```

Open:

```text
http://localhost:3000
```

Initial login is currently `admin / admin`; replace with a proper secret before hardening.


## Custom Alerts

Apply the custom homelab alert rules with:

```bash
kubectl apply -f manifests/monitoring/homelab-alerts.yaml
kubectl -n monitoring get prometheusrule homelab-alerts
```

Current rules:

- `PodRestartingFrequently`
- `NginxSitePodDown`

Notification delivery is intended to be configured through Grafana Alerting contact points and notification policies.
