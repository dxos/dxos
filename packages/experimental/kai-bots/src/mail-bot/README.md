# Mail Bot

The [Protonmail Bridge](https://proton.me/mail/bridge) is a local IMAP server that connects securely to the Protonmail servers.
This allows local clients (and bots) to connect to the local IMAP server using SSL (or StartTLS) connections.

This guide demonstrates how to install and configure the Protonmail Bridge Docker container on a KUBE. 

Completion time: 20 mins.


## Deploying the Protonmail Docker Bridge

Deploy the [shenxn/protonmail-bridge](https://hub.docker.com/r/shenxn/protonmail-bridge) Docker container.

Open the Digital Ocean [bots.kube.dxos.org](https://cloud.digitalocean.com/droplets/343613259) Droplet Console.

Start the configuration process:

```bash
docker run --rm -it -v protonmail:/root shenxn/protonmail-bridge init
```

Change the access settings (from STARTTLS to SSL):

```bash
>>> ch ssl-imap
>>> ch ssl-smtp
```

Then, start the container:

```bash
docker run -d --name=protonmail-bridge -v protonmail:/root \
  -p 127.0.0.1:1025:25/tcp -p 127.0.0.1:1143:143/tcp \
  --restart=unless-stopped \
  shenxn/protonmail-bridge
```

NOTE: This command exposes IMAP and SMTP ports to the host for testing,
however, bot containers should configure direct connections to the bridge container's IP address (using `HostConfig.Links`) 
and use the internal port (e.g., `143`).


## Adding Protonmail User Accounts

1. SSH to the Droplet.
2. Stop the Protonmail Docker container.

```bash
docker container stop protonmail-bridge
```

3. Run the configuration process.

```bash
docker run --rm -it -v protonmail:/root shenxn/protonmail-bridge init
```

4. Login using your Protonmail credentials and get the IMAP password (then CTRL-C to exit):

```bash
>>> login
>>> info
```

5. Restart the container:

```bash
docker container restart protonmail-bridge
```

6. Configure the client with your username and IMAP password and launch the bot.


## Testing the IMAP server

TEst the IMAP server directly using [curl](https://www.bram.us/2020/01/16/test-an-imap-connection-with-curl):

```bash
curl -k -v imaps://USERNAME:PASSWORD@127.0.0.1:1143/INBOX?NEW
```

Note:
- Use `urlencode` to encode the username (e.g., `rich%40dxos.org`).
- Use `-k` to skip the CA check.

## Local development and testing with Docker Desktop

Install the Protonmail Bridge desktop app (e.g., Mac OS/X). 

Set the following env variables:

```bash
COM_PROTONMAIL_HOST=host.docker.internal
COM_PROTONMAIL_USERNAME=username@dxos.org 
COM_PROTONMAIL_PASSWORD=xxx
```
