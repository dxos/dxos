# @dxos/display-name

Generate stable pseudononymous display names.

## Example

```ts
import { generateName } from '@dxos/display-name';

const key = PublicKey.random().toHex(); // "279995fb186677b8767e1febc4c2118174c1c985f373c9d33e1671d34481e9ee"
const name = generateName(key); // "Gentlest Piranha"
```
