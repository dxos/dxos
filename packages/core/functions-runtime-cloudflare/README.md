# @dxos/functions-runtime-cloudflare

Functions Runtime for Cloudflare Workers.

## Overview

This package provides a runtime adapter for executing DXOS functions on Cloudflare Workers. It wraps user-defined function code and provides a standardized execution context with access to DXOS services.

### Key Responsibilities

- **Function Wrapping**: The `wrapHandlerForCloudflare` function wraps user code into a Cloudflare-compatible fetch handler, managing request parsing, error handling, and response formatting.
- **Service Bridging**: Provides protobuf-based service implementations (`DataService`, `QueryService`, `QueueService`) that bridge the edge environment services to the function context.
- **Context Creation**: Constructs a `FunctionProtocol.Context` with access to space metadata, document operations, and queue management.

### Architecture

```
User Function Code
       ↓
wrapHandlerForCloudflare()
       ↓
ServiceContainer (bridges edge bindings → protobuf services)
       ↓
FunctionProtocol.Context { dataService, queryService, queueService }
       ↓
Cloudflare Worker Ready Function Handler
```

The edge environment provides low-level service bindings (`EdgeFunctionEnv.DataService`, `EdgeFunctionEnv.QueueService`). This package adapts those bindings into protobuf-defined service interfaces that user functions can consume uniformly.

## Installation

```bash
pnpm i @dxos/functions-runtime-cloudflare
```

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2022 © DXOS
