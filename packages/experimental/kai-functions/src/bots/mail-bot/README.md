# Mail Bot

The [Protonmail Bridge](https://proton.me/mail/bridge) is a local IMAP server that connects securely to the Protonmail servers.
This allows local clients (and bots) to connect to the local IMAP server using SSL (or StartTLS) connections.

This guide demonstrates how to install and configure the Protonmail Bridge Docker container on a KUBE VM.

Completion time: 20 mins.


## Deploying the Protonmail Docker Bridge

To deploy the [shenxn/protonmail-bridge](https://hub.docker.com/r/shenxn/protonmail-bridge) Docker container,
first open the Digital Ocean [bots.kube.dxos.org](https://cloud.digitalocean.com/droplets/343613259) Droplet Console.

Run the Protonmail Bridge's configuration command:

```bash
docker run --rm -it -v protonmail:/root shenxn/protonmail-bridge init
```

Change the access settings (from STARTTLS to SSL):

```bash
>>> ch ssl-imap
>>> ch ssl-smtp
```

TODO(burdon): Verify that the NodeJS `imap-simple` package can only use SSL.

Next, start the container:

```bash
docker run -d --name=protonmail-bridge -v protonmail:/root \
  -p 127.0.0.1:1025:25/tcp -p 127.0.0.1:1143:143/tcp \
  --restart=unless-stopped \
  shenxn/protonmail-bridge
```

> NOTE: This exposes IMAP and SMTP ports to the host for testing. However, we should remove this in a production setting.

Bot containers configure direct connections to the Protonmail Bridge container's IP address (via `HostConfig.Links`)
and use the container's internal port (e.g., `143`).


## Adding Protonmail User Accounts

1. Open the [bots.kube.dxos.org](https://cloud.digitalocean.com/droplets/343613259) Droplet Console.
2. Stop the Protonmail Docker container.

```bash
docker container stop protonmail-bridge
```

3. Run the configuration command.

```bash
docker run --rm -it -v protonmail:/root shenxn/protonmail-bridge init
```

4. Login using your Protonmail credentials and get the IMAP password using the prompts:

```bash
>>> login
>>> info
>>> exit
```

5. Restart the container:

```bash
docker container restart protonmail-bridge
docker ps
```

6. Configure the client (e.g., Kai) with your username and IMAP password, then launch the bot.


## Testing the IMAP server

Test the IMAP server [directly](https://www.bram.us/2020/01/16/test-an-imap-connection-with-curl):

```bash
curl -k -v imaps://USERNAME:PASSWORD@127.0.0.1:1143/INBOX?NEW
```

Note:
- Use `urlencode` to encode the username (e.g., `rich%40dxos.org`).
- Use `-k` to skip the CA check.


## Local Development and Testing with Docker Desktop

Install [Docker Desktop](https://www.docker.com/products/docker-desktop) and the [Protonmail Bridge Desktop App](https://proton.me/mail/bridge). 

Set the following environment variables to run local tests and bots.

```bash
COM_PROTONMAIL_HOST=host.docker.internal
COM_PROTONMAIL_USERNAME=username@dxos.org 
COM_PROTONMAIL_PASSWORD=xxx
```
