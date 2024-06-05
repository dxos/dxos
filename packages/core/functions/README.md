# @dxos/functions

Functions SDK.

## Installation

```bash
pnpm i @dxos/functions
```

## Writing functions

Create a manifest file at the package root:

```yaml
functions:
  hello:
    description: Test function.
```

> NOTE: The function name must match the filename (e.g., `src/functions/hello.ts`).

Create an example function:

```ts
import { FunctionContext } from '@dxos/functions';

export default (event: any, context: FunctionContext) => {
  const identity = context.client.halo.identity.get();
  return context
    .status(200)
    .succeed({ 
      message: `Hello ${identity?.profile?.displayName}` 
    });
};
```

## Running functions with the dev server:

Configure the agent to run functions on a given port:

```yaml
# ~/.config/dx/profile/default.yml
runtime:
  agent:
    functions:
      port: 7001
```

Start functions in dev mode (from the related package):

```bash
dx function dev -r ts-node/register --verbose
```

> NOTE: `-r ts-node/register` configures native TypesScript support.

Install `nodemon` to support live reloading:

```bash
npm i -g nodemon

nodemon -w ./src -e ts --exec $(git rev-parse --show-toplevel)/packages/devtools/cli/bin/dev \
  function dev -r ts-node/register --verbose
```

## Invoking functions

> NOTE: The port (7001) must match the one in config.

```bash
curl http://localhost:7001/dev/hello -X POST -H 'Content-Type: application/json' -w '\n' --data '{ "message": "Hello World!" }' 
```

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2022 © DXOS
