---
order: 2
---

# Commands

To list all commands:

```bash
kube --help
```

To start daemon process as a system service:

```bash
sudo kube start
```

To stop daemon process previously started as a system service:

```bash
sudo kube stop
```

To start the KUBE process in the foreground:

```bash
kube daemon
```

## Logs

On Darwin:

```bash
sudo tail -f /usr/local/var/log/kube.out.log /usr/local/var/log/kube.err.log
```

On Linux:

```bash
systemctl status kube.service -n100
```

## Status

To display the current status:

```bash
kube status --json
```

## Updates

To update to the latest available version:

```bash
sudo kube update
```

## Configuration

To display the current configuration:

```bash
kube config --json
```

Examples of updating configuration:

```bash
kube config host newkube.local # set a different hostname
kube config port 9005 # set a different port
sudo kube restart
```

# Uninstall

```bash
sudo kube uninstall
```
