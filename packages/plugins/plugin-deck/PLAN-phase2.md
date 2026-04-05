# Phase 2.1: Move Deck.Root out of Deck.Main

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `Deck.Root` instantiation out of `DeckMain` so callers compose `<Deck.Root>...<Deck.Main />...</Deck.Root>` and `DeckMain` reads everything from context.

**Architecture:** Currently `DeckMain` calls framework hooks (`useAtomCapability`, `usePluginManager`, `useDeckState`) to get settings/state, then passes them into `DeckRoot` as props. After this refactor, `DeckMain` no longer instantiates `DeckRoot` — it reads from `useDeckContext()` instead. The caller (`DeckLayout`) is responsible for calling the hooks and providing context via `Deck.Root`.

**Tech Stack:** React, Radix-style context pattern (`@radix-ui/react-context`)

---

## File Map

| File                                       | Action    | Responsibility                                     |
| ------------------------------------------ | --------- | -------------------------------------------------- |
| `containers/DeckMain/DeckRoot.tsx`         | Modify    | Add `layoutMode` derivation; keep context type     |
| `containers/DeckMain/DeckMain.tsx`         | Modify    | Remove hook calls, read from `useDeckContext()`    |
| `containers/DeckMain/Deck.tsx`             | No change | Already exports `Deck.Root` / `Deck.Main`          |
| `containers/DeckMain/index.ts`             | Modify    | Export `Deck` namespace                            |
| `containers/DeckLayout/DeckLayout.tsx`     | Modify    | Call hooks, wrap with `Deck.Root`                  |
| `containers/DeckMain/Deck.stories.tsx`     | Modify    | Uncomment composite structure, call hooks in story |
| `containers/DeckMain/DeckMain.stories.tsx` | Remove    | Merged into `Deck.stories.tsx`                     |

---

### Task 1: Make DeckMain read from context instead of hooks

**Files:**

- Modify: `containers/DeckMain/DeckMain.tsx`

Currently `DeckMain` calls:

```ts
const settings = useAtomCapability(DeckCapabilities.Settings);
const pluginManager = usePluginManager();
const { state, deck, updateState } = useDeckState();
```

Then passes them into `<DeckRoot ...>`. After this change, `DeckMain` reads from `useDeckContext()` and no longer renders `<DeckRoot>`.

- [ ] **Step 1: Replace hook calls with context reads**

In `DeckMain.tsx`, replace the hook calls and `DeckRoot` wrapper:

```tsx
// BEFORE (lines 138-143):
export const DeckMain = ({ onLayoutChange }: DeckMainProps) => {
  const settings = useAtomCapability(DeckCapabilities.Settings);
  const pluginManager = usePluginManager();
  const { state, deck, updateState } = useDeckState();

// AFTER:
export const DeckMain = () => {
  const { settings, pluginManager, state, deck, updateState, layoutMode, onLayoutChange } =
    useDeckContext('DeckMain');
```

Remove from `DeckMainProps`:

```tsx
// BEFORE:
export type DeckMainProps = {
  onLayoutChange: (request: DeckLayoutChangeRequest) => void;
};

// AFTER:
export type DeckMainProps = {};
```

Remove derived state that's now in context:

```tsx
// DELETE these lines (they come from context now):
const layoutMode = getMode(deck);
```

Remove the `<DeckRoot ...>` wrapper from the return — `DeckMain` returns starting from `<Main.Root>` directly.

Remove unused imports: `useAtomCapability`, `usePluginManager` from `@dxos/app-framework/ui`; `useDeckState` from hooks; `DeckCapabilities`, `getMode` from types; `DeckRoot` import.

Add import: `useDeckContext` from `./DeckRoot`.

- [ ] **Step 2: Build and verify**

Run: `moon run plugin-deck:build`
Expected: Build errors in `DeckLayout.tsx` and stories (they still pass `onLayoutChange` prop). That's expected — we fix those in the next tasks.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-deck/src/containers/DeckMain/DeckMain.tsx
git commit -m "refactor(plugin-deck): DeckMain reads from context instead of hooks"
```

---

### Task 2: Update DeckLayout to compose Deck.Root + Deck.Main

**Files:**

- Modify: `containers/DeckLayout/DeckLayout.tsx`

`DeckLayout` currently renders `<DeckMain onLayoutChange={...} />`. After this change it calls the hooks that `DeckMain` used to call, wraps everything in `<Deck.Root>`, and renders `<Deck.Main />` without props.

- [ ] **Step 1: Add hook calls and Deck.Root wrapper**

```tsx
import React, { useCallback } from 'react';

import { useAtomCapability, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Mosaic } from '@dxos/react-ui-mosaic';

import { useDeckState } from '../../hooks';
import { DeckCapabilities, getMode } from '../../types';
import { Deck } from '../DeckMain/Deck';
import { type DeckLayoutChangeRequest } from '../DeckMain';

import { ActiveNode } from './ActiveNode';
import { Dialog } from './Dialog';
import { PopoverContent, PopoverRoot } from './Popover';
import { Toaster, type ToasterProps } from './Toast';

export type DeckLayoutProps = Pick<ToasterProps, 'onDismissToast'>;

export const DeckLayout = ({ onDismissToast }: DeckLayoutProps) => {
  const settings = useAtomCapability(DeckCapabilities.Settings);
  const pluginManager = usePluginManager();
  const { state, deck, updateState } = useDeckState();
  const layoutMode = getMode(deck);
  const { toasts } = state;
  const { invokePromise } = useOperationInvoker();

  const handleLayoutChange = useCallback(
    (request: DeckLayoutChangeRequest) => {
      void invokePromise(LayoutOperation.SetLayoutMode, request);
    },
    [invokePromise],
  );

  return (
    <Mosaic.Root>
      <PopoverRoot>
        <ActiveNode />
        <Deck.Root
          settings={settings}
          pluginManager={pluginManager}
          layoutMode={layoutMode}
          state={state}
          deck={deck}
          updateState={updateState}
          onLayoutChange={handleLayoutChange}
        >
          <Deck.Main />
        </Deck.Root>
        <PopoverContent />
        <Dialog />
        <Toaster toasts={toasts} onDismissToast={onDismissToast} />
      </PopoverRoot>
    </Mosaic.Root>
  );
};
```

- [ ] **Step 2: Build and verify**

Run: `moon run plugin-deck:build`
Expected: Passes (DeckLayout is now the only production consumer).

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-deck/src/containers/DeckLayout/DeckLayout.tsx
git commit -m "refactor(plugin-deck): DeckLayout composes Deck.Root + Deck.Main"
```

---

### Task 3: Update Deck.stories to use composite structure

**Files:**

- Modify: `containers/DeckMain/Deck.stories.tsx`

The story currently renders `<DeckMain onLayoutChange={...} />` directly. Update it to use the `Deck.Root` + `Deck.Main` composite, with a story component that calls the hooks (mirroring DeckLayout).

- [ ] **Step 1: Rewrite story with composite structure**

```tsx
//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback } from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { useAtomCapability, usePluginManager } from '@dxos/app-framework/ui';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';

import { DeckSettings, DeckState } from '../../capabilities';
import { useDeckState } from '../../hooks';
import { meta as pluginMeta } from '../../meta';
import { translations } from '../../translations';
import { DeckCapabilities, getMode } from '../../types';

import { Deck } from './Deck';

const TestPlugin = Plugin.define(pluginMeta).pipe(
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    activate: DeckSettings,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(DeckState),
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: () => DeckState(),
  }),
  Plugin.make,
);

const DefaultStory = () => {
  const settings = useAtomCapability(DeckCapabilities.Settings);
  const pluginManager = usePluginManager();
  const { state, deck, updateState } = useDeckState();
  const layoutMode = getMode(deck);

  const handleLayoutChange = useCallback(() => {
    console.log('layout change');
  }, []);

  return (
    <Deck.Root
      settings={settings}
      pluginManager={pluginManager}
      layoutMode={layoutMode}
      state={state}
      deck={deck}
      updateState={updateState}
      onLayoutChange={handleLayoutChange}
    >
      <Deck.Main />
    </Deck.Root>
  );
};

const meta = {
  title: 'plugins/plugin-deck/containers/Deck',
  component: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [...corePlugins(), TestPlugin()],
      setupEvents: [AppActivationEvents.SetupSettings],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

- [ ] **Step 2: Build and verify**

Run: `moon run plugin-deck:build`
Expected: PASS

- [ ] **Step 3: Delete DeckMain.stories.tsx**

`DeckMain.stories.tsx` is now redundant — `Deck.stories.tsx` covers the same component via the composite structure.

```bash
rm packages/plugins/plugin-deck/src/containers/DeckMain/DeckMain.stories.tsx
```

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-deck/src/containers/DeckMain/Deck.stories.tsx
git add packages/plugins/plugin-deck/src/containers/DeckMain/DeckMain.stories.tsx
git commit -m "refactor(plugin-deck): update Deck story to composite structure"
```

---

### Task 4: Update exports and clean up

**Files:**

- Modify: `containers/DeckMain/index.ts`

- [ ] **Step 1: Export Deck namespace from index**

```ts
//
// Copyright 2025 DXOS.org
//

export { Deck } from './Deck';
export { type DeckContextValue, type DeckLayoutChangeRequest } from './DeckRoot';
export { DeckMain, type DeckMainProps } from './DeckMain';
```

- [ ] **Step 2: Update DeckLayout import to use barrel**

In `DeckLayout.tsx`, change:

```ts
// BEFORE:
import { Deck } from '../DeckMain/Deck';
import { type DeckLayoutChangeRequest } from '../DeckMain';

// AFTER:
import { Deck, type DeckLayoutChangeRequest } from '../DeckMain';
```

- [ ] **Step 3: Build, format, lint**

```bash
moon run plugin-deck:build
pnpm format
moon run plugin-deck:lint -- --fix
```

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "refactor(plugin-deck): export Deck namespace, clean up imports"
git push
```
