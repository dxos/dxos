# ECHO SDK

- Use barrels import/exports for ECHO types:

```ts
// types directory
export * as Foo from './Foo';

// usage
import { Foo } from '../types';
const x = Foo.make();
```
