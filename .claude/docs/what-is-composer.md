# What is Composer

Composer (`packages/apps/composer-app`) is the flagship DXOS application — an extensible, collaborative IDE for knowledge management and AI-driven workflows.

## What it is

Composer is both a product and a reference implementation of what can be built with DXOS. It demonstrates:

- Building a real-time collaborative app on top of ECHO and HALO
- A plugin system for extending functionality
- AI-assisted workflows
- Cross-device sync with no backend

## Key Features

- **Modular plugin architecture** — functionality is delivered via plugins (`packages/plugins/`)
- **Real-time collaboration** — multiple users edit shared Spaces simultaneously
- **Async collaboration** — changes sync eventually even when peers are offline
- **AI integration** — `plugin-assistant` provides AI-driven workflows
- **Tauri shell** — ships as a native desktop app via Tauri (`src-tauri/`)

## Plugin Examples

| Plugin | Purpose |
|---|---|
| `plugin-assistant` | AI assistant integration |
| `plugin-markdown` | Markdown document editing |
| `plugin-sketch` | Drawing and sketching |
| `plugin-attention` | Focus and attention management |

## Running Composer

```bash
moon run composer-app:serve
```

This starts the Vite dev server. The app is at `http://localhost:5173` by default.

## Package Location

```
packages/apps/composer-app/
  src/             # React application
  src-tauri/       # Native desktop shell (Tauri)
  public/          # Static assets
  vite.config.ts   # Build config
```

## Public URL

Production: https://composer.space
