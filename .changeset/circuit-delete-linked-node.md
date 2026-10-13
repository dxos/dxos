---
'@dxos/react-ui': patch
---

Conductor circuits, the canvas, markdown links and mermaid diagrams.

- **Circuits:** deleting a linked node no longer crashes the plank, and a circuit left half-deleted by that crash opens again (a shape whose compute node is gone shows its type as a placeholder and can still be deleted). Adding a node no longer logs `No compute function for node type: switch` and resets the switches: the circuit keeps one graph controller instead of building one per edit.
- **Circuit look:** ports scale with the zoom (never under 3 screen px); a logic gate's body is three minor grid units tall with 2px lines; the beacon is round, a dim sun when off and a yellow duotone sun when on. A node definition can ask for an elliptical frame (`NodeDef.ellipse`).
- **Palette:** the link types share one flyout, whose face has no tooltip.
- **Markdown links:** an external link's arrow icon opens the link in a new tab (web URLs only); the hover tooltip that only repeated the URL is gone.
- **Mermaid:** a diagram renders as a block widget over its fenced source, so one that ends a document shows (it was hidden with the source) and the blank lines around it stay; the corner label skips leading `%%` comments.
