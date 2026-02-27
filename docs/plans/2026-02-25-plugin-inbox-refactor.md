# plugin-inbox Refactoring Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor plugin-inbox to follow the established plugin architecture pattern where surface components live in `src/containers/` and primitive UI components live in `src/components/`, matching plugin-kanban as the exemplar.

**Architecture:** All components referenced by `src/capabilities/react-surface/react-surface.tsx` move to `src/containers/`. Primitive sub-components (Mailbox.tsx, Message.tsx, ComposeEmailPanel.tsx, etc.) stay in `src/components/`. The `containers/index.ts` uses lazy exports; `react-surface.tsx` imports only from `../../containers`.

**Tech Stack:** React, TypeScript, `@dxos/app-framework` hooks (`useOperationInvoker`, `useCapability`), Vitest

---

## Context

Reference: `packages/plugins/AGENTS.md`
Exemplar: `packages/plugins/plugin-kanban`

### Surface components to move (referenced by react-surface.tsx):

| Current location | Container destination |
|---|---|
| `components/MailboxArticle/MailboxArticle.tsx` | `containers/MailboxArticle/MailboxArticle.tsx` |
| `components/MailboxArticle/PopoverSaveFilter.tsx` | `containers/PopoverSaveFilter/PopoverSaveFilter.tsx` |
| `components/MessageArticle/MessageArticle.tsx` | `containers/MessageArticle/MessageArticle.tsx` |
| `components/DraftMessageArticle/DraftMessageArticle.tsx` | `containers/DraftMessageArticle/DraftMessageArticle.tsx` |
| `components/EventArticle/EventArticle.tsx` | `containers/EventArticle/EventArticle.tsx` |
| `components/CalendarArticle/CalendarArticle.tsx` | `containers/CalendarArticle/CalendarArticle.tsx` |
| `components/MessageCard/MessageCard.tsx` | `containers/MessageCard/MessageCard.tsx` |
| `components/EventCard/EventCard.tsx` | `containers/EventCard/EventCard.tsx` |
| `components/MailboxSettings/MailboxSettings.tsx` | `containers/MailboxSettings/MailboxSettings.tsx` |
| `components/Related/RelatedToContact.tsx` | `containers/RelatedToContact/RelatedToContact.tsx` |
| `components/Related/RelatedToOrganization.tsx` | `containers/RelatedToOrganization/RelatedToOrganization.tsx` |

### Primitive sub-components that stay in `src/components/`:

- `MailboxArticle/Mailbox.tsx`, `MailboxEmpty.tsx` — rendered by MailboxArticle container
- `MessageArticle/Message.tsx`, `useToolbar.tsx` — rendered by MessageArticle container
- `EventArticle/Event.tsx`, `EventAttendee.tsx`, `EventToolbar.tsx`, `useToolbar.tsx`
- `CalendarArticle/EventList.tsx`
- `DraftMessageArticle/ComposeEmailPanel.tsx`
- `Related/RelatedContacts.tsx`, `RelatedMessages.tsx`, `RelatedEvents.tsx`
- `common/` — shared primitive utilities

### Existing storybooks (on primitive sub-components, stay in place):
- `MailboxArticle/Mailbox.stories.tsx`
- `MessageArticle/Message.stories.tsx`
- `EventArticle/Event.stories.tsx`
- `CalendarArticle/EventList.stories.tsx`
- `DraftMessageArticle/ComposeEmailPanel.stories.tsx`
- `components/Popover.stories.tsx` — tests PopoverSaveFilter
- `EventCard/EventCard.stories.tsx`
- `MessageCard/MessageCard.stories.tsx`

### Missing storybooks (noted as issues, out of scope for this refactor):
- `MailboxSettings` — requires trigger/database setup, complex
- `RelatedToContact`, `RelatedToOrganization` — require complex context

---

## Task 1: Create containers directory and move MailboxArticle + PopoverSaveFilter

**Files:**
- Create: `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx`
- Create: `packages/plugins/plugin-inbox/src/containers/MailboxArticle/index.ts`
- Create: `packages/plugins/plugin-inbox/src/containers/PopoverSaveFilter/PopoverSaveFilter.tsx`
- Create: `packages/plugins/plugin-inbox/src/containers/PopoverSaveFilter/index.ts`
- Modify: `packages/plugins/plugin-inbox/src/components/MailboxArticle/MailboxArticle.tsx` → delete
- Modify: `packages/plugins/plugin-inbox/src/components/MailboxArticle/PopoverSaveFilter.tsx` → delete

**Step 1: Copy MailboxArticle.tsx to containers**

```bash
cp packages/plugins/plugin-inbox/src/components/MailboxArticle/MailboxArticle.tsx \
   packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx
```

**Step 2: Fix import paths in the container** (relative imports now reference `../../components/MailboxArticle/`)

In `containers/MailboxArticle/MailboxArticle.tsx`, update internal imports:
```ts
// Change from:
import { Mailbox, MailboxEmpty, type MailboxProps } from './Mailbox';
import { PopoverSaveFilter } from './PopoverSaveFilter';
// Change to:
import { Mailbox, MailboxEmpty, type MailboxProps } from '../../components/MailboxArticle/Mailbox';
// (PopoverSaveFilter is now also a container; import via its new path if needed,
//  or leave as inline if not used directly here)
```

**Step 3: Create containers/MailboxArticle/index.ts**

```ts
//
// Copyright 2025 DXOS.org
//

export { MailboxArticle } from './MailboxArticle';
```

**Step 4: Copy and relocate PopoverSaveFilter**

```bash
mkdir -p packages/plugins/plugin-inbox/src/containers/PopoverSaveFilter
cp packages/plugins/plugin-inbox/src/components/MailboxArticle/PopoverSaveFilter.tsx \
   packages/plugins/plugin-inbox/src/containers/PopoverSaveFilter/PopoverSaveFilter.tsx
```

**Step 5: Create containers/PopoverSaveFilter/index.ts**

```ts
//
// Copyright 2025 DXOS.org
//

export { PopoverSaveFilter } from './PopoverSaveFilter';
```

**Step 6: Delete the surface components from components/ directories**

```bash
rm packages/plugins/plugin-inbox/src/components/MailboxArticle/MailboxArticle.tsx
rm packages/plugins/plugin-inbox/src/components/MailboxArticle/PopoverSaveFilter.tsx
```

**Step 7: Build to check for errors**

```bash
moon run plugin-inbox:build 2>&1 | grep -v "Auth token DEPOT_TOKEN"
```
Expected: errors about missing exports in containers/index.ts (we haven't created that yet — expected)

**Step 8: Commit**

```bash
git add packages/plugins/plugin-inbox/src/containers/
git add packages/plugins/plugin-inbox/src/components/MailboxArticle/
git commit -m "refactor(plugin-inbox): move MailboxArticle and PopoverSaveFilter to containers"
```

---

## Task 2: Move MessageArticle, DraftMessageArticle, EventArticle, CalendarArticle

**Files:**
- Create: `containers/MessageArticle/MessageArticle.tsx`, `containers/MessageArticle/index.ts`
- Create: `containers/DraftMessageArticle/DraftMessageArticle.tsx`, `containers/DraftMessageArticle/index.ts`
- Create: `containers/EventArticle/EventArticle.tsx`, `containers/EventArticle/index.ts`
- Create: `containers/CalendarArticle/CalendarArticle.tsx`, `containers/CalendarArticle/index.ts`

**Step 1: Copy surface components to containers**

```bash
mkdir -p packages/plugins/plugin-inbox/src/containers/MessageArticle
mkdir -p packages/plugins/plugin-inbox/src/containers/DraftMessageArticle
mkdir -p packages/plugins/plugin-inbox/src/containers/EventArticle
mkdir -p packages/plugins/plugin-inbox/src/containers/CalendarArticle

cp packages/plugins/plugin-inbox/src/components/MessageArticle/MessageArticle.tsx \
   packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx
cp packages/plugins/plugin-inbox/src/components/DraftMessageArticle/DraftMessageArticle.tsx \
   packages/plugins/plugin-inbox/src/containers/DraftMessageArticle/DraftMessageArticle.tsx
cp packages/plugins/plugin-inbox/src/components/EventArticle/EventArticle.tsx \
   packages/plugins/plugin-inbox/src/containers/EventArticle/EventArticle.tsx
cp packages/plugins/plugin-inbox/src/components/CalendarArticle/CalendarArticle.tsx \
   packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx
```

**Step 2: Fix import paths in each moved container file**

For `containers/MessageArticle/MessageArticle.tsx`:
```ts
// Change relative imports to reference components/ directory:
import { Message, type MessageHeaderProps } from '../../components/MessageArticle/Message';
import { type ViewMode } from '../../components/MessageArticle/useToolbar';
```

For `containers/DraftMessageArticle/DraftMessageArticle.tsx`:
```ts
// Fix relative imports to:
import { ComposeEmailPanel } from '../../components/DraftMessageArticle/ComposeEmailPanel';
// (plus any other local sub-components)
```

For `containers/EventArticle/EventArticle.tsx`:
```ts
// Fix relative imports to reference:
import { Event } from '../../components/EventArticle/Event';
import { EventToolbar } from '../../components/EventArticle/EventToolbar';
// etc.
```

For `containers/CalendarArticle/CalendarArticle.tsx`:
```ts
// Fix relative imports to:
import { EventList } from '../../components/CalendarArticle/EventList';
// etc.
```

**Step 3: Create index.ts for each container**

Each `containers/XArticle/index.ts`:
```ts
//
// Copyright 2025 DXOS.org
//

export { XArticle } from './XArticle';
```

**Step 4: Delete the surface component files from components/**

```bash
rm packages/plugins/plugin-inbox/src/components/MessageArticle/MessageArticle.tsx
rm packages/plugins/plugin-inbox/src/components/DraftMessageArticle/DraftMessageArticle.tsx
rm packages/plugins/plugin-inbox/src/components/EventArticle/EventArticle.tsx
rm packages/plugins/plugin-inbox/src/components/CalendarArticle/CalendarArticle.tsx
```

**Step 5: Commit**

```bash
git add packages/plugins/plugin-inbox/src/containers/
git add packages/plugins/plugin-inbox/src/components/
git commit -m "refactor(plugin-inbox): move article containers to containers/"
```

---

## Task 3: Move MessageCard, EventCard, MailboxSettings, RelatedToContact, RelatedToOrganization

**Files:**
- Create: `containers/MessageCard/MessageCard.tsx`, `containers/MessageCard/index.ts`
- Create: `containers/EventCard/EventCard.tsx`, `containers/EventCard/index.ts`
- Create: `containers/MailboxSettings/MailboxSettings.tsx`, `containers/MailboxSettings/index.ts`
- Create: `containers/RelatedToContact/RelatedToContact.tsx`, `containers/RelatedToContact/index.ts`
- Create: `containers/RelatedToOrganization/RelatedToOrganization.tsx`, `containers/RelatedToOrganization/index.ts`

**Step 1: Copy files to containers**

```bash
mkdir -p packages/plugins/plugin-inbox/src/containers/MessageCard
mkdir -p packages/plugins/plugin-inbox/src/containers/EventCard
mkdir -p packages/plugins/plugin-inbox/src/containers/MailboxSettings
mkdir -p packages/plugins/plugin-inbox/src/containers/RelatedToContact
mkdir -p packages/plugins/plugin-inbox/src/containers/RelatedToOrganization

cp packages/plugins/plugin-inbox/src/components/MessageCard/MessageCard.tsx \
   packages/plugins/plugin-inbox/src/containers/MessageCard/MessageCard.tsx
cp packages/plugins/plugin-inbox/src/components/EventCard/EventCard.tsx \
   packages/plugins/plugin-inbox/src/containers/EventCard/EventCard.tsx
cp packages/plugins/plugin-inbox/src/components/MailboxSettings/MailboxSettings.tsx \
   packages/plugins/plugin-inbox/src/containers/MailboxSettings/MailboxSettings.tsx
cp packages/plugins/plugin-inbox/src/components/Related/RelatedToContact.tsx \
   packages/plugins/plugin-inbox/src/containers/RelatedToContact/RelatedToContact.tsx
cp packages/plugins/plugin-inbox/src/components/Related/RelatedToOrganization.tsx \
   packages/plugins/plugin-inbox/src/containers/RelatedToOrganization/RelatedToOrganization.tsx
```

**Step 2: Fix import paths in moved files**

For `containers/MessageCard/MessageCard.tsx`: no sub-component imports needed (self-contained).

For `containers/EventCard/EventCard.tsx`:
```ts
// Fix relative import:
import { DateComponent } from '../../components/common';
```

For `containers/MailboxSettings/MailboxSettings.tsx`: no sub-component imports (self-contained).

For `containers/RelatedToContact/RelatedToContact.tsx`:
```ts
// Fix relative imports:
import { RelatedMessages } from '../../components/Related/RelatedMessages';
import { RelatedEvents } from '../../components/Related/RelatedEvents';
// etc.
```

For `containers/RelatedToOrganization/RelatedToOrganization.tsx`:
```ts
// Fix relative import:
import { RelatedContacts } from '../../components/Related/RelatedContacts';
```

**Step 3: Create index.ts for each container**

Each `containers/X/index.ts`:
```ts
//
// Copyright 2025 DXOS.org
//

export { X } from './X';
```

**Step 4: Delete surface component files from components/**

```bash
rm packages/plugins/plugin-inbox/src/components/MessageCard/MessageCard.tsx
rm packages/plugins/plugin-inbox/src/components/EventCard/EventCard.tsx
rm packages/plugins/plugin-inbox/src/components/MailboxSettings/MailboxSettings.tsx
rm packages/plugins/plugin-inbox/src/components/Related/RelatedToContact.tsx
rm packages/plugins/plugin-inbox/src/components/Related/RelatedToOrganization.tsx
```

**Step 5: Commit**

```bash
git add packages/plugins/plugin-inbox/src/containers/
git add packages/plugins/plugin-inbox/src/components/
git commit -m "refactor(plugin-inbox): move card and settings containers to containers/"
```

---

## Task 4: Create containers/index.ts with lazy exports

**Files:**
- Create: `packages/plugins/plugin-inbox/src/containers/index.ts`

**Step 1: Create containers/index.ts**

```ts
//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CalendarArticle: ComponentType<any> = lazy(() => import('./CalendarArticle'));
export const DraftMessageArticle: ComponentType<any> = lazy(() => import('./DraftMessageArticle'));
export const EventArticle: ComponentType<any> = lazy(() => import('./EventArticle'));
export const EventCard: ComponentType<any> = lazy(() => import('./EventCard'));
export const MailboxArticle: ComponentType<any> = lazy(() => import('./MailboxArticle'));
export const MailboxSettings: ComponentType<any> = lazy(() => import('./MailboxSettings'));
export const MessageArticle: ComponentType<any> = lazy(() => import('./MessageArticle'));
export const MessageCard: ComponentType<any> = lazy(() => import('./MessageCard'));
export const PopoverSaveFilter: ComponentType<any> = lazy(() => import('./PopoverSaveFilter'));
export const RelatedToContact: ComponentType<any> = lazy(() => import('./RelatedToContact'));
export const RelatedToOrganization: ComponentType<any> = lazy(() => import('./RelatedToOrganization'));
```

**Step 2: Commit**

```bash
git add packages/plugins/plugin-inbox/src/containers/index.ts
git commit -m "refactor(plugin-inbox): create containers/index.ts with lazy exports"
```

---

## Task 5: Update components/index.ts and react-surface.tsx

**Files:**
- Modify: `packages/plugins/plugin-inbox/src/components/index.ts`
- Modify: `packages/plugins/plugin-inbox/src/capabilities/react-surface/react-surface.tsx`

**Step 1: Update components/index.ts**

Remove all surface component exports. The current file has:
```ts
export * from './MailboxSettings';    // REMOVE — now in containers
export * from './MailboxArticle';      // REMOVE surface component, but keep: check sub-components
export * from './Related';             // REMOVE surface components

export const CalendarArticle = lazy(...)  // REMOVE
export const EventArticle = lazy(...)     // REMOVE
export const EventCard = lazy(...)        // REMOVE
export const MailboxArticle = lazy(...)   // REMOVE
export const MessageArticle = lazy(...)   // REMOVE
export const MessageCard = lazy(...)      // REMOVE
export const DraftMessageArticle = lazy(...) // REMOVE
```

After editing, `components/index.ts` should only re-export primitive sub-components that are used outside the package (none in this case — primitives are internal to containers). If no primitives are needed externally, the file may be mostly empty or just export the MailboxArticle sub-components.

Check what `src/components/MailboxArticle/index.ts` currently exports — it likely exports primitives like `Mailbox`, `MailboxEmpty` that may be needed by the MailboxArticle container. Those exports stay.

**Step 2: Update react-surface.tsx to import from containers**

Change:
```ts
import { CalendarArticle, DraftMessageArticle, EventArticle, EventCard, MailboxArticle,
         MailboxSettings, MessageArticle, MessageCard, PopoverSaveFilter,
         RelatedToContact, RelatedToOrganization } from '../../components';
```

To:
```ts
import { CalendarArticle, DraftMessageArticle, EventArticle, EventCard, MailboxArticle,
         MailboxSettings, MessageArticle, MessageCard, PopoverSaveFilter,
         RelatedToContact, RelatedToOrganization } from '../../containers';
```

**Step 3: Build to check for errors**

```bash
moon run plugin-inbox:build 2>&1 | grep -v "Auth token DEPOT_TOKEN"
```
Expected: clean build (no TypeScript errors)

**Step 4: Fix any remaining import errors**

If there are errors about missing imports (e.g., relative paths in moved containers that still reference old paths), fix them now.

**Step 5: Run lint**

```bash
moon run plugin-inbox:lint -- --fix 2>&1 | grep -v "Auth token DEPOT_TOKEN"
```

**Step 6: Commit**

```bash
git add packages/plugins/plugin-inbox/src/components/index.ts
git add packages/plugins/plugin-inbox/src/capabilities/react-surface/react-surface.tsx
git commit -m "refactor(plugin-inbox): wire up containers in react-surface and clean up components/index.ts"
```

---

## Task 6: Clean up empty/broken component index files

After moving surface components, some `components/X/index.ts` files will have broken exports (e.g., `components/MessageCard/index.ts` exported `MessageCard` which no longer exists there).

**Step 1: Fix each affected index.ts**

For directories where the surface component was the ONLY export (MessageCard, EventCard, MailboxSettings):
- The `components/X/index.ts` can be deleted, OR
- Kept if sub-components need to be exported

Check each:
- `components/MessageCard/index.ts` — if only exported `MessageCard`, delete the directory
- `components/EventCard/index.ts` — if only exported `EventCard`, delete the directory
- `components/MailboxSettings/index.ts` — if only exported `MailboxSettings`, delete the directory

For directories with remaining primitives (MailboxArticle, MessageArticle, etc.):
- Update `index.ts` to only export remaining primitives

**Step 2: Check Related/index.ts**

`components/Related/index.ts` currently exports:
- `RelatedToContact` → REMOVED (moved to containers)
- `RelatedToOrganization` → REMOVED (moved to containers)
- `RelatedContacts`, `RelatedMessages`, `RelatedEvents` → KEEP (primitives)

Update to only export the remaining primitives.

**Step 3: Build again**

```bash
moon run plugin-inbox:build 2>&1 | grep -v "Auth token DEPOT_TOKEN"
```
Expected: clean build

**Step 4: Commit**

```bash
git add packages/plugins/plugin-inbox/src/components/
git commit -m "refactor(plugin-inbox): clean up components/ index files after container extraction"
```

---

## Task 7: Verify storybooks still work and update AGENTS.md

**Step 1: Check that storybook stories still reference correct component paths**

Run a quick check: grep for imports of moved components in stories files:
```bash
grep -r "MailboxArticle\|MessageArticle\|EventArticle\|CalendarArticle\|DraftMessageArticle" \
  packages/plugins/plugin-inbox/src/components --include="*.stories.tsx"
```

The stories test PRIMITIVE components (Mailbox.tsx, Message.tsx, etc.), so they should not be affected. Verify.

**Step 2: Build final check**

```bash
moon run plugin-inbox:build 2>&1 | grep -v "Auth token DEPOT_TOKEN"
```

**Step 3: Run lint**

```bash
moon run plugin-inbox:lint 2>&1 | grep -v "Auth token DEPOT_TOKEN"
```

**Step 4: Mark plugin-inbox complete in AGENTS.md**

In `packages/plugins/AGENTS.md`, change:
```markdown
- [ ] plugin-inbox
```
To:
```markdown
- [x] plugin-inbox
```

Also add learnings:
```markdown
## Learnings

- `MessageCard` and `EventCard` have no `@dxos/app-framework` hooks but are still surface components
  (referenced by react-surface) and must live in `containers/`.
- Surface components with complex sub-directories: only the surface file moves to `containers/`;
  primitive sub-components stay in `components/` with updated import paths.
- `PopoverSaveFilter` lived inside `MailboxArticle/` directory but is an independent surface;
  it gets its own `containers/PopoverSaveFilter/` directory.
```

**Step 5: Final commit**

```bash
git add packages/plugins/AGENTS.md
git commit -m "refactor(plugin-inbox): mark plugin-inbox refactor complete in AGENTS.md"
```
