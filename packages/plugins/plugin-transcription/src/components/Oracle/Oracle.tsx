//
// Copyright 2024 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type PropsWithChildren, createContext, useContext, useMemo } from 'react';

import '@dxos/react-ui-graph/styles/graph.css';
import { type ThemedClassName } from '@dxos/react-ui';
import { composableProps, slottable } from '@dxos/react-ui';
import { TextBlock } from '@dxos/react-ui-components';
import { SVG } from '@dxos/react-ui-graph';
import { mx } from '@dxos/ui-theme';
import { type SlottableProps } from '@dxos/ui-types';

//
// Context
//

type OracleContextValue = {
  /** Latest utterance / phrase rendered by `Oracle.Text`. */
  text: string;
  /** Per-character reveal delay in ms for the streaming TextBlock. */
  delay: number;
};

const OracleContext = createContext<OracleContextValue | null>(null);

const useOracleContext = (consumer: string): OracleContextValue => {
  const ctx = useContext(OracleContext);
  if (!ctx) {
    throw new Error(`<Oracle.${consumer}> must be rendered inside <Oracle.Root>`);
  }
  return ctx;
};

//
// Root (headless — provides context only, renders no DOM)
//

export type OracleRootProps = PropsWithChildren<{
  /** Latest utterance / phrase rendered by `Oracle.Text`. */
  text?: string;
  /** Per-character reveal delay in ms for the streaming TextBlock. @default 12 */
  delay?: number;
}>;

/**
 * Oracle surface root. Headless — provides text/delay context to subcomponents and renders
 * no DOM of its own. Wrap subcomponents in `<Oracle.Content>` for the standard relative
 * stacking layout, or place `<Oracle.Canvas>` / `<Oracle.Text>` inside any positioned
 * container of your choice.
 */
const Root = ({ children, text = '', delay = 12 }: OracleRootProps) => {
  const value = useMemo(() => ({ text, delay }), [text, delay]);
  return <OracleContext.Provider value={value}>{children}</OracleContext.Provider>;
};

//
// Content
//

export type OracleContentProps = SlottableProps;

/**
 * Positioned container that stacks `Oracle.Canvas` (the SVG graph viewport, absolutely
 * positioned to fill) under `Oracle.Text` (the centered overlay). Use this for the standard
 * Oracle layout; skip it if you need custom positioning.
 *
 * Pass `asChild` to merge the positioning + sizing onto a parent slot (e.g. `Panel.Content`).
 */
const Content = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : Primitive.div;
  return (
    <Comp {...composableProps(props, { classNames: 'relative dx-expander' })} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

Content.displayName = 'Oracle.Content';

//
// Canvas
//

export type OracleCanvasProps = ThemedClassName<PropsWithChildren<{}>>;

/**
 * SVG graph viewport. Renders sensible defaults (markers, grid, pan/zoom, empty graph)
 * when no children are supplied; consumers can replace those by passing their own
 * SVG.* children (e.g. a populated `<SVG.Graph model={…} />`).
 */
const Canvas = ({ classNames, children }: OracleCanvasProps) => (
  <SVG.Root centered classNames={mx('absolute inset-0', classNames)}>
    {children ?? (
      <>
        <SVG.Markers />
        <SVG.Grid />
        <SVG.Zoom extent={[1 / 4, 4]}>
          <SVG.Graph />
        </SVG.Zoom>
      </>
    )}
  </SVG.Root>
);

//
// Text
//

export type OracleTextProps = ThemedClassName<{}>;

/**
 * Centered text overlay. Reads `text` and `delay` from `Oracle.Root` context and renders
 * a streaming `TextBlock` floating above the canvas. Pointer-events are disabled so the
 * underlying graph remains interactive.
 */
const Text = ({ classNames }: OracleTextProps) => {
  const { text, delay } = useOracleContext('Text');
  return (
    <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
      <TextBlock
        classNames={mx('max-w-xl px-6 py-4 text-center text-2xl font-medium text-balance text-subdued', classNames)}
        text={text}
        delay={delay}
      />
    </div>
  );
};

//
// Namespace
//

export const Oracle = {
  Root,
  Content,
  Canvas,
  Text,
};
