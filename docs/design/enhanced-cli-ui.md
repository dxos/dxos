# Enhanced CLI UI Design

## Overview

This document outlines the design for enhancing the DXOS CLI with a modern terminal UI inspired by OpenCode CLI, featuring colored output, fixed input at the bottom, and scrolling output above.

## OpenCode CLI Analysis

### Architecture

OpenCode uses a custom-built terminal UI framework called `@opentui` which provides:

- **Component-based architecture** using SolidJS
- **Flexbox-like layouts** for positioning
- **Reactive state management** with signals
- **Custom rendering engine** for performance
- **60 FPS rendering** with optimized updates

### Key Libraries

```json
{
  "@opentui/core": "0.1.54", // Custom TUI framework core
  "@opentui/solid": "0.1.54", // SolidJS bindings for TUI
  "solid-js": "1.9.10", // Reactive framework
  "yargs": "18.0.0", // CLI argument parsing
  "strip-ansi": "7.1.2", // ANSI code handling
  "clipboardy": "4.0.0", // Clipboard access
  "diff": "8.0.2" // Diff generation
}
```

### UI Structure

```
┌─────────────────────────────────────┐
│  Output Area (Scrollable)          │
│  ┌─────────────────────────────┐   │
│  │ Message 1                   │   │
│  │ Message 2                   │   │
│  │ Message 3                   │   │
│  │ ...                         │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  Input Area (Fixed at bottom)      │
│  > Multi-line input with cursor_   │
└─────────────────────────────────────┘
```

## Recommended Approach for DXOS

### Option 1: Ink (React for Terminal) - **RECOMMENDED**

**Pros:**

- Mature, well-maintained library (20k+ stars)
- React-based component model (familiar to team)
- Good documentation and ecosystem
- TypeScript support
- Used by many popular CLIs (Gatsby, Parcel, etc.)

**Cons:**

- React dependency (adds bundle size)
- Not as performant as custom solutions

**Dependencies:**

```json
{
  "ink": "^5.2.1",
  "react": "^19.0.0",
  "chalk": "^5.3.0",
  "ink-text-input": "^6.0.0",
  "ink-spinner": "^5.0.0",
  "ink-select-input": "^6.0.0"
}
```

### Option 2: Blessed - ncurses-like

**Pros:**

- Powerful ncurses-like API
- No framework dependencies
- Highly customizable

**Cons:**

- Lower-level API (more code to write)
- Less active maintenance
- Steeper learning curve

### Option 3: Custom with @opentui

**Pros:**

- Most flexible
- Best performance
- Full control

**Cons:**

- Significant development effort
- Need to maintain custom framework
- Learning curve for SolidJS

## Minimal Viable Implementation

### Architecture

```
packages/devtools/cli-tui/
├── src/
│   ├── index.tsx              # Main app component
│   ├── components/
│   │   ├── Chat.tsx           # Chat interface with scrolling
│   │   ├── Input.tsx          # Multi-line input component
│   │   ├── Message.tsx        # Message display component
│   │   └── StatusBar.tsx      # Status bar at top
│   ├── hooks/
│   │   ├── useMessages.ts     # Message state management
│   │   └── useKeyboard.ts     # Keyboard shortcuts
│   └── theme.ts               # Color theme system
└── package.json
```

### Core Components

#### 1. Main App Component

```tsx
import React from 'react';
import { Box, render } from 'ink';
import { Chat } from './components/Chat';
import { StatusBar } from './components/StatusBar';

const App = () => {
  return (
    <Box flexDirection='column' height='100%'>
      <StatusBar />
      <Chat />
    </Box>
  );
};

render(<App />);
```

#### 2. Chat Component (Scrolling Output + Fixed Input)

```tsx
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Message } from './Message';
import { Input } from './Input';

export const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0);

  return (
    <Box flexDirection='column' flexGrow={1}>
      {/* Scrolling output area */}
      <Box flexDirection='column' flexGrow={1} overflow='hidden'>
        {messages.map((msg, i) => (
          <Message key={i} message={msg} />
        ))}
      </Box>

      {/* Fixed input at bottom */}
      <Box flexShrink={0} borderStyle='single' borderTop>
        <Input
          onSubmit={(text) => {
            // Handle message submission
          }}
        />
      </Box>
    </Box>
  );
};
```

#### 3. Multi-line Input Component

```tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export const Input = ({ onSubmit }) => {
  const [value, setValue] = useState('');
  const [lines, setLines] = useState(['']);
  const [cursorLine, setCursorLine] = useState(0);
  const [cursorCol, setCursorCol] = useState(0);

  useInput((input, key) => {
    if (key.return && !key.shift) {
      // Submit on Enter
      onSubmit(value);
      setValue('');
      setLines(['']);
      setCursorLine(0);
      setCursorCol(0);
    } else if (key.return && key.shift) {
      // New line on Shift+Enter
      const newLines = [...lines];
      newLines.splice(cursorLine + 1, 0, '');
      setLines(newLines);
      setCursorLine(cursorLine + 1);
      setCursorCol(0);
    } else if (key.backspace) {
      // Handle backspace
    } else {
      // Add character
      const newLines = [...lines];
      newLines[cursorLine] = newLines[cursorLine].slice(0, cursorCol) + input + newLines[cursorLine].slice(cursorCol);
      setLines(newLines);
      setCursorCol(cursorCol + 1);
    }
  });

  return (
    <Box flexDirection='column'>
      {lines.map((line, i) => (
        <Box key={i}>
          <Text color='cyan'>{i === 0 ? '> ' : '... '}</Text>
          <Text>{line}</Text>
          {i === cursorLine && <Text>_</Text>}
        </Box>
      ))}
    </Box>
  );
};
```

#### 4. Theme System

```typescript
export const theme = {
  colors: {
    primary: '#00D9FF', // Cyan
    secondary: '#7B61FF', // Purple
    success: '#00FF88', // Green
    warning: '#FFD700', // Gold
    error: '#FF5555', // Red
    text: '#E6EDF3', // Light gray
    textDim: '#8B949E', // Dim gray
    background: '#0D1117', // Dark background
    border: '#30363D', // Border gray
  },

  // ANSI escape codes for non-Ink usage
  ansi: {
    reset: '\x1b[0m',
    dim: '\x1b[90m',
    bold: '\x1b[1m',
    cyan: '\x1b[96m',
    green: '\x1b[92m',
    red: '\x1b[91m',
    yellow: '\x1b[93m',
  },
};
```

### Integration with Existing CLI

The enhanced UI can be integrated as an optional mode:

```typescript
// packages/devtools/cli/src/commands/shell/index.ts
export default class Shell extends BaseCommand<typeof Shell> {
  static override flags = {
    ...BaseCommand.flags,
    ui: Flags.boolean({
      description: 'Use enhanced terminal UI',
      default: false,
    }),
  };

  async run(): Promise<void> {
    if (this.flags.ui) {
      // Launch Ink-based TUI
      const { startTUI } = await import('@dxos/cli-tui');
      await startTUI(this.client);
    } else {
      // Use existing simple REPL
      await this.startSimpleRepl();
    }
  }
}
```

## Key Features

### 1. Colored Output

```typescript
import chalk from 'chalk';

// Message types
console.log(chalk.cyan('Info:'), 'Connection established');
console.log(chalk.green('Success:'), 'Build completed');
console.log(chalk.red('Error:'), 'Failed to connect');
console.log(chalk.yellow('Warning:'), 'Deprecated API');
console.log(chalk.dim('Debug:'), 'Internal state');
```

### 2. Fixed Input at Bottom

- Use Ink's flexbox layout with `flexGrow` and `flexShrink`
- Output area: `flexGrow={1}` (fills available space)
- Input area: `flexShrink={0}` (stays fixed size)

### 3. Scrolling Output

- Automatically scroll to bottom on new messages
- Support for keyboard scrolling (PageUp/PageDown)
- Smooth scroll animations

### 4. Multi-line Input

- Enter: Submit message
- Shift+Enter: New line
- Escape: Clear input
- Up/Down: History navigation
- Tab: Auto-complete

### 5. Keyboard Shortcuts

- `Ctrl+C`: Exit
- `Ctrl+L`: Clear screen
- `Ctrl+K`: Clear input
- `Ctrl+U`: Clear line
- `/help`: Show help

## Implementation Plan

### Phase 1: Foundation (Week 1)

1. Create `@dxos/cli-tui` package
2. Setup Ink and TypeScript
3. Implement basic layout (fixed input + scrolling output)
4. Add colored output with theme system

### Phase 2: Input Enhancement (Week 2)

1. Implement multi-line input component
2. Add cursor management
3. Add history navigation
4. Add auto-complete support

### Phase 3: Integration (Week 3)

1. Integrate with existing CLI commands
2. Add feature flag for TUI mode
3. Add keyboard shortcuts
4. Add status bar and notifications

### Phase 4: Polish (Week 4)

1. Performance optimization
2. Error handling
3. Documentation
4. Testing

## Dependencies

```json
{
  "dependencies": {
    "ink": "^5.2.1",
    "react": "^19.0.0",
    "chalk": "^5.3.0",
    "ink-text-input": "^6.0.0",
    "ink-spinner": "^5.0.0",
    "strip-ansi": "^7.1.2",
    "ansi-escapes": "^7.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "ink-testing-library": "^4.0.0"
  }
}
```

## Testing Strategy

1. **Unit tests**: Test individual components with `ink-testing-library`
2. **Integration tests**: Test input/output flow
3. **Manual testing**: Test in different terminals (iTerm, Terminal.app, Windows Terminal)

## Future Enhancements

1. **Rich formatting**: Code highlighting, tables, diffs
2. **Interactive elements**: Buttons, checkboxes, progress bars
3. **Split panes**: Multiple views side-by-side
4. **File browser**: Navigate filesystem in TUI
5. **Git integration**: Show diffs, commits in TUI
6. **Mouse support**: Click to select, scroll with mouse

## Alternatives Considered

### Blessed

- More low-level than Ink
- Requires more code for basic features
- Less active maintenance

### Bubbletea (Go)

- Would require Go dependency
- Not TypeScript/JavaScript native
- Better performance but harder integration

### Custom with @opentui

- Most flexible but requires building/maintaining framework
- Significant development effort
- Not recommended for MVP

## Conclusion

**Recommendation: Use Ink for minimal viable implementation**

Ink provides the best balance of:

- Developer experience (React components)
- Time to market (mature library)
- Maintainability (good documentation)
- Features (ecosystem of components)

This approach allows us to deliver a polished terminal UI quickly while keeping the door open for future enhancements or even a custom solution if needed.
