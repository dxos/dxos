---
position: 4
---
# Auto update
By default KUBE is configured to check and perform automatic updates to itself.

To configure this feature:

```bash
kube config autoupdate.enabled true
kube config autoupdate.interval 600 # How often to check for updates, in seconds.
sudo kube restart
```

The update is happening from one of 2 channels (`dev` or `latest`), based on which channel was used during installation.

Binaries are disributed from cloud object storage behind a CDN.
