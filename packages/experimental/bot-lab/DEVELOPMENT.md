# Experimental Bot Lab

NOTE: Bots are rapidly evolving experimental features with limited documentation.

## Developing Bots

For development, we assume you will interact with bots from Kai running from a local Vite server.

To run bots locally you will need to install and run a local KUBE server, and install a local Docker machine (e.g., via. Docker Desktop).

1. Install the latest dev build of the KUBE server [following the bot development README](https://github.com/dxos/kube/blob/main/docs/bot_development.md).
2. Build the local bots bundle: `pnpm run build:local`
3. Open the settings panel in Kai (via the menu) and configure the bot proxy to point to your local KUBE:
   - Set `dxos.services.bot.proxy` to `http://kube.local/.well-known/dx/bot` (NOTE: This must use `http`).

NOTES
- The bots bundle includes an in-memory map of ALL bots from `@dxos/kai-bots`.
- Bots can be started via the Bots panel accessible from the Kai sidebar.
- Each bot instance will cause a new container to be instantiated using the latest Docker image.
- Rebuild the Docker image after making any changes to individual bots.
- Bots will automatically join the current Space, but will disconnect (and will not reconnect) after the Space is closed.
- Errors are not currently supported so rely on the Docker machine logs.

To check your KUBE is running, enter `kube status` and/or `curl http://localhost:9002/.well-known/dx/status`

## Running bots on Docker

See the [Digital Ocean Guide](https://github.com/dxos/kube/docs/guides/digitalocean.md).

```bash
doctl compute ssh bots.kube.dxos.org
docker ps
docker logs -f <BOT_CONTAINER_ID>
```

## Running bots on a hosted KUBE

The Github [Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
is used to store Docker images.

1. Create a Github "classic" personal access token with the following permissions: `read:packages`, `write:packages`, `delete:packages`.
2. Login to the registry.

```bash
export GITHUB_PAT=YOUR_TOKEN
echo $GITHUB_PAT | docker login ghcr.io -u USERNAME --password-stdin
```

3. Build and publish the image:

```bash
pnpm run build:remote
```

NOTE: Configure kai `dxos.services.bot.proxy` to point to the appropriate KUBE `https://bots.kube.dxos.org/.well-known/dx/bot` (must be https).

## Docker

TODO(burdon): Move to `@dxos/kube` docs.

Pull the latest image:

```bash
docker pull ghcr.io/dxos/bot:latest
```

To get the IP address of a Docker container:

```bash
hostname -I
docker inspect --format '{{ .NetworkSettings.IPAddress }}' protonmail-bridge
```

To get open ports on the host:

```bash
netstat -lntu
```

Inspect container config:

```bash
docker inspect protonmail-bridge
```

Remove stopped containers:

```bash
docker container ls -q -f "status=exited" | xargs -r docker rm
```