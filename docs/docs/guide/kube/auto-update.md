---
order: 4
---
# Auto update
KUBE keeps itself up to date automatically.

To configure this feature:

```bash
kube config autoupdate.enabled true
kube config autoupdate.interval 600 # How often to check for updates, in seconds.
sudo kube restart
```

The happens from one of two channels (`dev` or `latest`), based on which was used during installation.
