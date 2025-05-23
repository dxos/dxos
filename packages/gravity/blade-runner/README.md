
# @dxos/blade-runner

Blade Runner.

## Prerequisites

- Install Playwright
```bash
pnpm exec playwright install
```

- Run redis
```bash
brew install redis
redis-server --port 6379
```

## Simple Usage
```bash
pnpm run-tests <testname>
```

tests currently include:

* `signal`
* `transport`
* `echo`
* `replication`

For additional usage, `pnpm run-tests --help`

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2022 © DXOS
