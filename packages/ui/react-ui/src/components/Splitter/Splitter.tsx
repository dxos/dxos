//
// Copyright 2026 DXOS.org
//

import { createContextScope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React from 'react';

import { composableProps, slottable } from '@dxos/ui-theme';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';

type ScopedProps<P> = P & { __scopeSplitter?: any };

// TODO(burdon): Generalize horizontal/vertical and change to start/end.
type Mode = 'top' | 'bottom' | 'split';

type SplitterContextValue = {
  mode: Mode;
  ratio?: number;
  transition: number;
};

const SPLITTER_NAME = 'Splitter';

const [createSplitterContext, createSplitterScope] = createContextScope(SPLITTER_NAME);

const [SplitterProvider, useSplitterContext] = createSplitterContext<SplitterContextValue>(SPLITTER_NAME);

//
// Root
//

const ROOT_NAME = 'Splitter.Root';

type RootOwnProps = Partial<SplitterContextValue>;

type RootProps = RootOwnProps;

const Root = slottable<HTMLDivElement, RootOwnProps>(
  (
    {
      asChild,
      mode = 'top',
      ratio = 0.5,
      transition = 250,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const { __scopeSplitter, ...rest } = props as ScopedProps<typeof props>;
    const { className, ...restProps } = composableProps(rest);
    const Comp = asChild ? Slot : Primitive.div;

    return (
      <SplitterProvider scope={__scopeSplitter} mode={mode} ratio={ratio} transition={transition}>
        <Comp {...restProps} ref={forwardedRef} className={tx('splitter.root', {}, className)}>
          {children}
        </Comp>
      </SplitterProvider>
    );
  },
);

Root.displayName = ROOT_NAME;

//
// Panel
//

const PANEL_NAME = 'Splitter.Panel';

type PanelOwnProps = ThemedClassName<{
  position: 'top' | 'bottom';
}>;

type PanelProps = PanelOwnProps;

const Panel = slottable<HTMLDivElement, PanelOwnProps>(
  ({ classNames, asChild, children, position, style, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { __scopeSplitter, ...rest } = props as ScopedProps<typeof props>;
    const Comp = asChild ? Slot : Primitive.div;
    const { mode, ratio = 0.5, transition } = useSplitterContext(PANEL_NAME, __scopeSplitter);
    const { className, ...restProps } = composableProps(rest);

    // Calculate position and height based on mode and ratio.
    const isTopPanel = position === 'top';
    const topOffset = isTopPanel ? '0%' : mode === 'top' ? '100%' : mode === 'bottom' ? '0%' : `${ratio * 100}%`;
    const height = isTopPanel
      ? mode === 'top'
        ? '100%'
        : mode === 'bottom'
          ? '0%'
          : `${ratio * 100}%`
      : mode === 'bottom'
        ? '100%'
        : mode === 'top'
          ? '0%'
          : `${(1 - ratio) * 100}%`;

    return (
      <Comp
        {...restProps}
        ref={forwardedRef}
        className={tx('splitter.panel', {}, className)}
        style={{
          top: topOffset,
          height,
          transition: `top ${transition}ms, height ${transition}ms ease-out`,
          ...style,
        }}
      >
        {children}
      </Comp>
    );
  },
);

Panel.displayName = PANEL_NAME;

//
// Splitter
//

const Splitter = {
  Root,
  Panel,
};

export { Splitter, createSplitterScope };

export type { Mode as SplitterMode, RootProps as SplitterRootProps, PanelProps as SplitterPanelProps };
