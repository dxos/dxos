//
// Copyright 2026 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useRef,
  useState,
} from 'react';

import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { composableProps, slottable } from '../../util';

type Orientation = 'horizontal' | 'vertical';

// Animated panel visibility: collapse to the start panel, the end panel, or show both split at `size`.
type SplitterMode = 'start' | 'end' | 'split';

type Position = 'start' | 'end';

//
// Context
//

const SPLITTER_NAME = 'Splitter';

type SplitterContextValue = {
  orientation: Orientation;
  mode: SplitterMode;
  /** Which panel `size` measures; the other panel fills the remainder. */
  anchor: Position;
  /** The anchored panel's extent in rem. */
  size: number;
  transition: number;
  resizable: boolean;
  /** Lower bound (rem) applied to both panels. */
  minSize: number;
  dragging: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  setSize: (size: number) => void;
  setDragging: (dragging: boolean) => void;
};

const [SplitterProvider, useSplitterContext] = createContext<SplitterContextValue>(SPLITTER_NAME);

// Lower-bound clamp applied to both panels: the start panel can't drop below `minSize` nor exceed the
// container minus `minSize` (reserving room for the end panel, which also carries the min).
const clampStyle = (minSize: number, orientation: Orientation): CSSProperties =>
  orientation === 'horizontal'
    ? { minInlineSize: `${minSize}rem`, maxInlineSize: `calc(100% - ${minSize}rem)` }
    : { minBlockSize: `${minSize}rem`, maxBlockSize: `calc(100% - ${minSize}rem)` };

const endMinStyle = (minSize: number, orientation: Orientation): CSSProperties =>
  orientation === 'horizontal' ? { minInlineSize: `${minSize}rem` } : { minBlockSize: `${minSize}rem` };

// In `split` mode the anchored panel is fixed at `size` rem (clamped) and the other fills the rest;
// otherwise one panel fills (flex-grow) and the other collapses to zero (content stays mounted, clipped).
const panelStyle = (
  position: Position,
  mode: SplitterMode,
  anchor: Position,
  size: number,
  minSize: number,
  orientation: Orientation,
): CSSProperties => {
  if (mode !== 'split') {
    const fills = (mode === 'start' && position === 'start') || (mode === 'end' && position === 'end');
    return { flexGrow: fills ? 1 : 0, flexShrink: 1, flexBasis: 0 };
  }

  return position === anchor
    ? { flexGrow: 0, flexShrink: 1, flexBasis: `${size}rem`, ...clampStyle(minSize, orientation) }
    : { flexGrow: 1, flexShrink: 1, flexBasis: 0, ...endMinStyle(minSize, orientation) };
};

// Absolute position for the handle, centered on the split point (`size` rem from the anchored edge).
const handlePosition = (orientation: Orientation, anchor: Position, size: number): CSSProperties => {
  const offset = `${size}rem`;
  if (orientation === 'horizontal') {
    return anchor === 'end'
      ? { insetBlock: 0, insetInlineEnd: offset, transform: 'translateX(50%)' }
      : { insetBlock: 0, insetInlineStart: offset, transform: 'translateX(-50%)' };
  }
  return anchor === 'end'
    ? { insetInline: 0, insetBlockEnd: offset, transform: 'translateY(50%)' }
    : { insetInline: 0, insetBlockStart: offset, transform: 'translateY(-50%)' };
};

//
// Root
//

const ROOT_NAME = 'Splitter.Root';

type SplitterRootElementProps = {
  orientation?: Orientation;
  mode?: SplitterMode;
  /** Which panel `size` measures (defaults to `start`); the other panel fills the remainder. */
  anchor?: Position;
  /** The anchored panel's extent in rem (controlled). */
  size?: number;
  defaultSize?: number;
  onSizeChange?: (size: number) => void;
  transition?: number;
  resizable?: boolean;
  /** Lower bound (rem) applied to both panels. */
  minSize?: number;
};

type SplitterRootProps = SlottableProps<SplitterRootElementProps>;

const SplitterRoot = slottable<HTMLDivElement, SplitterRootElementProps>(
  (
    {
      asChild,
      children,
      orientation = 'vertical',
      mode = 'split',
      anchor = 'start',
      size: sizeProp,
      defaultSize = 16,
      onSizeChange,
      transition = 250,
      resizable = false,
      minSize = 0,
      ...props
    },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs(forwardedRef, rootRef);
    const [size = defaultSize, setSize] = useControllableState({
      prop: sizeProp,
      defaultProp: defaultSize,
      onChange: onSizeChange,
    });
    const [dragging, setDragging] = useState(false);
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;

    return (
      <SplitterProvider
        orientation={orientation}
        mode={mode}
        anchor={anchor}
        size={size}
        transition={transition}
        resizable={resizable}
        minSize={minSize}
        dragging={dragging}
        rootRef={rootRef}
        setSize={setSize}
        setDragging={setDragging}
      >
        <Comp {...rest} ref={composedRef} className={tx('splitter.root', { orientation }, className)}>
          {children}
        </Comp>
      </SplitterProvider>
    );
  },
);

SplitterRoot.displayName = ROOT_NAME;

//
// Panel
//

const PANEL_NAME = 'Splitter.Panel';

type SplitterPanelProps = SlottableProps<{ position: Position }>;

const SplitterPanel = slottable<HTMLDivElement, { position: Position }>(
  ({ asChild, children, position, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { orientation, mode, anchor, size, minSize, transition, dragging } = useSplitterContext(PANEL_NAME);
    const { className, style, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;

    // Disable the animation while dragging so the panel tracks the pointer; otherwise animate collapse.
    const animate = transition > 0 && !dragging;

    return (
      <Comp
        {...rest}
        ref={forwardedRef}
        className={tx('splitter.panel', {}, className)}
        style={{
          ...panelStyle(position, mode, anchor, size, minSize, orientation),
          transition: animate ? `flex-grow ${transition}ms ease-out, flex-basis ${transition}ms ease-out` : undefined,
          ...style,
        }}
      >
        {children}
      </Comp>
    );
  },
);

SplitterPanel.displayName = PANEL_NAME;

//
// Handle
//

const HANDLE_NAME = 'Splitter.Handle';

type SplitterHandleProps = SlottableProps;

const getRem = (): number => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

const SplitterHandle = slottable<HTMLDivElement>(({ asChild, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { orientation, anchor, size, resizable, minSize, rootRef, setSize, setDragging } =
    useSplitterContext(HANDLE_NAME);
  const { className, ...rest } = composableProps(props);
  const Comp = asChild ? Slot : Primitive.div;

  // Container extent (rem) along the split axis; the upper bound is `extent - minSize`.
  const extentRem = useCallback((): number => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) {
      return size + minSize;
    }
    return (orientation === 'horizontal' ? rect.width : rect.height) / getRem();
  }, [orientation, rootRef, size, minSize]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    },
    [setDragging],
  );

  // Map the pointer position within the Root to the anchored panel's extent (rem), clamped so neither
  // panel drops below `minSize`. For an `end` anchor the extent is measured from the far edge.
  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        return;
      }
      const root = rootRef.current;
      if (!root) {
        return;
      }
      const rect = root.getBoundingClientRect();
      const rem = getRem();
      const offset = (orientation === 'horizontal' ? event.clientX - rect.left : event.clientY - rect.top) / rem;
      const extent = (orientation === 'horizontal' ? rect.width : rect.height) / rem;
      const next = anchor === 'end' ? extent - offset : offset;
      setSize(Math.min(Math.max(next, minSize), Math.max(minSize, extent - minSize)));
    },
    [orientation, anchor, minSize, rootRef, setSize],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setDragging(false);
    },
    [setDragging],
  );

  // Arrow keys nudge the start panel's size (rem); Home/End jump to the bounds. Keeps the resize affordance
  // usable without a pointer.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const horizontal = orientation === 'horizontal';
      const step = event.shiftKey ? 4 : 1;
      let next: number | undefined;
      if (event.key === (horizontal ? 'ArrowRight' : 'ArrowDown')) {
        next = size + step;
      } else if (event.key === (horizontal ? 'ArrowLeft' : 'ArrowUp')) {
        next = size - step;
      } else if (event.key === 'Home') {
        next = minSize;
      } else if (event.key === 'End') {
        next = extentRem() - minSize;
      }
      if (next === undefined) {
        return;
      }
      event.preventDefault();
      setSize(Math.min(Math.max(next, minSize), Math.max(minSize, extentRem() - minSize)));
    },
    [orientation, size, minSize, extentRem, setSize],
  );

  if (!resizable) {
    return null;
  }

  return (
    <Comp
      {...rest}
      ref={forwardedRef}
      role='separator'
      tabIndex={0}
      aria-orientation={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
      aria-valuemin={Math.round(minSize)}
      aria-valuenow={Math.round(size)}
      className={tx('splitter.handle', { orientation }, className)}
      style={handlePosition(orientation, anchor, size)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      {children}
    </Comp>
  );
});

SplitterHandle.displayName = HANDLE_NAME;

//
// Splitter
//

const Splitter = {
  Root: SplitterRoot,
  Panel: SplitterPanel,
  Handle: SplitterHandle,
};

export { Splitter };

export type {
  Orientation as SplitterOrientation,
  SplitterMode,
  SplitterRootProps,
  SplitterPanelProps,
  SplitterHandleProps,
};
