//
// Copyright 2026 DXOS.org
//

import { createContextScope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { forwardRef } from 'react';

import { composableProps } from '@dxos/ui-theme';
import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';

type ScopedProps<P> = P & { __scopeSplitter?: any };

// TODO(burdon): Enable resize.
// TODO(burdon): Generalize horizontal/vertical and change to start/end.
type Mode = 'upper' | 'lower' | 'both';

type SplitterContextValue = {
  mode: Mode;
  ratio: number;
  transition: number;
};

const SPLITTER_NAME = 'Splitter';

const [createSplitterContext, createSplitterScope] = createContextScope(SPLITTER_NAME);

const [SplitterProvider, useSplitterContext] = createSplitterContext<SplitterContextValue>(SPLITTER_NAME);

//
// Root
//

const ROOT_NAME = 'Splitter.Root';

type RootProps = SlottableProps<HTMLDivElement, Partial<SplitterContextValue>>;

const Root = forwardRef<HTMLDivElement, ScopedProps<RootProps>>(
  ({ __scopeSplitter, asChild, mode = 'upper', ratio = 0.5, transition = 250, children, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();
    return (
      <SplitterProvider scope={__scopeSplitter} mode={mode} ratio={ratio} transition={transition}>
        <Comp role='none' {...rest} ref={forwardedRef} className={tx('splitter.root', {}, className)}>
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

type PanelProps = SlottableProps<
  HTMLDivElement,
  {
    position: 'upper' | 'lower';
  }
>;

const Panel = forwardRef<HTMLDivElement, ScopedProps<PanelProps>>(
  ({ __scopeSplitter, asChild, children, position, style, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { mode, ratio, transition } = useSplitterContext(PANEL_NAME, __scopeSplitter);
    const { tx } = useThemeContext();

    // Calculate position and height based on mode and ratio.
    const isUpper = position === 'upper';
    const top = isUpper ? '0%' : mode === 'upper' ? '100%' : mode === 'lower' ? '0%' : `${ratio * 100}%`;

    const height = isUpper
      ? mode === 'upper'
        ? '100%'
        : mode === 'lower'
          ? '0%'
          : `${ratio * 100}%`
      : mode === 'lower'
        ? '100%'
        : mode === 'upper'
          ? '0%'
          : `${(1 - ratio) * 100}%`;

    return (
      <Comp
        role='none'
        {...rest}
        ref={forwardedRef}
        className={tx('splitter.panel', {}, className)}
        style={{
          top,
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
