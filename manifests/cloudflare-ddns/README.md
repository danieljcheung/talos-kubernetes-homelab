# Cloudflare DDNS

This workload maintains the explicit DNS-only `A` record for
`mc.popinvites.com`. It uses `favonia/cloudflare-ddns:1.17.0`, pinned to the
multi-platform image index digest
`sha256:61013368c8f95981c0bb8bf56d962078d8b4e95724a554fa2dabb20d6e478097`.
The deployment has one non-root replica and deliberately has no Service.

## Required Secret

The deployment references a Secret named `cloudflare-ddns-token` in the
`cloudflare-ddns` namespace. The Secret must contain one key named `token`.
It is mounted read-only at `/run/secrets/cloudflare/token` and is read through
`CLOUDFLARE_API_TOKEN_FILE`.

The Secret is intentionally not included in `kustomization.yaml`, and no
plaintext or placeholder Secret is committed here. The operator must create an
encrypted Secret manifest through the repository's existing SOPS workflow,
then apply that Secret locally before syncing this Argo application. Decrypt
only at apply time, for example by piping the local encrypted manifest to
`kubectl apply -f -`; do not print, commit, or send the token through chat or
logs. The Cloudflare token should be limited to Zone DNS Read/Edit for
`popinvites.com`.

Apply the namespace first if Argo has not created it yet, then apply the SOPS
managed Secret and verify only its metadata:

```bash
kubectl apply -f manifests/cloudflare-ddns/namespace.yaml
# Apply the locally encrypted Secret with the repository's SOPS workflow.
kubectl -n cloudflare-ddns get secret cloudflare-ddns-token -o name
```

Do not add the Secret to this directory's Kustomize resources. Argo can sync
the workload after the Secret exists.

## Runtime configuration

- `IP4_DOMAINS=mc.popinvites.com`
- `IP6_PROVIDER=none`
- `PROXIED=false` (the `mc` record must remain DNS-only)
- `UPDATE_CRON=*/5 * * * *`
- `UPDATE_ON_START=true`
- `RECORD_COMMENT=Managed by talos-kubernetes-homelab`

The updater uses cluster DNS and outbound TCP 443 only. Ingress is denied by
NetworkPolicy. No RCON, Minecraft, HTTP, or metrics port is exposed by this
workload.

## Argo CD

The child Application is `cloudflare-ddns` in the `argocd` namespace. It
tracks `HEAD` from the homelab repository and deploys the
`manifests/cloudflare-ddns` Kustomization into the restricted
`cloudflare-ddns` namespace.

Inspect the deployment without exposing Secret data:

```bash
kubectl -n cloudflare-ddns get deploy,pods
kubectl -n cloudflare-ddns logs deploy/cloudflare-ddns
```
