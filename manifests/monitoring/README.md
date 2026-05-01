# Monitoring Manifests

Helm values for the homelab observability stack.

## Components

- `kube-prometheus-stack-values.yaml` — Prometheus, Grafana, Alertmanager, node-exporter, kube-state-metrics
- `loki-values.yaml` — single-binary Loki for log storage/querying
- `alloy-values.yaml` — Grafana Alloy DaemonSet for Kubernetes log collection
- `homelab-alerts.yaml` — first custom Prometheus rules for pod restarts, nginx availability, and Cloudflare Tunnel availability
- `telegram-alertmanagerconfig.example.yaml` — template for the Alertmanager Telegram route/receiver; copy to `telegram-alertmanagerconfig.yaml`, set the numeric chat ID locally, and create the `alertmanager-telegram` Secret

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
- `CloudflaredDown`

Notification delivery is configured through Alertmanager-native Telegram routing. Create or update the bot-token secret with:

```bash
kubectl -n monitoring create secret generic alertmanager-telegram \
  --from-literal=bot-token='YOUR_BOT_TOKEN' \
  --dry-run=client -o yaml | kubectl apply -f -
```

The kube-prometheus-stack values set `alertmanagerConfigMatcherStrategy.type: None` so alerts from namespaces such as `default` and `cloudflare` can match the Telegram route instead of falling through to the default null receiver.
