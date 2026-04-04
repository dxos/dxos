# Matrix/Plank/DeckMain Radix-Style Refactor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Plank and DeckMain into radix-style composite components with context-based dependency injection, then create a Matrix story demonstrating Plank tiles with Surface resolution.

**Architecture:** Introduce `PlankContext` via a new `Plank.Root` component that replaces internal hook usage (`useAppGraph`, `useOperationInvoker`, `useDeckState`) with context-provided values and callbacks. Similarly split DeckMain into `DeckMain.Root` (context), `DeckMain.Content`, and `DeckMain.Viewport`. The existing connected Plank wrapper feeds data into the new Root. The Matrix story demonstrates both a simple tile and a Surface-based PlankTile.

**Tech Stack:** React, TypeScript, Radix-style context pattern (`@radix-ui/react-context`), Surface system (`@dxos/app-framework`), Mosaic, Storybook

---

## File Structure

### Phase 1 (Plank refactor + Matrix story)

**Modified files:**

- `packages/plugins/plugin-deck/src/containers/Plank/Plank.tsx` — Extract `PlankContext`, add `Plank.Root`, keep connected wrapper
- `packages/plugins/plugin-deck/src/containers/Plank/PlankHeading.tsx` — Read from `PlankContext` instead of direct hook usage
- `packages/plugins/plugin-deck/src/containers/Plank/PlankControls.tsx` — Read callbacks from context
- `packages/plugins/plugin-deck/src/containers/Plank/index.ts` — Export new compound component parts
- `packages/plugins/plugin-deck/src/components/Matrix/Matrix.tsx` — Add responsive snap classes
- `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx` — Add PlankTile variant with Surface

**New files:**

- `packages/plugins/plugin-deck/src/containers/Plank/PlankContext.tsx` — Context definition and provider
- `packages/plugins/plugin-deck/src/components/Matrix/SPEC.md` — Updated with design decisions

### Phase 2 (DeckMain refactor)

**Modified files:**

- `packages/plugins/plugin-deck/src/containers/DeckMain/DeckMain.tsx` — Extract context, split into Root/Content/Viewport
- `packages/plugins/plugin-deck/src/containers/DeckMain/index.ts` — Export new parts

**New files:**

- `packages/plugins/plugin-deck/src/containers/DeckMain/DeckMainContext.tsx` — Context definition and provider

---

## Task 1: Create PlankContext

**Files:**

- Create: `packages/plugins/plugin-deck/src/containers/Plank/PlankContext.tsx`

This task defines the context that replaces direct hook usage within Plank sub-components.

- [ ] **Step 1: Create PlankContext.tsx**

```typescript
//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type Graph, type Node } from '@dxos/plugin-graph';

import { type DeckOperation } from '../../operations';
import { type LayoutMode, type ResolvedPart, type Settings } from '../../types';

const PLANK_NAME = 'Plank';

export type PlankContextValue = {
  /** The application graph. */
  graph: Graph.ExpandableGraph;
  /** The graph node for this plank. */
  node?: Node.Node;
  /** Current layout mode. */
  layoutMode: LayoutMode;
  /** Which part of the layout this plank occupies. */
  part: ResolvedPart;
  /** Deck settings. */
  settings?: Settings.Settings;
  /** Popover anchor ID for heading menus. */
  popoverAnchorId?: string;
  /** Callback for plank adjustments (close, solo, increment, companion). */
  onAdjust?: (id: string, type: DeckOperation.PartAdjustment) => void;
  /** Callback for plank resize. */
  onResize?: (id: string, size: number) => void;
  /** Callback to scroll a plank into view. */
  onScrollIntoView?: (id?: string) => void;
  /** Callback to change the companion. */
  onChangeCompanion?: (companion: string | null) => void;
};

export const [PlankProvider, usePlankContext] = createContext<PlankContextValue>(PLANK_NAME);
```

- [ ] **Step 2: Verify file compiles**

Run: `cd packages/plugins/plugin-deck && npx tsc --noEmit src/containers/Plank/PlankContext.tsx 2>&1 | head -20`

If there are import issues, verify with: `moon run plugin-deck:build`

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-deck/src/containers/Plank/PlankContext.tsx
git commit -m "feat(plugin-deck): add PlankContext for radix-style Plank refactor"
```

---

## Task 2: Refactor Plank.tsx to use PlankContext

**Files:**

- Modify: `packages/plugins/plugin-deck/src/containers/Plank/Plank.tsx`

The key change: The existing `Plank` memo component remains as the "connected" wrapper. It calls `useAppGraph`, `useOperationInvoker`, `useDeckState` etc. and passes them into a new `PlankRoot` component that provides `PlankContext`. The internal `PlankComponent` reads from context instead of calling hooks directly.

- [ ] **Step 1: Add PlankRoot that wraps PlankProvider**

At the top of Plank.tsx, import PlankContext:

```typescript
import { PlankProvider, type PlankContextValue } from './PlankContext';
```

Add PlankRoot component after the imports:

```typescript
type PlankRootProps = PropsWithChildren<PlankContextValue>;

/**
 * Headless root that provides plank context.
 * In production, the connected `Plank` wrapper populates this from hooks.
 * In stories/tests, values can be provided directly.
 */
const PlankRoot = ({ children, ...context }: PlankRootProps) => {
  return <PlankProvider {...context}>{children}</PlankProvider>;
};
```

- [ ] **Step 2: Wrap PlankComponent with PlankRoot in the connected Plank**

In the existing `Plank` memo component, after resolving `graph`, `node`, `companions`, `companionId`, add:

```typescript
const { invokePromise } = useOperationInvoker();
const { state } = useDeckState();

const handleAdjust = useCallback(
  (id: string, type: DeckOperation.PartAdjustment) => {
    if (type.startsWith('solo')) {
      return invokePromise(DeckOperation.Adjust, { type, id });
    } else if (type === 'close') {
      if (props.part === 'complementary') {
        return invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
      }
      return invokePromise(LayoutOperation.Close, { subject: [id] });
    }
    return invokePromise(DeckOperation.Adjust, { type, id });
  },
  [invokePromise, props.part],
);

const handleResize = useCallback(
  (id: string, size: number) => invokePromise(DeckOperation.UpdatePlankSize, { id, size }),
  [invokePromise],
);

const handleScrollIntoView = useCallback(
  (id?: string) => invokePromise(LayoutOperation.ScrollIntoView, { subject: id }),
  [invokePromise],
);

const handleChangeCompanion = useCallback(
  (companion: string | null) => invokePromise(DeckOperation.ChangeCompanion, { companion }),
  [invokePromise],
);
```

Then wrap the return in `PlankRoot`:

```tsx
return (
  <PlankRoot
    graph={graph}
    node={node}
    layoutMode={props.layoutMode}
    part={props.part}
    settings={props.settings}
    popoverAnchorId={state.popoverAnchorId}
    onAdjust={handleAdjust}
    onResize={handleResize}
    onScrollIntoView={handleScrollIntoView}
    onChangeCompanion={handleChangeCompanion}
  >
    <PlankContainer ...>
      <PlankComponent ... />
      {hasCompanion && <PlankComponent ... />}
    </PlankContainer>
  </PlankRoot>
);
```

**Important**: The existing `PlankComponent` still receives props directly for now. We will migrate it to read from context in subsequent steps. This step is about introducing the root without changing behavior.

- [ ] **Step 3: Verify build**

Run: `moon run plugin-deck:build`

Expected: Clean build with no errors. The DOM output should be identical.

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-deck/src/containers/Plank/Plank.tsx
git commit -m "feat(plugin-deck): wrap Plank internals with PlankRoot context provider"
```

---

## Task 3: Migrate PlankHeading to use PlankContext

**Files:**

- Modify: `packages/plugins/plugin-deck/src/containers/Plank/PlankHeading.tsx`

PlankHeading currently calls `useOperationInvoker()`, `useAppGraph()`, `useActionRunner()`, and `useBreakpoints()` directly. We replace the operation-related calls with context callbacks.

- [ ] **Step 1: Import and use PlankContext**

Replace these lines:

```typescript
const { invokePromise } = useOperationInvoker();
```

With reading from context for the action callbacks. Import `usePlankContext`:

```typescript
import { usePlankContext } from './PlankContext';
```

In the component body:

```typescript
const { onAdjust, onChangeCompanion } = usePlankContext('PlankHeading');
```

- [ ] **Step 2: Replace handlePlankAction**

Change `handlePlankAction` from using `invokePromise` to using `onAdjust`:

```typescript
const handlePlankAction = useCallback(
  (eventType: DeckOperation.PartAdjustment) => {
    onAdjust?.(id, eventType);
  },
  [onAdjust, id],
);
```

Note: The `close` handling for `complementary` part is moved to the connected Plank's `handleAdjust` callback (Task 2), so the heading just forwards the event.

- [ ] **Step 3: Replace handleTabClick**

Change from `invokePromise(DeckOperation.ChangeCompanion, ...)` to:

```typescript
const handleTabClick = useCallback(
  (event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest('[data-id]') as HTMLElement | null;
    const tabId = target?.dataset?.id;
    if (tabId) {
      onChangeCompanion?.(tabId);
    }
  },
  [onChangeCompanion],
);
```

- [ ] **Step 4: Keep useAppGraph for Graph.expand and useActionRunner**

`useAppGraph` is still needed for `Graph.expand(graph, node.id, 'child')` and `Graph.getActions(graph, node.id)`. `useActionRunner` is still needed for `runAction`. These are read-only graph operations, not state mutations, so they stay as direct hook calls for now.

- [ ] **Step 5: Verify build**

Run: `moon run plugin-deck:build`

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-deck/src/containers/Plank/PlankHeading.tsx
git commit -m "refactor(plugin-deck): migrate PlankHeading to use PlankContext callbacks"
```

---

## Task 4: Migrate PlankComponent resize/scroll to context

**Files:**

- Modify: `packages/plugins/plugin-deck/src/containers/Plank/Plank.tsx`

The internal `PlankComponent` uses `useOperationInvoker` for resize and scroll-into-view. Migrate these to context callbacks.

- [ ] **Step 1: Import usePlankContext in PlankComponent**

```typescript
const { onResize, onScrollIntoView } = usePlankContext('PlankComponent');
```

- [ ] **Step 2: Replace handleSizeChange**

Change from:

```typescript
const handleSizeChange = useCallback(
  debounce((nextSize: number) => {
    return invokePromise(DeckOperation.UpdatePlankSize, { id: sizeKey, size: nextSize });
  }, 200),
  [invokePromise, sizeKey],
);
```

To:

```typescript
const handleSizeChange = useCallback(
  debounce((nextSize: number) => {
    onResize?.(sizeKey, nextSize);
  }, 200),
  [onResize, sizeKey],
);
```

- [ ] **Step 3: Replace scrollIntoView effect**

Change from:

```typescript
useLayoutEffect(() => {
  if (scrollIntoView === id) {
    layoutMode === 'deck' && rootElement.current?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    void invokePromise(LayoutOperation.ScrollIntoView, { subject: undefined });
  }
}, [id, scrollIntoView, layoutMode, invokePromise]);
```

To:

```typescript
useLayoutEffect(() => {
  if (scrollIntoView === id) {
    layoutMode === 'deck' && rootElement.current?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    onScrollIntoView?.(undefined);
  }
}, [id, scrollIntoView, layoutMode, onScrollIntoView]);
```

- [ ] **Step 4: Remove useOperationInvoker import from PlankComponent** (if it's no longer used in that component — check that PlankHeading's import is still satisfied via its own file).

- [ ] **Step 5: Verify build**

Run: `moon run plugin-deck:build`

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-deck/src/containers/Plank/Plank.tsx
git commit -m "refactor(plugin-deck): migrate PlankComponent resize/scroll to context callbacks"
```

---

## Task 5: Export Plank compound component parts

**Files:**

- Modify: `packages/plugins/plugin-deck/src/containers/Plank/Plank.tsx` — Export PlankRoot
- Modify: `packages/plugins/plugin-deck/src/containers/Plank/index.ts` — Re-export context and Root

- [ ] **Step 1: Add compound export object in Plank.tsx**

At the bottom of Plank.tsx, add a named compound export alongside the existing `Plank` export:

```typescript
export const PlankParts = {
  Root: PlankRoot,
  Container: PlankContainer,
  Article: PlankComponent,
  Heading: PlankHeading,
  Controls: PlankControls,
};
```

Note: The existing `export const Plank` stays unchanged so DeckMain continues to work.

- [ ] **Step 2: Update index.ts**

```typescript
export * from './Plank';
export * from './PlankContext';
export * from './PlankControls';
export * from './PlankError';
export * from './PlankHeading';
export * from './PlankLoading';
```

- [ ] **Step 3: Verify build**

Run: `moon run plugin-deck:build`

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-deck/src/containers/Plank/Plank.tsx packages/plugins/plugin-deck/src/containers/Plank/index.ts
git commit -m "feat(plugin-deck): export Plank compound component parts"
```

---

## Task 6: Add responsive snap classes to Matrix tiles

**Files:**

- Modify: `packages/plugins/plugin-deck/src/components/Matrix/Matrix.tsx`

- [ ] **Step 1: Update Mosaic.Stack classNames in MatrixViewport**

Change the Mosaic.Stack classNames from:

```typescript
classNames = 'snap-x snap-mandatory gap-2';
```

To:

```typescript
classNames = 'snap-x snap-mandatory gap-2 flex';
```

This ensures tiles lay out horizontally. The individual tile components control their own width.

- [ ] **Step 2: Verify build**

Run: `moon run plugin-deck:build`

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-deck/src/components/Matrix/Matrix.tsx
git commit -m "feat(plugin-deck): add responsive layout classes to Matrix viewport"
```

---

## Task 7: Create PlankTile and update Matrix story

**Files:**

- Modify: `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx`

This is the big story update. We create two tile variants:

1. `StoryTile` (existing) — simple JSON display
2. `PlankTile` — uses Surface to render content, approximating Plank behavior

- [ ] **Step 1: Update StoryTile with responsive width**

```typescript
const StoryTile = (props: MosaicTileProps<Obj.Any>) => (
  <Mosaic.Tile {...props} asChild>
    <Focus.Item asChild border>
      <Panel.Root classNames='dx-current dx-hover w-full md:w-[50rem] snap-start shrink-0'>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <p>{Obj.getLabel(props.data)}</p>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Json data={props.data} />
        </Panel.Content>
      </Panel.Root>
    </Focus.Item>
  </Mosaic.Tile>
);
```

Note the `w-full md:w-[50rem] shrink-0` — full width on mobile, fixed on desktop.

- [ ] **Step 2: Create PlankTile that uses Surface**

```typescript
const PlankTile = (props: MosaicTileProps<Obj.Any>) => {
  const data = useMemo(
    () => ({
      attendableId: props.data.id,
      subject: props.data,
    }),
    [props.data],
  );

  return (
    <Mosaic.Tile {...props} asChild>
      <Focus.Item asChild border>
        <Panel.Root classNames='dx-current dx-hover w-full md:w-[50rem] snap-start shrink-0'>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <p>{Obj.getLabel(props.data)}</p>
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content>
            <Surface.Surface role='article' data={data} limit={1} />
          </Panel.Content>
        </Panel.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
};
```

- [ ] **Step 3: Add a companion item to the data**

Update `DefaultStory` to include 4 items with the last being a companion:

```typescript
const DefaultStory = ({ Tile }: DefaultStoryProps) => {
  const items = useMemo(
    () => [
      Organization.make({ name: faker.company.name() }),
      Person.make({ fullName: faker.person.fullName() }),
      Text.make({ name: 'Bio', content: faker.lorem.paragraphs(10) }),
      Text.make({ name: 'Companion', content: 'Companion panel for Bio' }),
    ],
    [],
  );
  // ... rest stays the same
};
```

- [ ] **Step 4: Add Surface story variant with withPluginManager decorator**

Add new imports:

```typescript
import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj } from '@dxos/echo';
```

Create a surface-enabled story:

```typescript
const SurfaceStory = ({ Tile }: DefaultStoryProps) => {
  const items = useMemo(
    () => [
      Organization.make({ name: faker.company.name() }),
      Person.make({ fullName: faker.person.fullName() }),
      Text.make({ name: 'Bio', content: faker.lorem.paragraphs(10) }),
      Text.make({ name: 'Companion', content: 'Companion panel for Bio' }),
    ],
    [],
  );

  const controller = useRef<MatrixController>(null);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    controller.current?.scrollTo(items[index]?.id);
  }, [items, index]);

  return (
    <Mosaic.Root classNames='dx-container'>
      <Matrix.Root Tile={Tile} items={items} ref={controller}>
        <Panel.Root>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <Toolbar.IconButton
                icon='ph--caret-left--regular'
                iconOnly
                label='Back'
                onClick={() => setIndex((index) => (index > 0 ? index - 1 : index))}
              />
              <Toolbar.IconButton
                icon='ph--caret-right--regular'
                iconOnly
                label='Forward'
                onClick={() => setIndex((index) => (index < items.length - 1 ? index + 1 : index))}
              />
              <Toolbar.Text>
                {index + 1} / {items.length}
              </Toolbar.Text>
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content asChild>
            <Matrix.Content>
              <Matrix.Viewport />
            </Matrix.Content>
          </Panel.Content>
        </Panel.Root>
      </Matrix.Root>
    </Mosaic.Root>
  );
};
```

- [ ] **Step 5: Create Surface extension for story**

```typescript
const storySurfaceExtension = Capability.contributes(
  Capabilities.ReactSurface,
  Surface.create({
    id: 'story-article',
    role: 'article',
    component: ({ data }) => {
      const subject = (data as any)?.subject;
      if (!subject) {
        return <div>No data</div>;
      }
      return <Json data={subject} />;
    },
  }),
);
```

- [ ] **Step 6: Add story exports**

Keep the existing Default story, add a WithSurface story:

```typescript
export const WithSurface: Story = {
  render: (args) => <SurfaceStory {...args} />,
  decorators: [
    withPluginManager({
      capabilities: [storySurfaceExtension],
    }),
  ],
  args: {
    Tile: PlankTile,
  },
};
```

- [ ] **Step 7: Verify build and storybook**

Run: `moon run plugin-deck:build`

Then visually verify: `moon run storybook-react:serve` and navigate to `plugins/plugin-deck/components/Matrix`.

Expected:

- Default story shows 4 JSON panels in a horizontal scroll
- WithSurface story shows 4 panels with Surface-resolved content
- On narrow viewport (< md breakpoint), only one panel visible at a time with snap scrolling

- [ ] **Step 8: Commit**

```bash
git add packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx
git commit -m "feat(plugin-deck): add PlankTile and Surface story variant to Matrix"
```

---

## Task 8: Update SPEC.md with design decisions and structure

**Files:**

- Modify: `packages/plugins/plugin-deck/src/components/Matrix/SPEC.md`

- [ ] **Step 1: Update SPEC.md**

Add the component structure and design decisions after the Phase 2 section:

```markdown
## Design Decisions

### Plank Radix-Style Structure
```

Plank (connected wrapper — calls useAppGraph, useOperationInvoker, useDeckState)
└── Plank.Root (PlankProvider — injects context)
├── Plank.Container (layout: solo grid vs passthrough)
├── Plank.Article (PlankComponent — attention, resize, Surface)
│ ├── Plank.Heading (icon, label, controls)
│ │ └── Plank.Controls (solo/deck/close/companion buttons)
│ ├── Surface.Surface role='article' (main content)
│ └── StackItem.ResizeHandle (deck mode only)
└── [Companion Plank.Article] (optional)

```

### PlankContext

Context replaces direct hook usage within Plank sub-components:
- `graph` — ExpandableGraph for node resolution
- `node` — the resolved graph node
- `layoutMode` — 'deck' | 'solo' | 'solo--fullscreen'
- `part` — 'solo' | 'deck' | 'solo-primary' | 'solo-companion'
- `settings` — deck plugin settings
- `popoverAnchorId` — for heading menu positioning
- Callbacks: `onAdjust`, `onResize`, `onScrollIntoView`, `onChangeCompanion`

### DeckMain Radix-Style Structure

```

DeckMain (connected wrapper — calls useAtomCapability, usePluginManager)
└── DeckMain.Root (DeckMainProvider — injects context)
├── DeckMain.Content (Main.Content with sidebars)
│ ├── Deck mode: Stack + Plank[]
│ └── Solo mode: StackContext + single Plank
└── DeckMain.Viewport (scroll container)

```

### DeckMainContext

Context replaces direct hook usage within DeckMain sub-components:
- `settings` — deck plugin settings atom
- `pluginManager` — for attention capabilities
- `state` — combined persisted + ephemeral state
- `deck` — active deck state
- `updateState` — state updater function
- Callback: `onLayoutChange`

### Mobile Responsiveness

Matrix tiles use `w-full md:w-[50rem]` with `snap-x snap-mandatory` on the viewport.
On mobile (< md breakpoint), each tile fills the viewport width and scroll-snap ensures
only one tile is visible at a time.

### Story Variants

- **Default** — uses StoryTile (simple JSON display, no Surface)
- **WithSurface** — uses PlankTile (Surface.Surface role='article') with withPluginManager decorator
  providing a surface extension that resolves any object to a Json component
```

- [ ] **Step 2: Mark Phase 1 checkboxes as complete**

Update the Phase 1 checklist items to `[x]` for the items completed.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-deck/src/components/Matrix/SPEC.md
git commit -m "docs(plugin-deck): update SPEC.md with Plank/DeckMain design decisions"
```

---

## Task 9: Create DeckMainContext

**Files:**

- Create: `packages/plugins/plugin-deck/src/containers/DeckMain/DeckMainContext.tsx`

- [ ] **Step 1: Create DeckMainContext.tsx**

```typescript
//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type PluginManager } from '@dxos/app-framework';

import { type DeckStateHook } from '../../hooks/useDeckState';
import { type Settings, type LayoutMode } from '../../types';
import { type LayoutChangeRequest } from './DeckMain';

const DECK_MAIN_NAME = 'DeckMain';

export type DeckMainContextValue = {
  /** Deck plugin settings. */
  settings?: Settings.Settings;
  /** Plugin manager for capability access. */
  pluginManager: PluginManager.PluginManager;
  /** Layout mode. */
  layoutMode: LayoutMode;
  /** Callback for layout mode changes. */
  onLayoutChange: (request: LayoutChangeRequest) => void;
} & Pick<DeckStateHook, 'state' | 'deck' | 'updateState'>;

export const [DeckMainProvider, useDeckMainContext] = createContext<DeckMainContextValue>(DECK_MAIN_NAME);
```

- [ ] **Step 2: Verify build**

Run: `moon run plugin-deck:build`

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-deck/src/containers/DeckMain/DeckMainContext.tsx
git commit -m "feat(plugin-deck): add DeckMainContext for radix-style DeckMain refactor"
```

---

## Task 10: Refactor DeckMain to use DeckMainContext

**Files:**

- Modify: `packages/plugins/plugin-deck/src/containers/DeckMain/DeckMain.tsx`
- Modify: `packages/plugins/plugin-deck/src/containers/DeckMain/index.ts`

Split DeckMain into Root (provider) + Content (the existing JSX). The connected `DeckMain` component remains as the entry point.

- [ ] **Step 1: Import DeckMainContext**

```typescript
import { DeckMainProvider, type DeckMainContextValue } from './DeckMainContext';
```

- [ ] **Step 2: Extract DeckMainRoot**

Create a new component at the top of the file:

```typescript
type DeckMainRootProps = PropsWithChildren<DeckMainContextValue>;

/**
 * Headless root that provides DeckMain context.
 */
const DeckMainRoot = ({ children, ...context }: DeckMainRootProps) => {
  return <DeckMainProvider {...context}>{children}</DeckMainProvider>;
};
```

- [ ] **Step 3: Wrap existing DeckMain content**

In the existing `DeckMain` component, after computing all state values (`settings`, `state`, `deck`, `layoutMode`, etc.), wrap the returned JSX:

```typescript
return (
  <DeckMainRoot
    settings={settings}
    pluginManager={pluginManager}
    layoutMode={layoutMode}
    state={state}
    deck={deck}
    updateState={updateState}
    onLayoutChange={onLayoutChange}
  >
    <Main.Root ...>
      {/* existing JSX unchanged */}
    </Main.Root>
  </DeckMainRoot>
);
```

The key point: the existing DeckMain body stays intact. We're just wrapping it in context. Sub-components can gradually migrate to reading from context.

- [ ] **Step 4: Export compound parts**

Add at the bottom of DeckMain.tsx:

```typescript
export const DeckMainParts = {
  Root: DeckMainRoot,
};
```

- [ ] **Step 5: Update index.ts**

```typescript
export { DeckMain, DeckMainParts, type DeckMainProps, type LayoutChangeRequest } from './DeckMain';
export { type DeckMainContextValue } from './DeckMainContext';
```

- [ ] **Step 6: Verify build**

Run: `moon run plugin-deck:build`

Expected: Clean build. No behavioral changes.

- [ ] **Step 7: Commit**

```bash
git add packages/plugins/plugin-deck/src/containers/DeckMain/DeckMain.tsx packages/plugins/plugin-deck/src/containers/DeckMain/DeckMainContext.tsx packages/plugins/plugin-deck/src/containers/DeckMain/index.ts
git commit -m "refactor(plugin-deck): wrap DeckMain with DeckMainRoot context provider"
```

---

## Task 11: Analyze DeckMain/Plank and write functional spec

**Files:**

- Modify: `packages/plugins/plugin-deck/src/components/Matrix/SPEC.md`

- [ ] **Step 1: Add DeckMain functional spec to SPEC.md**

Analyze the current DeckMain and write ~20 bullet points:

```markdown
## DeckMain Functional Spec

1. Renders the main content area with navigation sidebar (left) and complementary sidebar (right).
2. Supports three layout modes: `deck` (horizontal scroll of planks), `solo` (single plank), `solo--fullscreen` (single plank without heading).
3. In deck mode, renders a `Stack` with horizontal orientation containing all active planks.
4. In solo mode, renders a single `Plank` inside a `StackContext.Provider`.
5. Both deck and solo views are always mounted; the inactive one gets `sr-only` class and `inert` attribute.
6. Handles responsive breakpoints: auto-switches to solo mode on mobile, reverts on desktop.
7. Disables deck mode when `settings.enableDeck` is false.
8. Persists and restores scroll position when switching between deck and solo modes.
9. Manages sidebar state (open/closed/collapsed) for both navigation and complementary sidebars.
10. Renders a topbar (`Banner`) when breakpoint and layout mode require it.
11. Renders a status bar when breakpoint requires it.
12. Shows empty state (`ContentEmpty`) when no planks are active.
13. Applies centering overscroll padding when `settings.overscroll === 'centering'`.
14. Calculates plank ordering for grid layout (accounts for companions and separators).
15. Renders `PlankSeparator` between planks in deck mode.
16. Sets CSS custom properties for sidebar widths and first/last plank widths.
17. Attends (focuses) the first plank on initial render.
18. Handles fullscreen mode by hiding sidebars.
19. Applies `Main.Overlay` for dialog dismissal.
20. Passes `companionVariant` to planks when companion is open.
```

- [ ] **Step 2: Add Plank functional spec to SPEC.md**

```markdown
## Plank Functional Spec

1. A plank is the main container for a single object's content within a deck.
2. Resolves a graph node by ID via `useNode(graph, id)`.
3. Optionally pairs with a companion plank (secondary panel showing related content).
4. Companion resolution: finds child nodes of type `PLANK_COMPANION_TYPE`, selects by variant preference.
5. In solo mode, wraps content in a grid container (`PlankContainer`) with optional companion column.
6. In deck mode, renders as a `StackItem.Root` with resizable width.
7. Renders a `PlankHeading` with icon, label, action menu, and layout controls.
8. Renders content via `Surface.Surface` with `role='article'` and node data.
9. Supports keyboard navigation: Escape focuses the parent main, Enter focuses first child.
10. Tracks attention via `useAttentionAttributes` for focus-based highlighting.
11. Handles scroll-into-view when state requests it, then clears the request.
12. Supports resize via `StackItem.ResizeHandle` with debounced size persistence.
13. Shows loading placeholder while content resolves.
14. Shows error fallback (with 5s timeout) when node cannot be resolved.
15. Applies different CSS for solo vs deck vs companion layouts.
16. Supports `encapsulatedPlanks` setting (adds borders and margins).
17. PlankHeading shows actions from the graph node's child actions.
18. PlankHeading supports companion tabs when in companion mode.
19. PlankControls provides solo/deck toggle, increment start/end, close, and companion buttons.
20. PlankCompanionControls provides close button for the companion panel.
```

- [ ] **Step 3: Add recommendations section**

```markdown
## Simplification Recommendations

1. **Merge PlankComponent into Plank.Article**: The `PlankComponent` internal component duplicates the role of a proper compound component part. Rename to `Plank.Article` and simplify.
2. **Extract solo layout from Plank**: Solo layout (`PlankContainer`) should be a DeckMain responsibility, not Plank's. Plank should always render the same structure; the parent decides positioning.
3. **Simplify part props**: The `ResolvedPart` type has 5 variants (`solo`, `deck`, `complementary`, `solo-primary`, `solo-companion`). These could be derived from context (`layoutMode` + `isCompanion`) rather than threaded as props.
4. **Remove dual-mount pattern in DeckMain**: Currently both deck and solo views are always mounted with one hidden via `sr-only` + `inert`. Consider mounting only the active mode to reduce DOM size and simplify state.
5. **Consolidate PlankHeading action loading**: The `Graph.expand` call in PlankHeading should be lifted to Plank.Root to avoid per-heading side effects.
```

- [ ] **Step 4: Mark Phase 2 checkboxes as complete**

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-deck/src/components/Matrix/SPEC.md
git commit -m "docs(plugin-deck): add DeckMain/Plank functional specs and simplification recommendations"
```

---

## Task 12: Final build and lint check

**Files:** None (verification only)

- [ ] **Step 1: Run full build**

Run: `moon run plugin-deck:build`

Expected: Clean build with no errors.

- [ ] **Step 2: Run lint**

Run: `moon run plugin-deck:lint -- --fix`

Expected: Clean or auto-fixed.

- [ ] **Step 3: Run tests**

Run: `moon run plugin-deck:test`

Expected: All tests pass.

- [ ] **Step 4: Final commit if lint made changes**

```bash
git add -A
git commit -m "chore(plugin-deck): lint fixes"
```
