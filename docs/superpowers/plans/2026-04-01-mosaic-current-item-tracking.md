# Mosaic Current-Item Tracking (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move current-item tracking from `MessageStack`'s custom context into `Mosaic.Container`, eliminating the complex focus-restoration logic in `MessageStack`.

**Architecture:** `Mosaic.Container` gains `current` (item ID) and `onCurrentChange` props, exposed via its context as `current` and `setCurrent`. `Mosaic.VirtualStack`/`Stack` pass a `current` boolean to each Tile component. `MessageTile` calls `setCurrent` on click instead of using a private `MessageStackContext`.

**Tech Stack:** React, @radix-ui/react-context, @dxos/react-ui-mosaic, @dxos/react-ui (Focus)

---

### Task 1: Add `current`/`setCurrent` to `Mosaic.Container` context

**Files:**
- Modify: `packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx`

- [ ] **Step 1: Add `current` and `onCurrentChange` to props and context types**

In `packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx`, update `MosaicContainerContextValue` and `MosaicContainerProps`:

```typescript
type MosaicContainerContextValue<TData = any, Location = LocationType> = {
  id: string;
  eventHandler: MosaicEventHandler<TData>;
  orientation?: AllowedAxis;
  dragging?: MosaicDraggingState;
  scrolling?: boolean;
  state: MosaicContainerState;

  /** Active drop location. */
  activeLocation?: Location;
  setActiveLocation: (location: Location | undefined) => void;

  /** ID of the current (aria-current) item. */
  current?: string;
  /** Set the current item by ID. */
  setCurrent: (id: string | undefined) => void;
};
```

Add `current` and `onCurrentChange` to `MosaicContainerProps`:

```typescript
type MosaicContainerProps = PropsWithChildren<
  Partial<Pick<MosaicContainerContextValue, 'eventHandler' | 'orientation'>> & {
    asChild?: boolean;
    autoScroll?: HTMLElement | null;
    withFocus?: boolean;
    /** Controlled current-item ID. */
    current?: string;
    /** Called when a tile requests to become current. */
    onCurrentChange?: (id: string | undefined) => void;
    debug?: () => ReactNode;
  }
>;
```

- [ ] **Step 2: Wire up `current`/`setCurrent` in the component body**

In the `MosaicContainer` component destructuring, add `current` and `onCurrentChange`:

```typescript
const MosaicContainer = composable<HTMLDivElement, MosaicContainerProps>(
  (
    {
      children,
      eventHandler: eventHandlerProp,
      orientation = 'vertical',
      asChild,
      autoScroll: autoscrollElement,
      withFocus,
      current,
      onCurrentChange,
      debug,
      ...props
    },
    forwardedRef,
  ) => {
```

Create a stable `setCurrent` callback:

```typescript
    const setCurrent = useCallback(
      (id: string | undefined) => onCurrentChange?.(id),
      [onCurrentChange],
    );
```

Add `useCallback` to the React import at the top of the file.

Pass `current` and `setCurrent` to `MosaicContainerContextProvider`:

```tsx
      <MosaicContainerContextProvider
        id={eventHandler.id}
        eventHandler={eventHandler}
        orientation={orientation}
        state={state}
        dragging={state.type === 'active' ? dragging : undefined}
        scrolling={scrolling}
        activeLocation={activeLocation}
        setActiveLocation={setActiveLocation}
        current={current}
        setCurrent={setCurrent}
      >
```

- [ ] **Step 3: Build and verify**

Run: `cd packages/ui/react-ui-mosaic && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx
git commit -m "feat(react-ui-mosaic): add current/setCurrent to Container context"
```

---

### Task 2: Add `current` prop to `MosaicTileProps` and pass it from Stack/VirtualStack

**Files:**
- Modify: `packages/ui/react-ui-mosaic/src/components/Mosaic/Tile.tsx`
- Modify: `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx`

- [ ] **Step 1: Add `current` to `MosaicTileProps`**

In `packages/ui/react-ui-mosaic/src/components/Mosaic/Tile.tsx`, add `current` to the type:

```typescript
type MosaicTileProps<TData = any, TLocation = LocationType> = ThemedClassName<
  PropsWithChildren<{
    className?: string;
    dragHandle?: HTMLElement | null;
    allowedEdges?: Edge[];
    id: string;
    data: TData;
    location: TLocation;
    draggable?: boolean;
    /** Whether this tile is the current (aria-current) item. */
    current?: boolean;
    debug?: boolean;
  }>
>;
```

In the `MosaicTile` component destructuring, add `current: _current` (unused in Tile itself — consumed by the custom tile component like MessageTile):

```typescript
const MosaicTile = slottable<HTMLDivElement, MosaicTileProps>(
  (
    {
      children,
      asChild,
      dragHandle,
      allowedEdges: allowedEdgesProp,
      location,
      id,
      data: dataProp,
      draggable: draggableProp,
      current: _current,
      debug: _,
      ...props
    },
    forwardedRef,
  ) => {
```

- [ ] **Step 2: Pass `current` from `MosaicStack`**

In `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx`, update the `MosaicStackInner` component to read `current` from container context and pass it to each Tile:

```typescript
const MosaicStackInner = composable<HTMLDivElement, MosaicStackProps>(
  (
    { getId, orientation: orientationProp = 'vertical', items, Tile, draggable = true, debug, ...props },
    forwardedRef,
  ) => {
    invariant(Tile);
    const { id, orientation = orientationProp, dragging, current } = useMosaicContainerContext(MOSAIC_STACK_NAME);
    const visibleItems = useVisibleItems({ id, items, dragging: dragging?.source.data, getId });
    invariant(orientation === 'vertical' || orientation === 'horizontal', `Invalid orientation: ${orientation}`);

    return (
      <div
        {...composableProps(props, {
          role: 'list',
          classNames: [
            'flex',
            orientation === 'horizontal' && 'h-full [&>*]:shrink-0',
            orientation === 'vertical' && 'flex-col',
          ],
        })}
        ref={forwardedRef}
      >
        {draggable && <InternalPlaceholder orientation={orientation} location={0.5} />}
        {visibleItems?.map((item, index) => (
          <Fragment key={getId(item)}>
            <Tile id={getId(item)} data={item} location={index + 1} draggable={draggable} current={getId(item) === current} debug={debug} />
            {draggable && <InternalPlaceholder orientation={orientation} location={index + 1.5} />}
          </Fragment>
        ))}
      </div>
    );
  },
);
```

- [ ] **Step 3: Pass `current` from `MosaicVirtualStack`**

In the same file, update `MosaicVirtualStackInner` to read `current` from context and pass it to each Tile. Change the `useMosaicContainerContext` call:

```typescript
const { id, dragging, current } = useMosaicContainerContext(MOSAIC_VIRTUAL_STACK_NAME);
```

And update the Tile rendering inside the virtualItems map:

```tsx
{data ? (
  <Tile id={getId(data)} data={data} location={location} draggable={draggable} current={getId(data) === current} debug={debug} />
) : (
  <InternalPlaceholder orientation={orientation} location={location} />
)}
```

- [ ] **Step 4: Build and verify**

Run: `cd packages/ui/react-ui-mosaic && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-mosaic/src/components/Mosaic/Tile.tsx packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx
git commit -m "feat(react-ui-mosaic): pass current boolean to Tile components from Stack"
```

---

### Task 3: Simplify `MessageStack` and `MessageTile`

**Files:**
- Modify: `packages/plugins/plugin-inbox/src/components/MessageStack/MessageStack.tsx`

- [ ] **Step 1: Update imports**

Replace the imports at the top of `MessageStack.tsx`:

```typescript
import React, { type KeyboardEvent, type MouseEvent, forwardRef, useCallback, useMemo } from 'react';

import { DxAvatar } from '@dxos/lit-ui/react';
import { Card, ScrollArea } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { type Message } from '@dxos/types';
import { composable, composableProps, getHashStyles } from '@dxos/ui-theme';

import { GoogleMail } from '../../apis';
import { type Mailbox as MailboxType } from '../../types';
import { getMessageProps } from '../../util';
```

Note: removed `useState`, `useEffect`, `useLayoutEffect`, `useRef`, `addEventListener`, `combine`, `createContext`. Added `useMosaicContainer` import.

- [ ] **Step 2: Remove `MessageStackContextValue` and context**

Delete the entire Context section (lines 29-37 of the original file):

```typescript
// DELETE:
// const MESSAGE_STACK_NAME = 'MessageStack';
// type MessageStackContextValue = { currentMessageId?: string };
// const [MessageStackProvider, useMessageStackContext] = createContext<MessageStackContextValue>(MESSAGE_STACK_NAME);
```

Keep the action types as-is:

```typescript
export type MessageStackAction =
  | { type: 'current'; messageId: string }
  | { type: 'select'; messageId: string }
  | { type: 'select-tag'; label: string }
  | { type: 'save'; filter: string };

export type MessageStackActionHandler = (action: MessageStackAction) => void;
```

- [ ] **Step 3: Rewrite `MessageTile` to use container context**

Replace `MessageTile` with:

```typescript
type MessageTileData = {
  message: Message.Message;
  labels?: MailboxType.Labels;
  onAction?: MessageStackActionHandler;
};

type MessageTileProps = Pick<MosaicTileProps<MessageTileData>, 'location' | 'data' | 'current'>;

const MessageTile = forwardRef<HTMLDivElement, MessageTileProps>(({ data, location, current }, forwardedRef) => {
  const { message, labels, onAction } = data;
  const { hue, from, date, subject, snippet } = getMessageProps(message, new Date(), true);
  const { setCurrent } = useMosaicContainer('MessageTile');

  const handleCurrentChange = useCallback(() => {
    setCurrent(message.id);
    onAction?.({ type: 'current', messageId: message.id });
  }, [message.id, setCurrent, onAction]);

  const handleAvatarClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      onAction?.({ type: 'select', messageId: message.id });
    },
    [message.id, onAction],
  );

  const handleTagClick = useCallback(
    (event: MouseEvent, label: string) => {
      event.stopPropagation();
      onAction?.({ type: 'select-tag', label });
    },
    [onAction],
  );

  const messageLabels = useMemo(() => {
    if (!labels || !Array.isArray(message.properties?.labels)) {
      return [];
    }

    return message.properties.labels
      .filter((labelId: string) => !GoogleMail.isSystemLabel(labelId))
      .map((labelId: string) => ({
        id: labelId,
        hue: getHashStyles(labelId).hue,
        label: labels[labelId],
      }))
      .filter((item) => item.label);
  }, [labels, message.properties?.labels]);

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current dx-selected' id={message.id} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root ref={forwardedRef} data-message-id={message.id}>
          <Card.Toolbar>
            <Card.IconBlock>
              <DxAvatar
                hue={hue}
                hueVariant='surface'
                variant='square'
                size={6}
                fallback={from}
                onClick={handleAvatarClick}
              />
            </Card.IconBlock>
            <Card.Title classNames='flex items-center gap-3'>
              <span className='grow truncate font-medium'>{subject}</span>
              <span className='text-xs text-description whitespace-nowrap shrink-0'>{date}</span>
            </Card.Title>
            <Card.Menu />
          </Card.Toolbar>
          <Card.Content>
            <Card.Row icon='ph--user--regular'>
              <Card.Text>{from}</Card.Text>
            </Card.Row>
            {snippet && (
              <Card.Row>
                <Card.Text variant='description'>{snippet}</Card.Text>
              </Card.Row>
            )}
            {messageLabels.length > 0 && (
              <Card.Row>
                <div role='none' className='flex flex-wrap gap-1 py-1'>
                  {messageLabels.map(({ id: labelId, label, hue: labelHue }) => (
                    <button
                      key={labelId}
                      type='button'
                      className='dx-tag dx-focus-ring'
                      data-hue={labelHue}
                      data-label={label}
                      onClick={(event) => handleTagClick(event, label)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Card.Row>
            )}
          </Card.Content>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

MessageTile.displayName = 'MessageTile';
```

Key changes:
- `MessageTileProps` now picks `'current'` in addition to `'location' | 'data'`.
- Reads `setCurrent` from `useMosaicContainer` instead of `useMessageStackContext`.
- `current` comes from the prop (passed by VirtualStack) instead of comparing against context `currentMessageId`.
- `handleCurrentChange` calls `setCurrent(message.id)` AND `onAction`.

- [ ] **Step 4: Rewrite `MessageStack` to remove focus management**

Replace the `MessageStack` component with:

```typescript
export type MessageStackProps = {
  id: string;
  messages: Message.Message[];
  labels?: MailboxType.Labels;
  currentMessageId?: string;
  ignoreAttention?: boolean;
  onAction?: MessageStackActionHandler;
};

/**
 * Card-based message stack component using mosaic layout.
 */
export const MessageStack = composable<HTMLDivElement, MessageStackProps>(
  ({ messages, labels, currentMessageId, onAction, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const items = useMemo(
      () => messages.map((message) => ({ message, labels, onAction })),
      [messages, labels, onAction],
    );

    const handleCurrentChange = useCallback(
      (id: string | undefined) => {
        if (id) {
          onAction?.({ type: 'current', messageId: id });
        }
      },
      [onAction],
    );

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.click();
      }
    }, []);

    return (
      <Focus.Group {...composableProps(props)} asChild onKeyDown={handleKeyDown} ref={forwardedRef}>
        <Mosaic.Container asChild withFocus autoScroll={viewport} current={currentMessageId} onCurrentChange={handleCurrentChange}>
          <ScrollArea.Root orientation='vertical' padding>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={MessageTile}
                classNames='my-2'
                gap={8}
                items={items}
                getId={(item) => item.message.id}
                getScrollElement={() => viewport}
                estimateSize={() => 150}
                draggable={false}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </Focus.Group>
    );
  },
);

MessageStack.displayName = 'MessageStack';
```

Key removals:
- `MessageStackProvider` wrapper — gone.
- `stackRef`, `focusedItemId`, `focusNonce` refs — gone.
- `useEffect` for focus/blur tracking — gone.
- `useLayoutEffect` for focus restoration — gone.
- `handleChange` / `onChange` on VirtualStack — gone.

Note: `useState` is still needed for `viewport`. Add it back to the import.

- [ ] **Step 5: Fix imports to include `useState`**

The final import block should be:

```typescript
import React, { type KeyboardEvent, type MouseEvent, forwardRef, useCallback, useMemo, useState } from 'react';
```

- [ ] **Step 6: Build and verify**

Run: `cd packages/plugins/plugin-inbox && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 7: Verify storybook renders**

Run: `moon run storybook-react:serve`
Open the MessageStack story and verify:
- Messages render in a scrollable virtualized list.
- Clicking a tile highlights it (aria-current).
- Arrow keys navigate between tiles.
- The selected tile survives scrolling out of view and back.

- [ ] **Step 8: Commit**

```bash
git add packages/plugins/plugin-inbox/src/components/MessageStack/MessageStack.tsx
git commit -m "refactor(plugin-inbox): use Mosaic.Container current-item tracking in MessageStack"
```

---

### Task 4: Update TASKS.md checkboxes

**Files:**
- Modify: `packages/plugins/plugin-inbox/src/TASKS.md`

- [ ] **Step 1: Mark Phase 1 items as complete**

Update the Phase 1 checkboxes in `packages/plugins/plugin-inbox/src/TASKS.md`:

```markdown
## Phase 1

MessageStack tracks the current (aria-current) focused item via MessageStackContextValue.
It contains some complex logic to detect and track the current focus and restore it when the virtual stack scrolls the item back into view.

- [x] Remove `MessageStackContextValue` and instead track the `currentItem` in `Mosaic.Container`'s context.
- [x] Remove the custom focus management, `useLayoutEffect`, and `onChange` callback in `MessageStack`.
- [x] `useMosaicContainerContext` should expose `setCurrent` to allow Tiles to set the current item (e.g., if clicked).
- [x] `Mosaic.Tile` should be passed a boolean, `current` if it is the current item.
- [x] `MessageTile` should use `setCurrent` to set the current item when clicked (via `Focus.Item`'s callback).
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugins/plugin-inbox/src/TASKS.md
git commit -m "docs: mark Phase 1 tasks complete"
```
