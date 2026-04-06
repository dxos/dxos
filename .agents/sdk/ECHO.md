# ECHO SDK

- Use barrels import/exports for ECHO types; example:

```ts
// `types` directory
export * as Obj from './Obj';

// usage
import { Obj } from '../types';
const x = Obj.make();
```
