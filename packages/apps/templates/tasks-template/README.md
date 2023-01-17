# @dxos/tasks-template

An application template demonstrating a working Task List using the ECHO database

## Installation

```bash
pnpm i @dxos/tasks-template
```

## Usage

This is an encapsulated [`@dxos/plate`](https://www.npmjs.com/package/@dxos/plate) template, the default export is a `ConfigurationDeclaration` from `plate`.

```ts
import template from "@dxos/tasks-template";

const results = await template.execute({
  /* ExecuteDirectoryOptions */
});
Promise.all(results.map((file) => file.save()));
```

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Tag [questions on Stack Overflow](https://stackoverflow.com/questions/tagged/dxos) with `#dxos`
- Tag us on twitter [`@dxos_org`](https://twitter.com/dxos_org)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2022 © DXOS
