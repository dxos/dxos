# @dxos/plugin-stream-deck

Projects a Composer space onto Stream Deck hardware.

- **Keys** — the space's favorites (objects carrying the `favorite` ECHO tag): icon + name, press to open.
- **Dials** — progress monitors while any task is running, space stats otherwise.

The device itself is driven by a separate Elgato plugin (`.sdPlugin`), because Elgato's application
holds the HID device exclusively while it runs. This plugin is the brain: it builds the model from
ECHO, renders every key as an SVG string, and pushes frames over a loopback WebSocket. See
[the design](../../../agents/superpowers/specs/2026-08-19-stream-deck-design.md).
