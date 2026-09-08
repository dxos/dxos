//
// Copyright 2026 DXOS.org
//

// `Splitter` — two panes and the seam between them, built on `@ark-ui/react`'s Splitter (zag state
// machine). The machine owns the drag (pointer capture, the global resize cursor), the keyboard
// resize, the `separator` role and its `aria-value*`, the lower bound on both panes, and keeping the
// anchored pane's width across a container resize. DXOS owns the pane vocabulary the app speaks:
// sizes in rem rather than percent, an `anchor` saying which pane the size measures, and a `mode`
// that collapses to one pane or the other with an animation.

import { Splitter as SplitterPrimitive } from '@ark-ui/react/splitter';
import React, { type ComponentProps, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createContext } from '@dxos/react-hooks';
import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { composableProps, slottable } from '../../util';

type SplitterOrientation = 'horizontal' | 'vertical';

// Animated panel visibility: collapse to the start panel, the end panel, or show both split at `size`.
type SplitterMode = 'start' | 'end' | 'split';

type Position = 'start' | 'end';

/** A pane extent as the machine takes it: a bare number is a percentage, a string carries its unit. */
type PanelSize = NonNullable<ComponentProps<typeof SplitterPrimitive.Root>['size']>[number];

/** The seam sits between the two panes, which is the only pair there is. */
const RESIZE_TRIGGER_ID = 'start:end';

//
// Context
//

const SPLITTER_NAME = 'Splitter';

type SplitterContextValue = {
  orientation: SplitterOrientation;
  transition: number;
  resizable: boolean;
  /** True only briefly after a `mode` change, so the collapse animates but layout reflows (resize) do not. */
  animating: boolean;
};

const [SplitterProvider, useSplitterContext] = createContext<SplitterContextValue>(SPLITTER_NAME);

const getRem = (): number => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

/**
 * The size array the machine takes, with the pane that is not anchored left as a hole for it to
 * fill from the remainder — the machine reads each index independently, so the pane it finds nothing
 * for is the one that flexes.
 */
const anchoredSizes = (size: number, anchor: Position): PanelSize[] => {
  const sizes: PanelSize[] = [];
  sizes[anchor === 'start' ? 0 : 1] = `${size}rem`;
  return sizes;
};

/** The machine reports percentages; the app speaks rem, measured along the split axis. */
const toRem = (percent: number, root: RefObject<HTMLDivElement | null>, orientation: SplitterOrientation): number => {
  const rect = root.current?.getBoundingClientRect();
  if (!rect) {
    return 0;
  }
  const extent = orientation === 'horizontal' ? rect.width : rect.height;
  return ((percent / 100) * extent) / getRem();
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

    const collapsed = mode !== 'split';
    const panels = useMemo(
      () => [
        {
          id: 'start' as const,
          // A collapsed pane has to be allowed to reach zero, which its own lower bound would
          // otherwise hold it above.
          minSize: mode === 'end' ? '0%' : `${minSize}rem`,
          // The anchored pane keeps its width when the container changes size; the other absorbs it.
          resizeBehavior: anchor === 'start' ? ('preserve-pixel-size' as const) : undefined,
        },
        {
          id: 'end' as const,
          minSize: mode === 'start' ? '0%' : `${minSize}rem`,
          resizeBehavior: anchor === 'end' ? ('preserve-pixel-size' as const) : undefined,
        },
      ],
      [mode, anchor, minSize],
    );

    const size = useMemo<PanelSize[] | undefined>(() => {
      if (mode === 'start') {
        return ['100%', '0%'];
      }
      if (mode === 'end') {
        return ['0%', '100%'];
      }
      return sizeProp === undefined ? undefined : anchoredSizes(sizeProp, anchor);
    }, [mode, sizeProp, anchor]);

    const handleResize = useCallback(
      ({ size }: { size: number[] }) => {
        // A collapse is the caller's own instruction coming back; reporting it would overwrite the
        // size the panes return to.
        if (!onSizeChange || collapsed) {
          return;
        }
        const percent = size[anchor === 'start' ? 0 : 1];
        if (percent !== undefined) {
          onSizeChange(toRem(percent, rootRef, orientation));
        }
      },
      [onSizeChange, collapsed, anchor, orientation],
    );

    const { className, ...rest } = composableProps(props);

    return (
      <SplitterProvider orientation={orientation} transition={transition} resizable={resizable} animating={animating}>
        <SplitterPrimitive.Root
          {...rest}
          asChild={asChild}
          orientation={orientation}
          panels={panels}
          size={size}
          defaultSize={defaultSize === undefined ? undefined : anchoredSizes(defaultSize, anchor)}
          onResize={handleResize}
          className={tx('splitter.root', { orientation }, className)}
          ref={(element) => {
            rootRef.current = element;
            if (typeof forwardedRef === 'function') {
              forwardedRef(element);
            } else if (forwardedRef) {
              forwardedRef.current = element;
            }
          }}
        >
          {children}
        </SplitterPrimitive.Root>
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
    const { transition, animating } = useSplitterContext(PANEL_NAME);
    const { className, style, ...rest } = composableProps(props);

    // Only animate during the brief post-mode-change window (collapse), never while dragging or on a plain
    // container/window resize — so the panels track layout reflows instantly without jitter.
    const animate = transition > 0 && animating;

    return (
      <SplitterPrimitive.Panel
        {...rest}
        asChild={asChild}
        id={position}
        ref={forwardedRef}
        className={tx('splitter.panel', {}, className)}
        style={{
          transition: animate ? `flex-grow ${transition}ms ease-out, flex-basis ${transition}ms ease-out` : undefined,
          ...style,
        }}
      >
        {children}
      </SplitterPrimitive.Panel>
    );
  },
);

SplitterPanel.displayName = PANEL_NAME;

//
// Handle
//

const HANDLE_NAME = 'Splitter.Handle';

type SplitterHandleProps = SlottableProps;

const SplitterHandle = slottable<HTMLButtonElement>(({ asChild, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { orientation, resizable } = useSplitterContext(HANDLE_NAME);
  const { className, ...rest } = composableProps(props);

  if (!resizable) {
    return null;
  }

  return (
    <SplitterPrimitive.ResizeTrigger
      {...rest}
      asChild={asChild}
      id={RESIZE_TRIGGER_ID}
      // The machine renders a button, which submits the form around it unless told otherwise.
      type='button'
      ref={forwardedRef}
      // A separator's orientation is its own, not the group's: panes side by side are parted by a
      // vertical line. The machine reports the group's.
      aria-orientation={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
      className={tx('splitter.handle', { orientation }, className)}
    >
      {children}
    </SplitterPrimitive.ResizeTrigger>
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

export type { SplitterHandleProps, SplitterMode, SplitterOrientation, SplitterPanelProps, SplitterRootProps };
