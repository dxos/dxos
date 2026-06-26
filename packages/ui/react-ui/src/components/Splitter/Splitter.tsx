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
  useEffect,
  useRef,
  useState,
} from 'react';

import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { composableProps, slottable } from '../../util';

type SplitterOrientation = 'horizontal' | 'vertical';

// Animated panel visibility: collapse to the start panel, the end panel, or show both split at `size`.
type SplitterMode = 'start' | 'end' | 'split';

type Position = 'start' | 'end';

//
// Context
//

const SPLITTER_NAME = 'Splitter';

type SplitterContextValue = {
  orientation: SplitterOrientation;
  mode: SplitterMode;
  /** Which panel `size` measures; the other panel fills the remainder. */
  anchor: Position;
  /** The anchored panel's extent in rem, or `undefined` for an even (50/50) split. */
  size: number | undefined;
  transition: number;
  resizable: boolean;
  /** Lower bound (rem) applied to both panels. */
  minSize: number;
  dragging: boolean;
  /** True only briefly after a `mode` change, so the collapse animates but layout reflows (resize) do not. */
  animating: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  setSize: (size: number) => void;
  setDragging: (dragging: boolean) => void;
};

const [SplitterProvider, useSplitterContext] = createContext<SplitterContextValue>(SPLITTER_NAME);

const getRem = (): number => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

// Lower-bound clamp applied to both panels: the start panel can't drop below `minSize` nor exceed the
// container minus `minSize` (reserving room for the end panel, which also carries the min).
const clampStyle = (minSize: number, orientation: SplitterOrientation): CSSProperties =>
  orientation === 'horizontal'
    ? { minInlineSize: `${minSize}rem`, maxInlineSize: `calc(100% - ${minSize}rem)` }
    : { minBlockSize: `${minSize}rem`, maxBlockSize: `calc(100% - ${minSize}rem)` };

const endMinStyle = (minSize: number, orientation: SplitterOrientation): CSSProperties =>
  orientation === 'horizontal' ? { minInlineSize: `${minSize}rem` } : { minBlockSize: `${minSize}rem` };

// In `split` mode the anchored panel is fixed at `size` rem (clamped) and the other fills the rest; when
// `size` is undefined both panels grow equally (50/50). Otherwise one panel fills (flex-grow) and the
// other collapses to zero (content stays mounted, clipped).
const panelStyle = (
  position: Position,
  mode: SplitterMode,
  anchor: Position,
  size: number | undefined,
  minSize: number,
  orientation: SplitterOrientation,
): CSSProperties => {
  if (mode !== 'split') {
    const fills = (mode === 'start' && position === 'start') || (mode === 'end' && position === 'end');
    return { flexGrow: fills ? 1 : 0, flexShrink: 1, flexBasis: 0 };
  }

  // No explicit size: split evenly.
  if (size === undefined) {
    return { flexGrow: 1, flexShrink: 1, flexBasis: 0, ...endMinStyle(minSize, orientation) };
  }

  return position === anchor
    ? { flexGrow: 0, flexShrink: 1, flexBasis: `${size}rem`, ...clampStyle(minSize, orientation) }
    : { flexGrow: 1, flexShrink: 1, flexBasis: 0, ...endMinStyle(minSize, orientation) };
};

// Absolute position for the handle, centered on the split point (`size` rem from the anchored edge, or
// the middle for an even split). The offset is clamped to the same bounds as the anchored panel
// (`minSize` .. `100% - minSize`) so a sudden container shrink (e.g. opening devtools) that caps the
// panel keeps the handle pinned to the panel edge instead of floating into the other panel.
const handlePosition = (
  orientation: SplitterOrientation,
  anchor: Position,
  size: number | undefined,
  minSize: number,
): CSSProperties => {
  if (size === undefined) {
    return orientation === 'horizontal'
      ? { insetBlock: 0, insetInlineStart: '50%', transform: 'translateX(-50%)' }
      : { insetInline: 0, insetBlockStart: '50%', transform: 'translateY(-50%)' };
  }

  const offset = `clamp(${minSize}rem, ${size}rem, calc(100% - ${minSize}rem))`;
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
  orientation?: SplitterOrientation;
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
      defaultSize,
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
    const [size, setSize] = useControllableState({
      prop: sizeProp,
      defaultProp: defaultSize,
      onChange: onSizeChange,
    });
    const [dragging, setDragging] = useState(false);

    // Animate ONLY for a brief window right after a `mode` change (the collapse). The rest of the time the
    // transition is off, so layout reflows from a container/window resize never animate (no jitter) — this
    // avoids relying on observing/throttling resize events at all.
    const [animating, setAnimating] = useState(false);
    const previousMode = useRef(mode);
    useEffect(() => {
      if (previousMode.current === mode) {
        return;
      }
      previousMode.current = mode;
      if (transition <= 0) {
        return;
      }
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), transition);
      return () => clearTimeout(timer);
    }, [mode, transition]);

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
        animating={animating}
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
    const { orientation, mode, anchor, size, minSize, transition, dragging, animating } =
      useSplitterContext(PANEL_NAME);
    const { className, style, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;

    // Only animate during the brief post-mode-change window (collapse), never while dragging or on a plain
    // container/window resize — so the panels track layout reflows instantly without jitter.
    const animate = transition > 0 && animating && !dragging;

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
      return (size ?? minSize) + minSize;
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

  // Arrow keys nudge the start panel's size (rem); Home/End jump to the bounds.
  // Keeps the resize affordance usable without a pointer.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const horizontal = orientation === 'horizontal';
      const step = event.shiftKey ? 4 : 1;
      // Start from the current size, or the midpoint when the split is even (unsized).
      const base = size ?? extentRem() / 2;
      let next: number | undefined;
      if (event.key === (horizontal ? 'ArrowRight' : 'ArrowDown')) {
        next = base + step;
      } else if (event.key === (horizontal ? 'ArrowLeft' : 'ArrowUp')) {
        next = base - step;
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
      aria-valuenow={size !== undefined ? Math.round(size) : undefined}
      className={tx('splitter.handle', { orientation }, className)}
      style={handlePosition(orientation, anchor, size, minSize)}
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

export type { SplitterOrientation, SplitterMode, SplitterRootProps, SplitterPanelProps, SplitterHandleProps };
