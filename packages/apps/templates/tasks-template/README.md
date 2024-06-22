# @dxos/tasks-template

An application template for local-first progressive web apps

## Installation

```bash
pnpm i @dxos/tasks-template
```

## Usage

This is an encapsulated [`@dxos/plate`](https://www.npmjs.com/package/@dxos/plate) template, the default export is a `ConfigurationDeclaration` from `plate`.

```ts
import template from "@dxos/tasks-template";

// get the template outputs without writing to disk:
const results = await template.apply({
  /* ExecuteDirectoryOptions */
  input: { ... }
});
// write to disk:
await results.apply()
```

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2022 © DXOS
