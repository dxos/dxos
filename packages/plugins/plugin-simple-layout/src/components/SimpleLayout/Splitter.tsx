//
// Copyright 2026 DXOS.org
//

import { createContextScope } from '@radix-ui/react-context';
import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

type ScopedProps<P> = P & { __scopeSplitter?: any };

interface SplitterContextValue {
  mode: 'upper' | 'lower' | 'both';
  ratio: number;
  transition: string;
}

const SPLITTER_NAME = 'Splitter';

const [createSplitterContext, createSplitterScope] = createContextScope(SPLITTER_NAME);

const [SplitterProvider, useSplitterContext] = createSplitterContext<SplitterContextValue>(SPLITTER_NAME);

// TODO(burdon): Consider absolute position to prevent scrolling when upper/lower panels are hidden.

//
// Root
//

const ROOT_NAME = 'Splitter.Root';

interface RootProps extends ThemedClassName<ComponentPropsWithoutRef<'div'>> {
  mode: 'upper' | 'lower' | 'both';
  ratio?: number;
  transition?: string;
}

const Root = forwardRef<HTMLDivElement, ScopedProps<RootProps>>(
  ({ __scopeSplitter, classNames, mode, ratio = 0.5, transition = '2000ms', children, ...rootProps }, forwardedRef) => {
    return (
      <SplitterProvider scope={__scopeSplitter} mode={mode} ratio={ratio} transition={transition}>
        <div
          role='none'
          {...rootProps}
          ref={forwardedRef}
          className={mx('flex flex-col bs-full overflow-hidden', classNames)}
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

    const height =
      position === 'upper'
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
        className={mx('flex flex-col bs-full overflow-hidden', classNames)}
        style={{
          height,
          transition: `height ${transition}`,
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

export type { RootProps as SplitterRootProps, PanelProps as SplitterPanelProps };
