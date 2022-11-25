# @dxos/test

## Installation

```bash
pnpm i @dxos/test
```

## Usage

```ts
import { describe, test } from '@dxos/test';

describe('Class', () => {
  test('example', () => {
    // test
  })
    .timeout(10_000) // Set test-specific timeout.
    .retries(3) // Set test-specific retry count.
    .tag('e2e', 'fuzz') // Tag test to differentiate test streams.
    .onlyEnvironments('nodejs') // Only run test in these environments.
    .skipEnvironments('webkit', 'firefox') // Skip running test in these environments.
});
```

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Tag [questions on Stack Overflow](https://stackoverflow.com/questions/tagged/dxos) with `#dxos`
- Tag us on twitter [`@dxos_org`](https://twitter.com/dxos_org)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs). If you would like to contribute to the design and implementation of DXOS, please [start with the contributor's guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md).

License: [MIT](./LICENSE) Copyright 2022 © DXOS
