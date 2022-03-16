## React Async

### Configuration

Add the following to `package.json`.

```json
  "toolchain": {
    "forceCloseTests": true,
    "jsdom": true,
    "testingFramework": "mocha"
  }
```

The `react-dom/test-utils` requires the `raf` (React animation frame) polyfill to run headless.

```ts
import 'raf/polyfill';
import { act } from 'react-dom/test-utils';
```


### Next

Evaluate the following:

- https://www.npmjs.com/package/react-async-hook (popular)
- https://www.npmjs.com/package/use-enhanced-state
- https://www.npmjs.com/package/react-hooks-lib

Partial updates:

- https://github.com/kolodny/immutability-helper
