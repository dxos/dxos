# @dxos/cli-tui

Enhanced terminal UI for DXOS CLI, inspired by OpenCode CLI.

## Features

- 🎨 **Colored Output** - Beautiful, themed terminal output
- 📝 **Multi-line Input** - Enter to send, Shift+Enter for new lines
- 📜 **Scrolling Output** - Messages scroll above with fixed input at bottom
- ⌨️ **Keyboard Shortcuts** - Full keyboard navigation
- 🎯 **React Components** - Built with Ink (React for terminals)

## Installation

```bash
pnpm add @dxos/cli-tui
```

## Usage

### Basic Example

```tsx
import React from 'react';
import { render } from 'ink';
import { App } from '@dxos/cli-tui';

const handleCommand = async (command: string) => {
  console.log(`Executing: ${command}`);
  // Your command logic here
};

render(<App onCommand={handleCommand} title='My CLI' />);
```

### Custom Components

```tsx
import { Chat, StatusBar, Message, Input } from '@dxos/cli-tui';

// Use individual components
<StatusBar title="DXOS" status="active" statusText="Connected" />
<Chat onCommand={handleCommand} />
```

### Theme Customization

```typescript
import { theme, colorize } from '@dxos/cli-tui';

// Use theme colors
console.log(colorize.success('Build completed!'));
console.log(colorize.error('Connection failed'));
console.log(colorize.info('Processing...'));
```

## Components

### App

Main application component with status bar and chat interface.

**Props:**

- `onCommand: (command: string) => Promise<void>` - Command handler
- `title?: string` - Application title (default: "DXOS CLI")

### Chat

Chat interface with scrolling messages and fixed input.

**Props:**

- `onCommand: (command: string) => Promise<void>` - Command handler

### Input

Multi-line input component.

**Props:**

- `onSubmit: (value: string) => void` - Submit handler
- `placeholder?: string` - Placeholder text
- `disabled?: boolean` - Disable input

### Message

Message display component.

**Props:**

- `message: Message` - Message object with role, content, timestamp

### StatusBar

Status bar component.

**Props:**

- `title?: string` - Title text
- `status?: 'idle' | 'active' | 'error'` - Status indicator
- `statusText?: string` - Status text

## Keyboard Shortcuts

### Input

- `Enter` - Submit message
- `Shift+Enter` - New line
- `Escape` - Clear input
- `Up/Down` - Navigate lines
- `Left/Right` - Move cursor
- `Home/End` - Jump to start/end of line
- `Ctrl+A` - Jump to start of line
- `Ctrl+E` - Jump to end of line

## Development

### Run Demo

**Basic Demo:**

```bash
cd packages/devtools/cli-tui
pnpm tsx src/examples/demo.tsx
```

**Ollama Integration Demo:**

Requires Ollama server running on `localhost:11434`:

```bash
# Install Ollama: https://ollama.ai
# Start server
ollama serve

# Pull a model
ollama pull llama3.2

# Run demo
pnpm tsx src/examples/ollama-demo.tsx
```

The Ollama demo streams responses from the Ollama API in real-time, demonstrating how to integrate LLM responses into the TUI.

### Build

```bash
moon run cli-tui:build
```

### Test

```bash
moon run cli-tui:test
```

## Architecture

The TUI is built with:

- **Ink** - React for terminal UIs
- **React** - Component-based UI
- **Chalk** - Terminal colors
- **TypeScript** - Type safety

### Anti-Flicker Optimizations

To prevent display flickering during typing and streaming updates, the TUI implements several key optimizations:

1. **Component Memoization**
   - All components wrapped with `React.memo()` to prevent unnecessary re-renders
   - Input component fully isolated to prevent parent component updates on keystroke

2. **Callback Memoization**
   - All callbacks wrapped with `useCallback()` to maintain referential equality
   - Prevents child components from re-rendering when parent re-renders

3. **Layout Memoization**
   - Height calculations wrapped with `useMemo()` with terminal dimensions as dependency
   - Prevents layout recalculation on every render

4. **Throttled Streaming Updates**
   - Ollama responses throttled to 50ms intervals (20 updates/second max)
   - Reduces render frequency during high-volume streaming

5. **Fixed Layout Heights with Smart Scrolling**
   - Message area has fixed calculated height based on terminal dimensions
   - Input stays at fixed position without layout shifts
   - Automatic scrolling shows most recent messages that fit in viewport
   - Intelligently estimates line wrapping based on terminal width
   - Shows indicator when older messages are hidden

6. **Minimal Re-renders**
   - Only the specific message being updated re-renders during streaming
   - Other messages remain unchanged thanks to memoization

Layout structure:

```
┌─────────────────────────────────────┐
│  StatusBar (fixed at top)          │
├─────────────────────────────────────┤
│  Output Area (scrollable)          │
│  • Message 1                       │
│  • Message 2                       │
│  • Message 3                       │
│  ...                               │
├─────────────────────────────────────┤
│  Input Area (fixed at bottom)      │
│  ❯ Type here...                    │
└─────────────────────────────────────┘
```

## Inspiration

This implementation is inspired by [OpenCode CLI](https://github.com/sst/opencode), which uses a custom TUI framework built on SolidJS. We chose Ink for better ecosystem support and easier maintenance.

## Documentation

- [ANTI_FLICKER_GUIDE.md](./ANTI_FLICKER_GUIDE.md) - Comprehensive guide to anti-flicker optimizations
- [SCROLLING.md](./SCROLLING.md) - Detailed explanation of scrolling implementation

## License

MIT
