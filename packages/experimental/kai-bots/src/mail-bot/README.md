# Bots

## Testing

- Configure Protonmail Bridge to use SSL (this isn't required).
- Export the Cert (PEM) file from the Bridge.
- Get the local password.

```bash
COM_PROTONMAIL_USERNAME=rich@dxos.org COM_PROTONMAIL_PASSWORD=xxx pc test
```

## Deployment

Deploy the [shenxn/protonmail-bridge](https://hub.docker.com/r/shenxn/protonmail-bridge) Docker container.

Open the Digital Ocean [bots.kube.dxos.org](https://cloud.digitalocean.com/droplets/343613259) Droplet Console.

Configure the bridge (NOTE: the container must be stopped).

```bash
docker run --rm -it -v protonmail:/root shenxn/protonmail-bridge init
```

Change the access settings (from STARTTLS to SSL):

```bash
ch ssl-imap
ch ssl-smtp
```

Type `login` to link a Protonmail account, then `info` to get the local IMAP server credentials, then CTRL-C to exit.

Then, start the container:

```bash
docker run -d --name=protonmail-bridge -v protonmail:/root -p 127.0.0.1:1025:25/tcp -p 127.0.0.1:1143:143/tcp \
  --restart=unless-stopped shenxn/protonmail-bridge
```
