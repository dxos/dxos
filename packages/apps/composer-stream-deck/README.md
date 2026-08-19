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

The Elgato CLI links the assembled directory into Stream Deck's plugin folder and restarts the
plugin, so the dev loop is `assemble` then `restart`:

```bash
npm install -g @elgato/cli@latest
streamdeck link packages/apps/composer-stream-deck/org.dxos.composer.sdPlugin
streamdeck restart org.dxos.composer
```

Then drag **Composer → Favorite** onto keys and **Composer → Monitor** onto dials. Slots are
assigned by position, so the top-left Favorite key is favorite 1.

## Protocol

The wire format is owned by the Composer side and imported from
`@dxos/plugin-stream-deck/Protocol` — a React-free module, so nothing from the app bundle is pulled
into this one.
