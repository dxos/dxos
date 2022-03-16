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
