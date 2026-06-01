# SOPS Secrets Workflow

This documents how I set up encrypted secrets for the Talos Kubernetes homelab.

## Goal

I want Kubernetes manifests to stay reproducible in Git without committing real secret values in plaintext.

For now, the workflow is:

```text
Encrypted Secret YAML in Git
        ↓
Decrypt locally from my Mac with SOPS
        ↓
Apply to the cluster with kubectl
        ↓
Kubernetes stores a normal Secret object
```

This is not full Argo CD secret decryption yet. Argo CD integration can come later.

## Tools

Installed locally on my Mac:

```bash
brew install sops age
```

SOPS handles encrypting/decrypting YAML files. `age` provides the keypair.

## Age Key

My real private age key should live outside the repository:

```text
~/.config/sops/age/keys.txt
```

The private key must not be committed. If a file like `age-key.txt`, `keys.txt`, or `*.agekey` appears in the repo, remove it unless I explicitly know it is safe.

`.gitignore` includes local key patterns to reduce accidental commits.

Because SOPS on macOS may look somewhere else by default, my shell should point SOPS at the key:

```bash
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
```

I added that to my shell config so decrypting works consistently.

To print the public recipient from the private key:

```bash
age-keygen -y ~/.config/sops/age/keys.txt
```

The public recipient starts with `age1...` and is safe to reference in `.sops.yaml`.

## Repo SOPS Config

The repo has a `.sops.yaml` file that tells SOPS what to encrypt:

```yaml
creation_rules:
  - path_regex: manifests/.*/.*\.secret\.ya?ml$
    encrypted_regex: '^(data|stringData)$'
    age: age1...
```

Meaning:

- only files under `manifests/` ending in `.secret.yaml` or `.secret.yml` use this rule
- only `data` and `stringData` fields are encrypted
- metadata like Secret name and namespace remains readable

## Test Secret Process

I created a dummy secret at:

```text
manifests/secrets-test/dummy.secret.yaml
```

Plaintext example before encryption:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dummy-sops-secret
  namespace: default
type: Opaque
stringData:
  token: super-secret-test-value
```

Then I encrypted it in place:

```bash
sops --encrypt --in-place manifests/secrets-test/dummy.secret.yaml
```

After encryption, the token value became `ENC[...]` and the file gained a `sops:` metadata block.

To confirm plaintext is gone:

```bash
grep -R "super-secret-test-value" manifests/secrets-test/ || echo "plaintext is gone"
```

## Decrypting and Applying

To preview the decrypted YAML locally:

```bash
sops --decrypt manifests/secrets-test/dummy.secret.yaml
```

To apply it to the cluster:

```bash
sops --decrypt manifests/secrets-test/dummy.secret.yaml | kubectl apply -f -
```

To verify the Kubernetes Secret exists:

```bash
kubectl get secret dummy-sops-secret -n default
```

To inspect the Secret object:

```bash
kubectl get secret dummy-sops-secret -n default -o yaml
```

Important: once applied, the cluster Secret is not SOPS-encrypted. Kubernetes stores Secret values as base64 data and protects access through RBAC. SOPS protects the Git file, not the live cluster object.

Optional decode check:

```bash
kubectl get secret dummy-sops-secret -n default -o jsonpath='{.data.token}' | base64 -d
echo
```

Clean up the test Secret from the cluster:

```bash
kubectl delete secret dummy-sops-secret -n default
```

## Secret Inventory

These are the real homelab secrets currently handled with SOPS.

| Purpose | Kubernetes object | Namespace | Key / sensitive field | Encrypted file | Apply command |
| --- | --- | --- | --- | --- | --- |
| Telegram Alertmanager bot token | `Secret/alertmanager-telegram` | `monitoring` | `stringData.bot-token` | `manifests/monitoring/alertmanager-telegram.secret.yaml` | `sops --decrypt manifests/monitoring/alertmanager-telegram.secret.yaml \| kubectl apply -f -` |
| Cloudflare Tunnel token | `Secret/cloudflare-tunnel-token` | `cloudflare` | `stringData.token` | `manifests/cloudflare-tunnel/cloudflare-tunnel-token.secret.yaml` | `sops --decrypt manifests/cloudflare-tunnel/cloudflare-tunnel-token.secret.yaml \| kubectl apply -f -` |
| Company Brain Postgres user | `Secret/company-brain-db-user` | `company-brain` | `stringData.username`, `stringData.password` | `manifests/postgres/company-brain-db-user.secret.yaml` | `SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt" sops --decrypt manifests/postgres/company-brain-db-user.secret.yaml \| kubectl apply -f -` |

### Local-only / not committed

`manifests/monitoring/telegram-alertmanagerconfig.secret.yaml` is currently local-only because the Telegram `chatID` is not covered by the current SOPS rule. The bot token is already encrypted separately in `alertmanager-telegram.secret.yaml`.

If I want to commit the AlertmanagerConfig later, I should either:

1. accept that `chatID` is public-ish metadata and commit it intentionally, or
2. update `.sops.yaml` to also encrypt `chatID` before committing it.

## Current Scope

This setup gives me encrypted secrets in Git and manual local application.

Current model:

```text
Argo CD manages non-secret manifests.
SOPS-encrypted Secret files live in Git.
I decrypt/apply real Secrets manually from my Mac.
```

Future improvements:

- add more real secrets as encrypted `.secret.yaml` files when services need them
- document each required secret next to its app
- later integrate SOPS with Argo CD so encrypted secrets can sync automatically
- eventually consider Kubernetes encryption-at-rest for live Secret data
