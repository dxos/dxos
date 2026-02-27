//
// Copyright 2026 DXOS.org
//

import { createContextScope } from '@radix-ui/react-context';
import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';

import { type ThemedClassName } from '../../util';

type ScopedProps<P> = P & { __scopeSplitter?: any };

// TODO(burdon): Generalize styles.
// TODO(burdon): Enalbe resize.
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

type RootProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & Partial<SplitterContextValue>;

const Root = forwardRef<HTMLDivElement, ScopedProps<RootProps>>(
  (
    { __scopeSplitter, classNames, mode = 'upper', ratio = 0.5, transition = 250, children, ...rootProps },
    forwardedRef,
  ) => {
    return (
      <SplitterProvider scope={__scopeSplitter} mode={mode} ratio={ratio} transition={transition}>
        <div
          role='none'
          {...rootProps}
          ref={forwardedRef}
          className={mx('relative h-full overflow-hidden', classNames)}
        >
          {children}
        </div>
      </SplitterProvider>
    );
  },
);

Root.displayName = ROOT_NAME;

//
// Panel
//

const PANEL_NAME = 'Splitter.Panel';

interface PanelProps extends ThemedClassName<ComponentPropsWithoutRef<'div'>> {
  position: 'upper' | 'lower';
}

const Panel = forwardRef<HTMLDivElement, ScopedProps<PanelProps>>(
  ({ __scopeSplitter, classNames, children, position, style, ...panelProps }, forwardedRef) => {
    const context = useSplitterContext(PANEL_NAME, __scopeSplitter);
    const { mode, ratio, transition } = context;

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
      <div
        {...panelProps}
        ref={forwardedRef}
        className={mx('absolute inset-x-0 flex flex-col overflow-hidden', classNames)}
        style={{
          top,
          height,
          transition: `top ${transition}ms, height ${transition}ms ease-out`,
          ...style,
        }}
      >
        {children}
      </div>
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
