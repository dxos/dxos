# @dxos/isomorphic-worker

Native cross-platform Web Workers. Works in Node.js and Browser.

In Node, it's a web-compatible Worker implementation atop Node's `worker_threads`.
In the browser (and when bundled for the browser), it's simply an alias of `Worker`.

Inspired by the [web-worker](https://www.npmjs.com/package/web-worker) package.

## Features

- **Cross-platform**: Makes Worker code compatible across browser and Node.
- **No Global Mutation**: Unlike other polyfills, this does not mutate the global scope or change it in any way.
- **Unified API**: Exposes static methods on the `Worker` class for worker-to-main communication.
- **Native Events**: Uses DOM-style events (`Event.data`, `Event.type`, etc) and `EventTarget`.

## Installation

```bash
pnpm i @dxos/isomorphic-worker
```

## Usage

### Main Thread

```ts
import { Worker } from '@dxos/isomorphic-worker';

const worker = new Worker(new URL('./worker.js', import.meta.url));

worker.onmessage = (e) => {
  console.log('Received from worker:', e.data);
};

worker.postMessage('Hello Worker');
```

### Worker Thread

This package does not patch the global scope. Instead, use the static methods on the `Worker` class to communicate with the main thread.

```ts
import { Worker } from '@dxos/isomorphic-worker';

// Send a message to the main thread.
Worker.postMessage('Hello Main');

// Close the worker.
Worker.close();
```

## API

### `new Worker(url, options)`

Creates a new Worker.

- `url`: `string | URL` - The URL of the worker script.
- `options`: `WorkerOptions` - Optional worker options (same as standard `Worker` options).

### Instance Methods

The worker instance implements `EventTarget` and supports standard Worker methods:

- `postMessage(message, [transfer])`: Sends a message to the worker.
- `terminate()`: Terminates the worker.
- `addEventListener(type, listener)`: Listen for events (e.g., `message`, `error`).

### Static Methods (Worker Context)

These methods are intended to be used _inside_ the worker script to communicate with the parent.

- `Worker.postMessage(message, [transfer])`: Sends a message to the parent thread.
  - In Browser: Aliases `self.postMessage`.
  - In Node: Uses `parentPort.postMessage`.
- `Worker.close()`: Closes the worker.
  - In Browser: Aliases `self.close()`.
  - In Node: No-op (Node workers manage their own lifecycle or are terminated by parent).

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2022 © DXOS
