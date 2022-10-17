1. Imports of relative files now must have an extension. This is the extension of the compiled file - so it's always `.js`.

This is the case even for `tsx` files.
Importing directories is not allowed - you should append `/index.js` to the import.

Example:

```typescript
import { FullyConnectedTopology } from './topology/index.js';
```

2. Importing CommonJS (CJS) dependencies is allowed but might take some fiddling. It depends on how the package is configured. I suggest just trying different import styles and seeing what works (both for TS and runtime tests):

```typescript
import foo from 'foo';

import { default as foo } from 'foo';

import * as foo from 'foo';

import fooPkg from 'foo';
const { foo } = fooPkg;

import fooPkg from 'foo';
const { default: foo } = fooPkg;

// Adding a .js extension
import { act } from 'react-dom/test-utils.js';
// ... and sometimes a shim
declare module "react-dom/test-utils.js" {
  export * from "react-dom/test-utils";
}


console.log(foo) // To see what is being imported at runtime.
```


3. `__dirname` is now `new URL('.', import.meta.url).pathname`

4. For errors like

```
 import { Party, Client } from '@dxos/client';
          ^^^^^
SyntaxError: The requested module '@dxos/client' does not provide an export named 'Party'
```

try specifying import as type-only:

```typescript 
import { type Party, Client } from '@dxos/client';
```

5. To import json use import-assertions:

```typescript
import pkgJson from '../package.json' assert { type: 'json' };
const { name, version } = pkgJson;
```