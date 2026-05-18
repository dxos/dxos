//
// Copyright 2026 DXOS.org
//

// Worker entry: never references `import.meta.hot` so Vite does not inject the main-thread
// HMR client (which assumes `window` / `document`). Logs are forwarded over the HTTP sink.

import { httpTransport, installRuntime } from './runtime-core.ts';

installRuntime(httpTransport);
