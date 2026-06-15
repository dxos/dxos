# @dxos/cli-util

Shared CLI utilities for DXOS CLI commands and plugins.

This package provides common utilities that can be used by both the CLI and CLI plugins:

- **CommandConfig**: Effect service for CLI command configuration (json, verbose, profile, logLevel)
- **Print utilities**: Functions for pretty-printing documents with ANSI colors
- **FormBuilder**: Builder for creating formatted form output

## Usage

```typescript
import { CommandConfig } from '@dxos/cli-util/services';
import { print, FormBuilder } from '@dxos/cli-util/util';
```
