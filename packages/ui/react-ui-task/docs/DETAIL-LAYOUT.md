# The task detail pane — one column, not four grids

`TaskArticle` stacks blocks that each decide their own left edge: an editor strip with a 2rem icon
track, two section labels, a history log, a set of questions, and a grid of artifact cards. Nothing
holds them to a common measure, so the pane reads as four components that happen to be adjacent.

This is the design for making it one form-shaped surface, using the `Column` primitive the form
stack already standardised on.

## What is on screen today

Measured in `ProjectArticle` › Task Detail, at a 1200px viewport, inside the detail pane:

| block                     | owns its left edge via                            |
| ------------------------- | ------------------------------------------------- |
| `Artifacts` / `History`   | nothing — the scroll viewport's 12px padding      |
| card grid (`cardMasonry`) | nothing — the same 12px                           |
| title field, description  | 12px + the strip's 8px + a 32px icon track ≈ 52px |
| history entry, question   | the strip's tracks, threaded in by the host       |

Three edges, and the labels land on the outermost one — which is the screenshot: `History` and
`Artifacts` hard against the pane's edge while everything they label is inset by an icon column.

The cause is not a missing padding. It is that four different things own placement:

1. `TaskArticle` renders `Field.Label` and the card surface as bare children of
   `ScrollArea.Viewport`, so they inherit the scroller's padding and nothing else.
2. `TaskList.Edit` defines its own template (`grid-cols-[2rem_1fr_min-content]`) and places every
   cell into it explicitly.
3. `Field.Label` inside that grid is auto-placed, so it lands in track 1 — the 32px icon column —
   and overhangs it.
4. `TaskHistory` and `TaskQuestion` cannot place themselves at all: the host passes `subgrid` plus a
   `cells` map of class strings naming the tracks it happens to have.

Point 4 is the one that spreads. Every new block in the pane has to be told the host's column names,
so the host's template becomes part of each child's API, and a child is unusable anywhere else.

## The design

**The pane is a form, so it uses the form's own viewport.** `Form.Viewport scroll` already is the
spine this needs: it renders a `Column.Root` — a three-track grid, gutter / content / gutter, whose
tracks it publishes through `--dx-col` and the `dx-gutter` marker — wrapping a
`ScrollArea.Root centered padding thin`. Replacing the article's bare `ScrollArea.Root` with it
means the gutter has one owner instead of none, and the pane inherits the measure every other form
article in the app is cut to.

It takes a `Form.Root` above it, which is not overhead: a task's title, status, priority, estimate
and description are `Task` fields, and editing an ECHO object through `Form` + schema is the rule
here rather than an option. `MarkdownField` already covers the description, so the header and body
can be a `Form.Layout` template over the schema, with the sections that are not fields — questions,
history, artifacts — as siblings inside the same viewport:

```tsx
<Panel.Content asChild>
  <Form.Root schema={Task.Task} values={task} autoSave onSave={handleUpdate}>
    <Form.Viewport scroll gutter='md'>
      <Form.Content>
        <Form.Layout template='<grid cols=1><field name=description/></grid>' />
      </Form.Content>
      <Section label={t('task-questions.label')}>…</Section>
      <Section label={t('task-history.label')}>…</Section>
      <Section label={t('task-artifacts.label')}>
        <Surface.Surface type={AppSurface.CardMasonry} … />
      </Section>
    </Form.Viewport>
  </Form.Root>
</Panel.Content>
```

Everything at content level — label, field, card grid — starts at the content track, because
`Form.Content` and `Section` both place themselves with `withColumn.center()`. Only a glyph hangs in
the gutter, which is what a gutter is for.

**What this costs, and the fallback.** `TaskList.Edit` is today the editor in both places, and it
carries behaviour a schema form does not: a held-open markdown field, a create case with no subject
to read from, and commit-on-blur through `TaskOperation.UpdateTask`. Moving the article onto
`Form.Root` means the article stops sharing that component with the list, which is a real change of
shape and wants its own step (below). If that step is deferred, the same gutter is still available
without the form context by wrapping the viewport in `Column.Root gutter='md'` directly — the
mechanism is the same, only the vocabulary is thinner.

**Rows with a leading glyph are `Column.Row`.** A history entry and a question are the same shape: a
glyph, then a body. Each renders its own row and places its own parts:

```tsx
<Column.Row>
  <Column.Block>
    <Icon icon={icon} />
  </Column.Block>
  <Column.Center>{description}</Column.Center>
</Column.Row>
```

`Column.Block` is the gutter slot, sized to `--dx-rail-item`, so a passive icon and an icon button
align to the pixel. The child needs no knowledge of the host's tracks, which is what retires
`subgrid` and `cells` — both already carry `TODO(burdon): Remove` on `TaskQuestion`.

**Nested in the list, the same components adopt the list's tracks.** `TaskList.Edit` keeps its
alignment with the rows above it through `Column.Root subgrid`, which spans the parent grid and
re-exposes its columns, instead of the current `grid` prop plus per-cell `col-[status]` strings. One
prop that means "adopt the host's tracks" replaces a map of class names per child.

**Section labels become one component.** `History` and `Artifacts` are currently `Field.Label` used
outside a field, in two packages, with no placement. A `Section` (label + content, placed in the
content track, `<h2>` semantics) makes the pane's structure legible to a reader and to a screen
reader, and gives the card grid a heading that is not a form label.

Where it lives follows `Banner.Empty`: the callers are panes rather than lists or forms, so it
belongs in `@dxos/react-ui` beside `Column`, not in `react-ui-form`.

**Three placement mechanisms already exist; use the right one.** `withColumn.center()` for a single
element, `placeContent()` for a subgrid row mixing gutter slots with content, `propagate()` for a
descendant that must reach the gutters. The rationale for each is in `react-ui-form/docs/AUDIT.md`
§3 — the earlier attempt to collapse them onto `--dx-col` alone was tried and abandoned.

## The header, and the toolbar

`TaskList.Edit`'s first row is a header: status control, title field, then estimate, priority, save
and cancel. In the article, `Panel.Toolbar` is rendered empty directly above it — two bars of
chrome, one of them blank.

Three ways to spend the toolbar, in increasing order of how much they move:

1. **Trailing controls only.** Estimate, priority, save and cancel move to `Panel.Toolbar`; status
   and title stay as the first content row. Smallest change; the pane still needs its icon track.
2. **Status and the controls.** The status glyph moves to the toolbar's leading slot, the controls
   to its trailing slot, and the title becomes the first row of the content column. The article then
   has no icon track at all, so the editor's `grid` prop is unused there and the title aligns with
   the description, the labels and the cards. **Recommended.**
3. **The whole header.** The title field moves into the toolbar too, making it the task's identity
   bar, and the body starts at the description. Reads well in a narrow plank, but a title field in a
   toolbar is an unusual control, and the toolbar is where actions live.

Option 2 is the one that removes a reason for the ad-hoc grid rather than relocating it. It also
splits cleanly: the toolbar's contents are contributed by the article, so the list's own edit strip
keeps its header unchanged, where the 2rem track belongs to the list.

**The row's task menu goes with it.** `TaskList.ItemActions` renders whatever plugins contributed
for a task — one action as a bare button, several behind a `…` — in the row's trailing gutter, where
it is revealed on hover and sized to a rail item. An article whose whole subject is that one task
has no reason to hide its actions behind a hover on a strip inside itself: the same items are the
pane's actions, and they belong in `Panel.Toolbar` beside the status and the estimate.

The article already has everything needed to build them — `useTaskActions()` resolves the
contributions and `TaskSetArticle` shows the pattern of appending Delete — so the toolbar reads:

```tsx
const contributed = useTaskActions();
const menu = useMenuActions(() => MenuBuilder.make().root(…).items(contributed(task), …).build());

<Panel.Toolbar>
  <Menu.Root {...menu} attendableId={attendableId}>
    <Menu.Toolbar />
  </Menu.Root>
</Panel.Toolbar>;
```

`useMenuActions` + `Menu.Root` rather than bare `Toolbar.IconButton`s, and `attendableId` threaded
through, because that is how a toolbar is built here — and it is what lets a contributed action
raise a dialog against the right plank.

What the row keeps is the row's: `TaskList.ItemActions` stays as it is for the list, since a list of
thirty tasks does need a per-row affordance. The article simply stops relying on it, which is the
same split as the header — one component, two hosts, each rendering the chrome its own shape calls
for.

## Migration

Ordered so each step is shippable on its own, and so the pane is never worse than it is now.

1. `Section` in `@dxos/react-ui`, with a story.
2. `TaskHistory` and `TaskQuestion` render `Column.Row` internally; delete `subgrid` and `cells`.
3. `TaskList.Edit` takes `Column.Root subgrid` in place of `grid`, and keeps only the header row's
   explicit placement.
4. `TaskArticle` swaps its `ScrollArea.Root` for `Form.Viewport scroll` under a `Form.Root`, moves
   the status control, the trailing controls and the contributed task menu into `Panel.Toolbar`
   (option 2), and drops the ad-hoc `p-2` / `dx-document` padding — the gutter is the viewport's.
5. The article's header and description become a `Form.Layout` template over `Task`, at which point
   the article no longer mounts `TaskList.Edit` and the list keeps it to itself. This is the step
   that decides whether commit-on-blur or the form's `autoSave` owns the write; until it lands,
   step 4 can keep `TaskList.Edit` inside `Form.Content`.

Each step is verifiable in `TaskArticle.stories.tsx` and `ProjectArticle` › Task Detail: one left
edge for every content block, a glyph in the gutter for every row that has one, and no `cells` prop
anywhere. The check that catches a regression is a measured one — read `getBoundingClientRect().left`
for the label, the field and the card grid and assert they agree.
