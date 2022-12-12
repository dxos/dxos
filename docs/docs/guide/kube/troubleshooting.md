---
order: 10
---

# Troubleshooting

In a rear case of breaking changes it might be required to manually remove KUBE from system services.

In order to do that use `sudo kube uninstall` command. If manual removal is required, a combination of commands could be used:

Darwin:

```bash
sudo kube stop
sudo rm /Library/LaunchDaemons/kube.plist
```

Linux:

```bash
sudo kube stop
service=kube.service;
sudo systemctl stop $service
sudo systemctl disable $service
sudo rm /etc/systemd/system/$service
sudo systemctl daemon-reload
sudo systemctl reset-failed
```

To run the daemon with logging:

```bash
GOLOG_LOG_LEVEL=warn,signal/p2p=debug kube daemon
```