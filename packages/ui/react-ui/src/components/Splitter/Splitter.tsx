//
// Copyright 2026 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type PointerEvent, type RefObject, useCallback, useRef, useState } from 'react';

import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { composableProps, slottable } from '../../util';

type Orientation = 'horizontal' | 'vertical';

// Animated panel visibility: collapse to the start panel, the end panel, or show both at `ratio`.
type SplitterMode = 'start' | 'end' | 'split';

type Position = 'start' | 'end';

//
// Context
//

const SPLITTER_NAME = 'Splitter';

type SplitterContextValue = {
  orientation: Orientation;
  mode: SplitterMode;
  ratio: number;
  transition: number;
  resizable: boolean;
  minRatio: number;
  maxRatio: number;
  dragging: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  setRatio: (ratio: number) => void;
  setDragging: (dragging: boolean) => void;
};

const [SplitterProvider, useSplitterContext] = createContext<SplitterContextValue>(SPLITTER_NAME);

// Flex-grow share allotted to a panel: governed by `ratio` when both are visible, otherwise 1/0 so the
// collapsed panel shrinks to zero (its content stays mounted but clipped).
const panelGrow = (position: Position, mode: SplitterMode, ratio: number): number => {
  switch (mode) {
    case 'start':
      return position === 'start' ? 1 : 0;
    case 'end':
      return position === 'start' ? 0 : 1;
    default:
      return position === 'start' ? ratio : 1 - ratio;
  }
};

//
// Root
//

const ROOT_NAME = 'Splitter.Root';

type SplitterRootElementProps = {
  orientation?: Orientation;
  mode?: SplitterMode;
  ratio?: number;
  defaultRatio?: number;
  onRatioChange?: (ratio: number) => void;
  transition?: number;
  resizable?: boolean;
  minRatio?: number;
  maxRatio?: number;
};

type SplitterRootProps = SlottableProps<SplitterRootElementProps>;

const SplitterRoot = slottable<HTMLDivElement, SplitterRootElementProps>(
  (
    {
      asChild,
      children,
      orientation = 'vertical',
      mode = 'split',
      ratio: ratioProp,
      defaultRatio = 0.5,
      onRatioChange,
      transition = 250,
      resizable = false,
      minRatio = 0,
      maxRatio = 1,
      ...props
    },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs(forwardedRef, rootRef);
    const [ratio = defaultRatio, setRatio] = useControllableState({
      prop: ratioProp,
      defaultProp: defaultRatio,
      onChange: onRatioChange,
    });
    const [dragging, setDragging] = useState(false);
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;

    return (
      <SplitterProvider
        orientation={orientation}
        mode={mode}
        ratio={ratio}
        transition={transition}
        resizable={resizable}
        minRatio={minRatio}
        maxRatio={maxRatio}
        dragging={dragging}
        rootRef={rootRef}
        setRatio={setRatio}
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
    const { mode, ratio, transition, dragging } = useSplitterContext(PANEL_NAME);
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
          flexGrow: panelGrow(position, mode, ratio),
          flexShrink: 1,
          flexBasis: 0,
          transition: animate ? `flex-grow ${transition}ms ease-out` : undefined,
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
  const { orientation, resizable, minRatio, maxRatio, rootRef, setRatio, setDragging } =
    useSplitterContext(HANDLE_NAME);
  const { className, ...rest } = composableProps(props);
  const Comp = asChild ? Slot : Primitive.div;

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

  // Map the pointer position within the Root into a ratio for the start panel, clamped to [min, max].
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
      const next =
        orientation === 'horizontal'
          ? (event.clientX - rect.left) / rect.width
          : (event.clientY - rect.top) / rect.height;
      setRatio(Math.min(maxRatio, Math.max(minRatio, next)));
    },
    [orientation, minRatio, maxRatio, rootRef, setRatio],
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

  if (!resizable) {
    return null;
  }

  return (
    <Comp
      {...rest}
      ref={forwardedRef}
      role='separator'
      aria-orientation={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
      className={tx('splitter.handle', { orientation }, className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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
