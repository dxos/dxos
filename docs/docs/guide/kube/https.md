---
order: 5
---

# HTTPS

To enable HTTPS:

- Generate a certificate, e.g.:

```bash
sudo apt-get install certbot

certbot certonly -d *.exampledomain.com -d exampledomain.com --preferred-challenges dns-01 --server https://acme-v02.api.letsencrypt.org/directory --manual
```

- Set up DNS - add the suggested TXT record;

- After the cert is generated, set up KUBE:

```bash
kube config host exampledomain.com
kube config https.enabled true
kube config https.port 443
kube config https.certfile /etc/letsencrypt/live/exampledomain.com/fullchain.pem
kube config https.keyfile /etc/letsencrypt/live/exampledomain.com/privkey.pem
sudo kube restart
```

- Set up DNS record to point the domain `exampledomain.com` to the KUBE
