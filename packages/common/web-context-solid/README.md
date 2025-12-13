# @dxos/web-context-solid

SolidJS implementation of the Web Component Context Protocol.

## Overview

This package allows SolidJS components to seamlessly participate in the [Web Component Context Protocol](https://github.com/webcomponents-cg/community-protocols/blob/main/proposals/context.md).

## Installation

```bash
npm install @dxos/web-context-solid @dxos/web-context
```

## Usage

### Providing Context

```tsx
import { createContext } from '@dxos/web-context';
import { ContextProtocolProvider } from '@dxos/web-context-solid';

const ThemeContext = createContext<{ color: string }>('theme');

const App = () => (
  <ContextProtocolProvider context={ThemeContext} value={{ color: 'blue' }}>
    <MyComponent />
  </ContextProtocolProvider>
);
```

### Consuming Context

```tsx
import { useWebComponentContext } from '@dxos/web-context-solid';

const MyComponent = () => {
  const theme = useWebComponentContext(ThemeContext, { subscribe: true });
  
  return <div style={{ color: theme()?.color }}>Hello World</div>;
};
```
