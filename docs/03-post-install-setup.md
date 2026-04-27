# Post-Install Setup

After Ubuntu Server is installed, the first steps are system updates, SSH verification, and basic server preparation.

## Update Packages

```bash
sudo apt update
sudo apt upgrade -y
```

## Install Basic Tools

```bash
sudo apt install -y curl wget git vim htop net-tools ca-certificates
```

## Confirm SSH Access

From another machine on the network:

```bash
ssh <username>@<server-ip>
```

## Recommended Next Steps

- Reserve the server IP address in the router
- Confirm Ethernet is stable
- Record hostname and IP address in this repository
- Reboot after updates if required
