---
order: 2
---
# Commands

To list all commands:

```bash
kube --help
```

To start the daemon process in the foreground:

```bash
kube daemon
```

To start daemon process as a system service:

```bash
sudo kube start
```

To stop daemon process previously started as a system service:

```bash
sudo kube stop
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

To update config:

```bash
kube config autoupdate.enabled true
kube config autoupdate.interval 600 # seconds
kube config host newkube.local # set a different hostname
kube config port 9005
sudo kube restart
```
## Telemetry

To disable telemetry:

```bash
kube config telemetry.disabled true
sudo kube restart
```

## HTTPS

To enable HTTPS (public KUBEs):

- Generate certificate, e.g.:

```bash
sudo apt-get install certbot

certbot certonly -d *.exampledomain.com -d exampledomain.com --preferred-challenges dns-01 --server https://acme-v02.api.letsencrypt.org/directory --manual
```

- Setup DNS - add suggested TXT record;

- After cert is generated, setup KUBE:

```bash
kube config host exampledomain.com
kube config https.enabled true
kube config https.port 443
kube config https.certfile /etc/letsencrypt/live/exampledomain.com/fullchain.pem
kube config https.keyfile /etc/letsencrypt/live/exampledomain.com/privkey.pem
sudo kube restart
```
- Setup DNS record to point domain name to KUBE server

# Uninstall

```bash
sudo kube uninstall
```