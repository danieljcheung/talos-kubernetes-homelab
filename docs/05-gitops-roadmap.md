# GitOps Roadmap

Once the base cluster is working, the next phase is to manage deployments through Git.

## Planned Tools

- Argo CD for GitOps
- Kubernetes manifests or Helm charts
- Private networking with Tailscale
- Monitoring with Prometheus/Grafana or a lighter stack

## Roadmap

1. Deploy a simple test application manually
2. Commit the Kubernetes manifests to GitHub
3. Install Argo CD
4. Connect Argo CD to this repository
5. Move app deployment into GitOps
6. Add monitoring
7. Add secure ingress/TLS
8. Document each step with screenshots and commands
