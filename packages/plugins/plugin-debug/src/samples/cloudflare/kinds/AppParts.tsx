//
// Copyright 2026 DXOS.org
//

//
// The Composer window taken apart: its title bar, its three panes, the two embeds inside the document and the runs of
// text between them, each one an element kind of its own. `app-frame` draws the same picture as one node, which is
// what the sidecar export restores; this is the form a drawing lays out itself, where a grid places the parts and a
// wire from a plugin card ENDS ON the pane it supplies, because that pane is a node and not a region painted inside
// someone else's box.
//
// The picture is defined once: every piece below is `AppFrame`'s own, drawn at the deck's lengths and scaled into
// whatever box the grid gives it, so the two forms cannot drift apart.
//

import './theme.css';

import * as Schema from 'effect/Schema';
import React from 'react';

import { type ElementKindSpec, type NodeViewProps, kindData } from '@dxos/react-ui-canvas';
import * as Icon from '@dxos/react-ui/Icon';
import { Scene } from '@dxos/scene';

import { Assistant, CanvasEmbed, Line, Nav, SheetEmbed, SIDE } from './AppFrame.tsx';
import { type Styled, TONES, toneValue } from './FeedCard.tsx';

/** What every part takes: the colour of the plugin card that supplies it, drawn as the part's outline. */
const partFields = {
  tone: Schema.optional(Schema.Literals(TONES).annotate({ title: 'Tone' })),
};

const PartData = Schema.Struct(partFields);

/** The outline a highlighted part draws, as the frame's own regions do. */
const highlightOf = (tone: string | undefined): { style: Styled; mark: true | undefined } => {
  const value = toneValue(tone);
  return { style: value ? ({ '--sd-hl': value } as Styled) : {}, mark: value ? true : undefined };
};

/**
 * A part's content at the deck's own lengths, scaled into the box the grid gave it: the pieces are written once, in
 * the window's units, and a pane that is narrower here draws the same picture smaller rather than reflowing it.
 * `width` and `height` are the content's own, in the window's units, so what is drawn is exactly the room it has.
 */
const Scaled = ({
  width,
  height,
  scale,
  children,
}: {
  width: number;
  height: number;
  scale: number;
  children: React.ReactNode;
}) => <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: '0 0' }}>{children}</div>;

/** A side pane's padding in the window's units, as `AppFrame` draws the navtree and the assistant. */
const PANE_PADDING = { nav: { block: 16, inline: 12.8 }, comp: { block: 16, inline: 14.4 } } as const;

//
// The title bar and the status bar.
//

export const ChromeData = Schema.Struct({
  ...partFields,
  /** Which bar this is: the window's title bar or its status bar. */
  part: Schema.optional(Schema.Literals(['bar', 'foot']).annotate({ title: 'Bar' })),
});

export const ChromeNode = Schema.Struct({
  ...Scene.Element2D.fields,
  kind: Schema.Literal('app-chrome'),
  label: Schema.optional(Schema.String),
  data: Schema.optional(ChromeData),
});

const ChromeNodeView = ({ node }: NodeViewProps) => {
  const data = kindData(ChromeData, node);
  if (node.kind !== 'app-chrome' || !data) {
    return null;
  }
  const label = 'label' in node && typeof node.label === 'string' ? node.label : '';
  const { style, mark } = highlightOf(data.tone);
  if (data.part === 'foot') {
    return (
      <div
        className='studio-frame studio-frame-part studio-frame-foot dx-cover flex items-center rounded-b-[19px]'
        data-testid='app-chrome-node'
        data-highlight={mark}
        style={{ gap: 19.2, paddingInline: 19.2, ...style }}
      >
        <Icon.Icon
          icon='ph--check-circle--regular'
          classNames='studio-frame-glyph-accent'
          style={{ width: 16, height: 16 }}
        />
        <Line width='96px' />
        <Line width='64px' />
        <span className='grow' />
        <Line width='48px' />
      </div>
    );
  }
  return (
    <div
      className='studio-frame studio-frame-part studio-frame-bar dx-cover flex items-center rounded-t-[19px]'
      data-testid='app-chrome-node'
      data-highlight={mark}
      style={{ gap: 8, paddingInline: 16, ...style }}
    >
      {[0, 1, 2].map((index) => (
        <i key={index} className='studio-frame-dot block rounded-full' style={{ width: 10.4, height: 10.4 }} />
      ))}
      <span className='studio-frame-heading font-mono' style={{ marginInlineStart: 16 }}>
        {label || 'composer.space'}
      </span>
    </div>
  );
};

export const appChromeSpec: ElementKindSpec = {
  portsPerSide: 5,
  name: 'App chrome',
  icon: 'ph--browser--regular',
  schema: ChromeNode,
  component: ChromeNodeView,
  create: ({ id, z, center, size }) => ({ kind: 'app-chrome', id, z, center, size, data: { part: 'bar' } }),
  defaultSize: { width: 14, height: 1 },
  resizable: true,
  bare: true,
};

//
// A pane of the window: the navtree, the document column, or the assistant beside it.
//

export const PaneData = Schema.Struct({
  ...partFields,
  /** Which pane this is; the document pane draws nothing, since a grid places what is inside it. */
  pane: Schema.optional(Schema.Literals(['nav', 'doc', 'comp']).annotate({ title: 'Pane' })),
});

export const PaneNode = Schema.Struct({
  ...Scene.Element2D.fields,
  kind: Schema.Literal('app-pane'),
  data: Schema.optional(PaneData),
});

const PaneNodeView = ({ node }: NodeViewProps) => {
  const data = kindData(PaneData, node);
  if (node.kind !== 'app-pane' || !data) {
    return null;
  }
  const { style, mark } = highlightOf(data.tone);
  const { width, height } = node.size;
  // The document pane is a surface and nothing else: its title, its text and its two embeds are nodes of their own.
  if (data.pane === 'doc') {
    return (
      <div
        className='studio-frame studio-frame-part studio-frame-doc dx-cover'
        data-testid='app-pane-node'
        data-highlight={mark}
        style={style}
      />
    );
  }
  // The window's side pane is `SIDE` wide with its padding inside, so the padding is scaled with the content: left
  // at the window's size round content scaled to the whole box, the content ran past the pane's right edge.
  const scale = width / SIDE;
  const padding = PANE_PADDING[data.pane === 'comp' ? 'comp' : 'nav'];
  return (
    <div
      className='studio-frame studio-frame-part studio-frame-pane dx-cover overflow-hidden'
      data-testid='app-pane-node'
      data-highlight={mark}
      style={{ padding: `${padding.block * scale}px ${padding.inline * scale}px`, ...style }}
    >
      <Scaled width={SIDE - 2 * padding.inline} height={height / scale - 2 * padding.block} scale={scale}>
        {data.pane === 'comp' ? <Assistant /> : <Nav />}
      </Scaled>
    </div>
  );
};

export const appPaneSpec: ElementKindSpec = {
  portsPerSide: 5,
  name: 'App pane',
  icon: 'ph--sidebar--regular',
  schema: PaneNode,
  component: PaneNodeView,
  create: ({ id, z, center, size }) => ({ kind: 'app-pane', id, z, center, size, data: { pane: 'nav' } }),
  defaultSize: { width: 4, height: 10 },
  resizable: true,
  bare: true,
};

//
// What the document embeds: a canvas and a sheet.
//

export const EmbedData = Schema.Struct({
  ...partFields,
  /** Which embed this is. */
  embed: Schema.optional(Schema.Literals(['canvas', 'sheet']).annotate({ title: 'Embed' })),
});

export const EmbedNode = Schema.Struct({
  ...Scene.Element2D.fields,
  kind: Schema.Literal('app-embed'),
  label: Schema.optional(Schema.String),
  data: Schema.optional(EmbedData),
});

const EmbedNodeView = ({ node }: NodeViewProps) => {
  const data = kindData(EmbedData, node);
  if (node.kind !== 'app-embed' || !data) {
    return null;
  }
  const label = 'label' in node && typeof node.label === 'string' ? node.label : '';
  const { style, mark } = highlightOf(data.tone);
  return (
    <div
      className='studio-frame studio-frame-part studio-frame-embed dx-cover flex flex-col'
      data-testid='app-embed-node'
      data-highlight={mark}
      style={style}
    >
      <div className='studio-frame-caption font-mono'>{label || (data.embed === 'sheet' ? 'SHEET' : 'CANVAS')}</div>
      {data.embed === 'sheet' ? <SheetEmbed /> : <CanvasEmbed />}
    </div>
  );
};

export const appEmbedSpec: ElementKindSpec = {
  portsPerSide: 5,
  name: 'App embed',
  icon: 'ph--frame-corners--regular',
  schema: EmbedNode,
  component: EmbedNodeView,
  create: ({ id, z, center, size }) => ({ kind: 'app-embed', id, z, center, size, data: { embed: 'canvas' } }),
  defaultSize: { width: 6, height: 2.5 },
  resizable: true,
  bare: true,
};

//
// A run of the document's text.
//

/** The most lines a run draws. The field is a form input, so an unbounded count would be rendered. */
export const LINES_MAX = 50;

export const LinesData = Schema.Struct({
  ...partFields,
  /** How many lines the run draws; the first is a heading where `strong` says so. */
  lines: Schema.optional(
    Schema.Number.pipe(
      Schema.check(Schema.isInt()),
      Schema.check(Schema.isBetween({ minimum: 1, maximum: LINES_MAX })),
    ).annotate({ title: 'Lines' }),
  ),
  strong: Schema.optional(Schema.Boolean.annotate({ title: 'Heading' })),
});

export const LinesNode = Schema.Struct({
  ...Scene.Element2D.fields,
  kind: Schema.Literal('app-lines'),
  data: Schema.optional(LinesData),
});

const WIDTHS = ['96%', '88%', '92%', '64%'];

const LinesNodeView = ({ node }: NodeViewProps) => {
  const data = kindData(LinesData, node);
  if (node.kind !== 'app-lines' || !data) {
    return null;
  }
  const count = Math.max(1, Math.min(Math.trunc(data.lines ?? 3), LINES_MAX));
  return (
    <div className='dx-cover flex flex-col justify-between' data-testid='app-lines-node'>
      {Array.from({ length: count }, (_, index) => (
        <Line
          key={index}
          width={data.strong && index === 0 ? '62%' : WIDTHS[index % WIDTHS.length]}
          strong={data.strong && index === 0}
        />
      ))}
    </div>
  );
};

export const appLinesSpec: ElementKindSpec = {
  portsPerSide: 5,
  name: 'App text',
  icon: 'ph--text-align-left--regular',
  schema: LinesNode,
  component: LinesNodeView,
  create: ({ id, z, center, size }) => ({ kind: 'app-lines', id, z, center, size, data: { lines: 3 } }),
  defaultSize: { width: 6, height: 1.5 },
  resizable: true,
  bare: true,
};
