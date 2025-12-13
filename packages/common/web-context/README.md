# @dxos/web-context

Framework-agnostic definitions for the Web Component Context Protocol.

## Overview

This package provides the core types and event definitions for the [Web Component Context Protocol](https://github.com/webcomponents-cg/community-protocols/blob/main/proposals/context.md). It is intended to be used by framework-specific implementations (providers and consumers) to ensure interoperability.

## Installation

```bash
npm install @dxos/web-context
```

## Usage

### Context Definitions

```typescript
import { createContext } from '@dxos/web-context';

export const ThemeContext = createContext<{ color: string }>('theme');
```

### Requesting Context

```typescript
import { ContextRequestEvent } from '@dxos/web-context';

const event = new ContextRequestEvent(ThemeContext, (value, unsubscribe) => {
  console.log('Context value:', value);
  // Optional: unsubscribe()
}, { subscribe: true });

element.dispatchEvent(event);
```

### Providing Context

```typescript
import { ContextProviderEvent } from '@dxos/web-context';

element.addEventListener('context-request', (event) => {
  if (event.context === ThemeContext) {
    event.stopPropagation();
    event.callback({ color: 'blue' });
  }
});
```
