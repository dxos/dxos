# @dxos/functions

Functions SDK.


## Writing functions

- Create a manifest file at package root:

```yaml
# <my package>/functions.yml

functions:
  chess: # function name - must match the function executable filename
    description: Play chess with AI.

# trigger conditions (not implemented yet)
triggers:
  - function: chess
    # spaceKey: f1ed03
    subscription:
      type: dxos.org/type/Chess

```

- Write function implementation at `src/functions/<name>.ts`:

```ts
// <my package>/src/functions/chess.ts

import { FunctionContext } from '@dxos/functions';

export default (event: any, context: FunctionContext) => {
  const identity = context.client.halo.identity.get();
  return context.status(200).succeed({ message: `Hello, ${identity?.profile?.displayName}` });
};
```

## Running functions with dev agent

1. Configure agent to run functions dev server:

```bash
code ~/.config/dx/profile/default.yml # or specify another profile
```

Expose functions port:

```yaml
runtime:
  agent:
    functions:
      port: 7001
```

2. Load dev functions:

```bash
# Run in your functions package:
dx function dev -r ts-node/register
```

`-r ts-node/register` configures the runtime support TypesScript natively.

### Live reload on change

- Install nodemon: `npm i -g nodemon`
- Wrap dev runtime in nodemon:

> NOTE: Nodemon does not support bash aliases, a binary in `$PATH` or a full path to one is required:

```bash
nodemon -w src -e ts --exec /Users/dmaretskyi/Projects/protocols/packages/devtools/cli/bin/dev function dev -r ts-node/register
```

## Invoking functions


> NOTE: The port (7001) must match the one in config.

```bash
curl --data '{ "foo": "bar" }' -H 'Content-Type: application/json' -i -X POST http://localhost:7001/dev/chess
```

## Class Diagrams
