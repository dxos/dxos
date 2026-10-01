//
// Copyright 2026 DXOS.org
//

// Two panes and the seam between them on Ark's splitter machine, which owns the drag, the keyboard resize, the
// `separator` role and its `aria-value*`, and the panes' lower bound. DXOS owns the vocabulary the app speaks: sizes in
// rem rather than percent, an `anchor` naming the pane the size measures, a `mode` that collapses to one pane, and a
// `collapseBelow` width under which the root shows one pane at a time (master-detail on a narrow host).

import { Splitter as SplitterPrimitive } from '@ark-ui/react/splitter';
import React, {
  type ComponentProps,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createContext, useControllableState } from '@dxos/react-hooks';
import { mx } from '@dxos/ui-theme';
import { type SlottableProps } from '@dxos/ui-types';

import { composableProps, slottable } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';

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

const SPLITTER_NAME = 'Next.Splitter';

type SplitterContextValue = {
  orientation: SplitterOrientation;
  transition: number;
  resizable: boolean;
  /** True only briefly after a `mode` change, so the collapse animates but layout reflows (resize) do not. */
  animating: boolean;
  /** The pane `anchoredSize` measures. */
  anchor: Position;
  /** The anchored pane's extent in rem while split, if known; the panes then size themselves without the machine. */
  anchoredSize?: number;
  /** The requested mode (`mode`/`defaultMode`), which `collapseBelow` may override. */
  mode: SplitterMode;
  /** The mode the panes actually show: `split` above `collapseBelow`, one pane below it. */
  visibleMode: SplitterMode;
  /** True while the root is narrower than `collapseBelow`, so one pane shows at a time. */
  collapsed: boolean;
  /** Requests a mode; reported through `onModeChange`, and stored unless `mode` is controlled. */
  setMode: Dispatch<SetStateAction<SplitterMode>>;
};

const [SplitterProvider, useSplitterContext] = createContext<SplitterContextValue>(SPLITTER_NAME);

const getRem = (): number => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

/** A `collapseBelow` length in px; rem (and em, read as rem) or px, since the root measures itself in px. */
const toPx = (length: string): number => {
  const match = /^\s*(\d*\.?\d+)\s*(rem|em|px)?\s*$/.exec(length);
  if (!match) {
    throw new Error(`Next.Splitter.Root: unsupported collapseBelow length '${length}' (use rem or px).`);
  }
  const value = parseFloat(match[1]);
  return match[2] === 'px' ? value : value * getRem();
};

/**
 * Whether the element is narrower than `collapseBelow`, measured before paint and on every resize. A container query
 * cannot drive this, because the panes' sizes and the context's `collapsed` are React state the machine consumes.
 */
const useNarrow = (root: RefObject<HTMLDivElement | null>, collapseBelow?: string): boolean => {
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element || collapseBelow === undefined) {
      setNarrow(false);
      return;
    }
    const threshold = toPx(collapseBelow);
    const update = (width: number) => setNarrow(width < threshold);
    update(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => update(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [root, collapseBelow]);
  return narrow;
};

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

const ROOT_NAME = 'Next.Splitter.Root';

type SplitterRootElementProps = {
  orientation?: SplitterOrientation;
  /** The pane(s) to show (controlled); `split` by default. Under `collapseBelow` it picks the one pane shown. */
  mode?: SplitterMode;
  defaultMode?: SplitterMode;
  onModeChange?: (mode: SplitterMode) => void;
  /**
   * A container width (CSS length in rem or px, e.g. `32rem`): narrower, the root shows only the `mode` pane (`split`
   * reads as `start`); wider, it shows both whatever the mode, so a selection that asked for the detail shows it beside
   * the list.
   */
  collapseBelow?: string;
  /** Which panel `size` measures (defaults to `start`); the other panel fills the remainder. */
  anchor?: Position;
  /** The anchored panel's extent in rem (controlled). */
  size?: number;
  defaultSize?: number;
  onSizeChange?: (size: number) => void;
  transition?: number;
  /** A draggable seam; when false (the default) the ResizeTrigger renders nothing and the sizes are fixed. */
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
      mode: modeProp,
      defaultMode = 'split',
      onModeChange,
      collapseBelow,
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
    const rootRef = useRef<HTMLDivElement>(null);
    const [requestedMode = 'split', setRequestedMode] = useControllableState<SplitterMode>({
      prop: modeProp,
      defaultProp: defaultMode,
      onChange: onModeChange,
    });
    const setMode = useCallback<Dispatch<SetStateAction<SplitterMode>>>(
      (next) => setRequestedMode((previous) => (typeof next === 'function' ? next(previous ?? 'split') : next)),
      [setRequestedMode],
    );
    const narrow = useNarrow(rootRef, collapseBelow);
    // `useNarrow` is false without `collapseBelow`, so only a root that opted in overrides the requested mode.
    const mode: SplitterMode =
      collapseBelow === undefined
        ? requestedMode
        : narrow
          ? requestedMode === 'split'
            ? 'start'
            : requestedMode
          : 'split';

    // Animate ONLY for a brief window right after a `mode` change (the collapse). The rest of the time the
    // transition is off, so layout reflows from a container/window resize never animate (no jitter) — this
    // avoids relying on observing/throttling resize events at all.
    const [animating, setAnimating] = useState(false);
    const previousMode = useRef(mode);
    // Flipped during render, not in an effect: the panes' new sizes commit in this very pass, and a
    // `transition` that arrives a render later finds nothing left to animate.
    if (previousMode.current !== mode) {
      previousMode.current = mode;
      if (transition > 0 && !animating) {
        setAnimating(true);
      }
    }
    // Keyed on the mode as well, so a change inside the window re-arms the timer rather than letting
    // the previous one expire mid-motion.
    useEffect(() => {
      if (!animating) {
        return;
      }
      const timer = setTimeout(() => setAnimating(false), transition);
      return () => clearTimeout(timer);
    }, [animating, transition, mode]);

    const collapsed = mode !== 'split';
    // The machine sizes panes in percent of the container and re-derives the anchored pane's share
    // a frame after the container resizes, so a neighbour animating its width made the seam lag and
    // snap. Tracked in rem here — the controlled prop, else the last drag — so the panes can carry
    // a fixed basis and let the flex layout absorb a container resize on the same frame.
    const [draggedSize, setDraggedSize] = useState(defaultSize);
    const anchoredSize = collapsed ? undefined : (sizeProp ?? draggedSize);
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
        if (collapsed) {
          return;
        }
        const percent = size[anchor === 'start' ? 0 : 1];
        if (percent !== undefined) {
          const rem = toRem(percent, rootRef, orientation);
          setDraggedSize(rem);
          onSizeChange?.(rem);
        }
      },
      [onSizeChange, collapsed, anchor, orientation],
    );

    const { className, ...rest } = composableProps(props);

    return (
      <SplitterProvider
        orientation={orientation}
        transition={transition}
        resizable={resizable}
        animating={animating}
        anchor={anchor}
        anchoredSize={anchoredSize}
        mode={requestedMode}
        visibleMode={mode}
        collapsed={narrow}
        setMode={setMode}
      >
        <SplitterPrimitive.Root
          {...rest}
          asChild={asChild}
          orientation={orientation}
          panels={panels}
          size={size}
          defaultSize={defaultSize === undefined ? undefined : anchoredSizes(defaultSize, anchor)}
          onResize={handleResize}
          data-collapsed={narrow ? '' : undefined}
          className={mx(recipes.splitter(), className)}
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

const PANEL_NAME = 'Next.Splitter.Panel';

type SplitterPanelProps = SlottableProps<{ position: Position }>;

const SplitterPanel = slottable<HTMLDivElement, { position: Position }>(
  ({ asChild, children, position, ...props }, forwardedRef) => {
    const { transition, animating, anchor, anchoredSize } = useSplitterContext(PANEL_NAME);
    const { className, style, ...rest } = composableProps(props);

    // Only animate during the brief post-mode-change window (collapse), never while dragging or on a plain
    // container/window resize — so the panels track layout reflows instantly without jitter.
    const animate = transition > 0 && animating;
    // While split with a known size, the anchored pane holds its rem and the other flexes, over the
    // machine's percent shares (see `anchoredSize` in the root). Longhands, because Ark merges style
    // objects key by key and the machine writes these three; a shorthand would sit beside them.
    const flex =
      anchoredSize === undefined
        ? undefined
        : position === anchor
          ? { flexGrow: 0, flexShrink: 0, flexBasis: `${anchoredSize}rem` }
          : { flexGrow: 1, flexShrink: 1, flexBasis: '0%' };

    return (
      <SplitterPrimitive.Panel
        {...rest}
        asChild={asChild}
        id={position}
        ref={forwardedRef}
        className={mx(recipes.splitterPanel(), className)}
        style={{
          transition: animate ? `flex-grow ${transition}ms ease-out, flex-basis ${transition}ms ease-out` : undefined,
          // A pane growing from nothing must be allowed to be small on the way: its lower bound
          // returns at once with the mode, and would hold it at `minSize` until the basis caught up.
          ...(animate && { minWidth: 0, minHeight: 0 }),
          ...flex,
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
// ResizeTrigger
//

const RESIZE_TRIGGER_NAME = 'Next.Splitter.ResizeTrigger';

type SplitterResizeTriggerProps = SlottableProps;

/** The seam: a 7px grab area straddling the panes around a 1px divider; rendered only when the root is `resizable`. */
const SplitterResizeTrigger = slottable<HTMLButtonElement>(({ asChild, children, ...props }, forwardedRef) => {
  const { orientation, resizable } = useSplitterContext(RESIZE_TRIGGER_NAME);
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
      className={mx(recipes.splitterResizeTrigger(), className)}
    >
      {children}
    </SplitterPrimitive.ResizeTrigger>
  );
});

SplitterResizeTrigger.displayName = RESIZE_TRIGGER_NAME;

//
// useContext
//

type SplitterContext = Pick<SplitterContextValue, 'mode' | 'visibleMode' | 'collapsed' | 'setMode' | 'orientation'>;

/** The nearest Splitter's mode state, for parts inside it: a master that opens its detail, a Back button when collapsed. */
const useSplitterPublicContext = (): SplitterContext => {
  const { mode, visibleMode, collapsed, setMode, orientation } = useSplitterContext('Next.Splitter.useContext');
  return { mode, visibleMode, collapsed, setMode, orientation };
};

//
// Splitter
//

export const Splitter = {
  Root: SplitterRoot,
  Panel: SplitterPanel,
  ResizeTrigger: SplitterResizeTrigger,
  useContext: useSplitterPublicContext,
};

export type {
  SplitterContext,
  SplitterMode,
  SplitterOrientation,
  SplitterPanelProps,
  SplitterResizeTriggerProps,
  SplitterRootProps,
};
