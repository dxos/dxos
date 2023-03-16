# @dxos/bot-lab


## Running bots locally

1. Make sure you have `kube version` >= `1.17.6-dev`.
2. Enable bots in config (ask @egor).
3. Configure kai `dxos.services.bot.proxy` to `http://kube.local/.well-known/dx/bot` (must be http).
4. Build bot with `pnpm run build:local` (in `bot-lab`).

## Running bots on a hosted KUBE

1. Login to github container registry: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
  - Create a personal access token with `read:packages`, `write:packages`, and `delete:packages` permissions.
  - `export CR_PAT=YOUR_TOKEN`
  - `echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin`
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
