# @dxos/composer-stream-deck

The Elgato Stream Deck plugin that displays a Composer space on the hardware.

This is an **Elgato** plugin, not a Composer plugin: it is a Node process spawned by Elgato's
Stream Deck application, and it is installed through Elgato rather than Composer's plugin registry.
It lives in `packages/apps` for the same reason `composer-crx` does — it is a user-facing companion
distributed through a third-party marketplace.

Elgato's application claims the Stream Deck HID device exclusively while it runs, so Composer cannot
drive the device directly. This plugin owns the device and Composer owns the data: it runs a
loopback WebSocket **server** that Composer connects to, applies the frames Composer sends
(`setImage` per key, `setFeedback` per dial), and reports key and dial input back.

| | |
| --- | --- |
| Elgato plugin UUID | `org.dxos.composer` |
| Assembled directory | `org.dxos.composer.sdPlugin/` (build output, gitignored) |
| Distributable | `composer-stream-deck.streamDeckPlugin` |
| Actions | `org.dxos.composer.favorite` (Keypad), `org.dxos.composer.monitor` (Encoder) |

## Requirements

Node.js 24 or higher and Stream Deck 7.1 or higher, per the Elgato SDK.

## Build

```bash
moon run composer-stream-deck:assemble   # -> org.dxos.composer.sdPlugin/
moon run composer-stream-deck:pack       # -> composer-stream-deck.streamDeckPlugin
```

## Install for development

The Elgato CLI links the assembled directory into Stream Deck's plugin folder, so the dev loop is
`assemble` then link:

```bash
npm install -g @elgato/cli@latest
streamdeck link packages/apps/composer-stream-deck/org.dxos.composer.sdPlugin
```

**Restart the Stream Deck application itself the first time, not just the plugin.** The application
only scans for plugins at startup, so `streamdeck restart org.dxos.composer` on a *newly linked*
plugin is a silent no-op: the CLI reports success, the deep link is logged, and nothing launches.
Quit and reopen the app instead. Once it has been seen once, `streamdeck restart` is enough for
subsequent code changes.

Verify it is actually hosted before looking for pixels:

```bash
pgrep -fl org.dxos.composer     # Elgato spawns the plugin under its own bundled Node
nc -z 127.0.0.1 21435           # the bridge server this plugin listens on
```

### Placing the actions

Slots are positional — nothing renders until actions are placed, and an empty profile shows nothing
at all.

1. Drag **Composer → Favorite** onto keys. Slots are ordered by row, then column, so the top-left
   Favorite key is favorite 1.
2. **Click the touch strip in the Stream Deck app to reveal the encoder actions**, then drag
   **Composer → Monitor** onto a dial. `Monitor` declares `Controllers: ["Encoder"]`, so it does not
   appear in the action list while the key grid is selected — which reads as a missing action rather
   than a filtered one.

With the actions placed and Composer not running, every placed key and dial shows the dim
"Composer offline" state. That alone confirms the plugin is hosted and rendering.

## Protocol

The wire format is owned by the Composer side and imported from
`@dxos/plugin-stream-deck/Protocol` — a React-free module, so nothing from the app bundle is pulled
into this one.
