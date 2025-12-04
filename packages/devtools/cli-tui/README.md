# @dxos/cli-tui

Enhanced terminal UI for DXOS CLI with zero flickering.

## Features

- 🎨 **Colored Output** - Beautiful, themed terminal output
- 📝 **Multi-line Input** - Enter to send, Tab to switch focus
- 📜 **Scrolling Output** - Messages scroll above with fixed input at bottom
- ⌨️ **Keyboard Shortcuts** - Full keyboard navigation
- ⚡ **Zero Flickering** - Built with blessed for efficient terminal updates

## Installation

```bash
pnpm add @dxos/cli-tui
```

## Development

### Run CLI

```bash
cd packages/devtools/cli-tui
./bin/cli.sh

# Or run directly
npx tsx src/app/app.ts
```

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

- **blessed** - Efficient terminal UI library with smart cursor save/restore
- **TypeScript** - Type safety

### Why Blessed?

After extensive testing with Ink (React for terminals), we found that Ink's architecture causes unavoidable flickering on every state change because it clears and redraws the entire terminal output. Blessed solves this with:

1. **Smart CSR (Cursor Save/Restore)** - Only redraws changed regions
2. **Manual render control** - Explicit control over when updates happen
3. **Efficient ANSI escape sequences** - Minimal terminal operations

This results in **zero flickering** during typing, scrolling, or streaming updates.

### Layout Structure

```
┌─────────────────────────────────────┐
│  Status Bar (fixed at top)         │
├─────────────────────────────────────┤
│  Message Area (scrollable)         │
│  • Message 1                       │
│  • Message 2                       │
│  • Message 3                       │
│  ...                               │
├─────────────────────────────────────┤
│  Input Box (fixed at bottom)       │
│  ❯ Type here...                    │
└─────────────────────────────────────┘
```

## Keyboard Shortcuts

### Input Navigation

- `Ctrl+A` or `Home` - Jump to start of line
- `Ctrl+E` or `End` - Jump to end of line
- `Left/Right Arrow` - Move cursor
- `Backspace` - Delete character

### Chat Controls

- `Enter` - Submit message and send to Ollama
- `Shift+Enter` - Insert newline (for multi-line messages)
- `Tab` - Switch focus between message area and input
- `Page Up/Down` - Scroll messages (when message area focused)
- `Escape` or `Ctrl+C` - Quit

### Known Issue: Command+K on macOS

**Command+K** is a terminal emulator command that clears the screen at the OS level. It cannot be intercepted by applications.

**Solution:** Disable Command+K in your terminal:

- **iTerm2**: Preferences → Keys → Key Bindings → find "Clear Buffer" (⌘K) → delete
- **Terminal.app**: Preferences → Profiles → Keyboard → remove ⌘K binding

After disabling, simply start typing in the input box to restore the UI after any accidental clears.

## License

MIT
