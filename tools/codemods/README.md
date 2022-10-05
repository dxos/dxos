# Codemods

Scripts for bulk code refactoring.

## Running codemods

```bash
# From "tools/codemods" directory:
./scripts/run.sh -t src/codemod.ts

# Lint changed packages.
px affected --target=lint --fix
```

> It is recommended that codemods are executed in clean git state (with no uncommitted changes)
> so that the changed files are easy to review.

## Updating imports

Command:

```bash
 ./scripts/run.sh -t src/imports.ts --replace=@dxos/async#Event:@dxos/foo 
```

Before:

```typescript
import { Event, until } from '@dxos/async';
```

After:

```typescript
import { until } from '@dxos/async';
import { Event } from '@dxos/foo';
```