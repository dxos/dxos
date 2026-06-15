# DXOS VSCode Extension

A VSCode extension for DXOS development.

## Features

- **Hello World Command**: A basic command to test the extension functionality

## Requirements

- VSCode 1.74.0 or higher
- Node.js 16.x or higher

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Compile TypeScript
pnpm run compile
```

### Running the Extension

1. Open this folder in VSCode
2. Launch the extension using one of these methods:
   - Use Command Palette (`Cmd+Shift+P`) → "Debug: Start Debugging" → Select "Run Extension"
   - Open Debug view (`Cmd+Shift+D`) → Select "Run Extension" → Click the green play button
3. Run the command `DXOS: Hello World` from the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)

### Building

```bash
# Compile the extension
pnpm run compile

# Watch for changes
pnpm run watch
```

## Extension Settings

This extension currently has no configurable settings.

## Known Issues

None at this time.

## Release Notes

### 0.1.0

Initial release with basic Hello World command.
