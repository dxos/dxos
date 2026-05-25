//
// Copyright 2026 DXOS.org
//

import { createContextScope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React from 'react';

import { useThemeContext } from '../../hooks';
import { composableProps, slottable } from '../../util';
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

type SplitterRootProps = Partial<SplitterContextValue>;

const SplitterRoot = slottable<HTMLDivElement, SplitterRootProps>(
  ({ asChild, mode = 'top', ratio = 0.5, transition = 250, children, ...props }, forwardedRef) => {
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

SplitterRoot.displayName = ROOT_NAME;

//
// Panel
//

const PANEL_NAME = 'Splitter.Panel';

type SplitterPanelProps = ThemedClassName<{
  position: 'top' | 'bottom';
}>;

const SplitterPanel = slottable<HTMLDivElement, SplitterPanelProps>(
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

SplitterPanel.displayName = PANEL_NAME;

//
// Splitter
//

const Splitter = {
  Root: SplitterRoot,
  Panel: SplitterPanel,
};

export { Splitter, createSplitterScope };

export type { Mode as SplitterMode, SplitterRootProps, SplitterPanelProps };
