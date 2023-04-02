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

1. Login to github container registry: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
  - Create a personal access token with `read:packages`, `write:packages`, and `delete:packages` permissions.
  - `export GITHUB_PAT=YOUR_TOKEN`
  - `echo $GITHUB_PAT | docker login ghcr.io -u USERNAME --password-stdin`
2. Configure kai `dxos.services.bot.proxy` to `https://bots.kube.dxos.org/.well-known/dx/bot` (must be https).
3. Build bot with `pnpm run build:remote` (in `bot-lab`).

## Installation

```bash
pnpm i @dxos/bot-lab
```

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Tag [questions on Stack Overflow](https://stackoverflow.com/questions/tagged/dxos) with `#dxos`
- Tag us on twitter [`@dxos_org`](https://twitter.com/dxos_org)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs). If you would like to contribute to the design and implementation of DXOS, please [start with the contributor's guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md).

License: [MIT](./LICENSE) Copyright 2022 © DXOS
