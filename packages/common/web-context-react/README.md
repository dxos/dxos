# @dxos/web-context-react

React implementation of the Web Component Context Protocol.

## Overview

This package allows React components to seamlessly participate in the [Web Component Context Protocol](https://github.com/webcomponents-cg/community-protocols/blob/main/proposals/context.md), enabling context sharing between React, Web Components, and other frameworks.

## Installation

```bash
npm install @dxos/web-context-react @dxos/web-context
```

## Usage

### Providing Context

Wrap your component tree with `ContextProtocolProvider`. This handles both React context requests (from descendants in the same tree) and DOM context requests (from Web Components).

```tsx
import { createContext } from '@dxos/web-context';
import { ContextProtocolProvider } from '@dxos/web-context-react';

const ThemeContext = createContext<{ color: string }>('theme');

const App = () => (
  <ContextProtocolProvider context={ThemeContext} value={{ color: 'blue' }}>
    <MyComponent />
  </ContextProtocolProvider>
);
```

### Consuming Context

Use the `useWebComponentContext` hook to consume context. It first checks for a React provider, and falls back to dispatching a `context-request` DOM event.

```tsx
import { useWebComponentContext } from '@dxos/web-context-react';

const MyComponent = () => {
  const theme = useWebComponentContext(ThemeContext, { subscribe: true });
  
  return <div style={{ color: theme?.color }}>Hello World</div>;
};
```
