# Minimap — anchor-marker rail for chat/document

Date: 2026-07-20
Branch: `claude/anchor-marker-viz-337a69`

## Goal

A generic, reusable `Minimap` component (in `@dxos/react-ui-components`) that renders a
vertical rail of horizontal ticks representing anchor markers within a scrollable
document. On hover the ticks extend rightward with a wave falloff and a popover shows the
hovered marker's title/description. Markers whose range intersects the currently-visible
document range render brighter (higher opacity). Clicking a tick notifies the consumer.

Wire it into `plugin-assistant`'s `ChatArticle` as a left rail on the thread, deriving one
marker per user-prompt turn and scrolling the thread to the associated turn on click.

## Non-goals (YAGNI)

- Proportional-to-position layout (ticks are evenly-spaced discrete rows, one per marker).
- Horizontal orientation / orientation prop.
- Virtualization of the rail (marker counts are small — one per prompt).

## Unit A — `Minimap` (generic)

Location: `packages/ui/react-ui-components/src/components/Minimap/`
(`Minimap.tsx`, `Minimap.stories.tsx`, `index.ts`); added to `components/index.ts` barrel.

```ts
export type MinimapMarker = {
  id: string;
  title: string;
  description?: string;
  range: { from: number; to: number }; // document (e.g. CM) range positions.
};

export type MinimapProps = ThemedClassName<{
  markers: MinimapMarker[];
  /** Currently-visible document range; markers intersecting it render "active" (brighter). */
  visibleRange?: { from: number; to: number };
  onSelect?: (marker: MinimapMarker, index: number) => void;
}>;
```

Behaviour:

- Renders a vertical stack of horizontal ticks, one row per marker, evenly spaced.
- **Wave hover:** the hovered row extends to full width; each other row extends by a
  distance falloff `max(0, 1 - dist/spread)` where `dist` is the row-index distance from
  the hovered row. Width is CSS-transitioned so the wave animates as the pointer moves
  between rows. On pointer leave the rail collapses back to the resting width.
- **Active = brighter:** a marker is active when its `range` intersects `visibleRange`
  (`from < visibleRange.to && to > visibleRange.from`). Active ticks render at full
  opacity, inactive ticks dimmed. With no `visibleRange`, all render at resting opacity.
- **Popover:** hovering a tick opens a `Popover` (from `@dxos/react-ui`) anchored to the
  tick, showing `title` and (if present) `description`.
- **Click:** invokes `onSelect(marker, index)`.
- Styling via theme tokens + `mx` only (no literal colors, no casts). Opacity via
  Tailwind opacity utilities.

Storybook (`Minimap.stories.tsx`): mock markers with titles/descriptions, a control to
move `visibleRange` across the set (demonstrating active dimming), and interactive
hover to show the wave + popover. Follows the react-ui-components story conventions
(`withTheme`/layout decorators, `render` with `useMemo` for any object state).

## Unit B — CodeMirror plumbing (react-ui-markdown / plugin-assistant sync)

1. `MessageSyncer` (`plugin-assistant/.../ChatThread/sync.ts`) records the document offset
   range `[from, to)` of each message as it walks/appends (it already tracks the completed
   block cursor and trailing chars; extend to accumulate a per-message offset table keyed
   by message id). Exposes `getRanges(): { id: string; from: number; to: number }[]`.
   The ranges reflect the same monotonic-append contract the syncer already relies on.
2. `MarkdownStreamController` (`react-ui-markdown/.../MarkdownStream.tsx`) gains:
   - `scrollTo(pos: number, opts?: { behavior?: ScrollBehavior; y?: 'start' | 'center' })`
     — dispatches `EditorView.scrollIntoView(pos, …)`.
   - `getVisibleRange(): { from: number; to: number } | undefined` — computed from the
     scroll DOM top/bottom mapped to document positions.
   - `onVisibleRangeChange(cb): () => void` — subscribe to scroll so the minimap's active
     set updates live (backed by a scroll listener on the editor's scroll DOM).

## Unit C — `Chat.Minimap` + ChatArticle wiring

- New `Chat.Minimap` composable (in `plugin-assistant/.../components/Chat/Chat.tsx`)
  reads `messages` from `ChatContext` and receives the controller (shared from
  `Chat.Thread`). It builds markers: one per **user-prompt turn** —
  - `title` = the user message text.
  - `description` = a snippet (first few lines) of the following assistant reply,
    text content blocks only (tool calls, reasoning/thoughts, status excluded).
  - `range` = the turn's CM range (user message start → next user message start),
    resolved from the syncer's `getRanges()` by message id.
- `visibleRange` comes from `controller.getVisibleRange()`, refreshed via
  `onVisibleRangeChange`.
- `onSelect` → `controller.scrollTo(range.from, { y: 'start', behavior: 'smooth' })`.
- The controller is currently local to `Chat.Thread`. Share it via `ChatContext` (or a
  ref exposed on the context) so both `Chat.Thread` and `Chat.Minimap` reference the same
  instance.
- `ChatArticle` places `Chat.Minimap` as a narrow left rail inside the thread container
  (the existing `<div className='dx-container relative'>`), left of `Chat.Thread`.

## Testing

- `Minimap`: storybook (manual/visual) + a unit test for the active-intersection and
  wave-falloff pure helpers if extracted.
- `sync.ts`: extend existing syncer tests to assert `getRanges()` offsets for a
  multi-message thread (append + reset paths).
- Build/lint/format green for all touched packages; storybook renders.

## Follow-up task (after Minimap is working)

Change the keyboard shortcuts in `plugin-assistant` so navigate-previous / navigate-next
operate on the **new prompt-based data structure** (the per-message CM range table
produced by the syncer / surfaced for the Minimap), **not** via the `xml-tags.ts`
widget-bookmark mechanism (`navigatePreviousEffect` / `navigateNextEffect`).

- Today `Chat.Thread` maps `nav-previous` / `nav-next` events to
  `controller.navigatePrevious()` / `navigateNext()`, which dispatch the xml-tag
  navigation effects (bookmarks tracked in `xml-tags.ts`, virtualized by CM).
- After this change, navigation should step between prompt turns using the same
  `{ id, from, to }` range table the Minimap consumes, scrolling via the new
  `controller.scrollTo(pos)`. Keep the current keybindings; only swap the underlying
  target resolution.
- The xml-tag navigation effects can remain in `ui-editor` for other consumers; this
  task only re-points `plugin-assistant`'s prompt navigation.

## Rollout

Single PR: generic component (fully testable via storybook) + plumbing + wiring +
prompt-based prev/next navigation + changeset.
