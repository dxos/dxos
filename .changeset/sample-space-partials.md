---
'@dxos/app-toolkit': minor
'@dxos/plugin-debug': patch
'@dxos/plugin-inbox': patch
'@dxos/plugin-markdown': patch
'@dxos/ui-editor': patch
---

`SampleSpace.partial` defines a partial: the content one `CONTENT.md` spec describes, applied as one phase that carries its own phases' schemas. The debug plugin adds a Fieldstone Labs space template, a software team run mostly by agents, built from four partials plus the DXOS architecture diagrams; `@dxos/plugin-canvas` now publishes and exports its architecture partial from `@dxos/plugin-canvas/samples`. A contact card shows the employer's name instead of only an icon, related events no longer swap recent and upcoming, a conversation's message header keeps its date and actions to the right with the subject at full width, an event's star sits beside its title, cards have a visible edge in light mode, a calendar card lists at most three attendees, a sheet embedded in a document renders instead of failing, and object links past a document's first screen render as links instead of raw markdown.
