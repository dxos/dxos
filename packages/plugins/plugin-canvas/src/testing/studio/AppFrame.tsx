//
// Copyright 2026 DXOS.org
//

//
// The Composer window of the Composer slide as a canvas element kind: a title bar, a navtree, a document with an
// embedded canvas and sheet, an assistant beside it, and a status bar (studio `assets/deck/lib/frame.mjs`, `.d-frame`
// in `deck.css`). Each plugin card in the side columns points a dashed wire at the region it supplies.
//
// A kind rather than a Generator, because it is a picture of an app and not geometry. Its six regions stay in the
// scene as their own rects, which is what the wires end on — `frame/r-doc` is an ordinary connector target — and the
// loader makes them invisible so the kind draws the panes itself ({@link hideParts} in `studio.ts`).
//
// Every length here is the deck's own, in slide units: the frame is laid out entirely in `cqw` and 1cqw is 16 slide
// units, so each number below is a constant of `.d-frame` resolved once. The window is drawn at the slide's 660-unit
// width and scaled into the node, so a resize scales the picture rather than reflowing it — which is what keeps the
// embedded canvas and sheet on the regions the sidecar recorded.
//

import './theme.css';

import * as Schema from 'effect/Schema';
import React from 'react';

import { type ElementKindSpec, type NodeViewProps, kindData } from '@dxos/react-ui-canvas';
import * as Icon from '@dxos/react-ui/Icon';
import { Scene } from '@dxos/scene';

import { type Styled, toneValue } from './FeedCard.tsx';

/** The window the deck draws, which the node scales to its own frame. */
const FRAME = { width: 660, height: 650 };

/** `.d-frame`'s own rows and columns (1cqw = 16 slide units). */
const BAR = 41.6;
const FOOT = 35.2;
const PAD = 9.6;
const SIDE = 192;

/**
 * The document column's blocks, top to bottom, at the heights that put the two embeds on the regions the sidecar
 * records (`r-canvas` at 197, `r-sheet` at 420): the slide measures them after mount, which an import cannot, so the
 * run of text above each embed is given its measured height instead.
 */
const DOC = { title: 34, first: 64, canvas: 106, second: 91, sheet: 113, gap: 12.8 };

export const appFrameFields = {
  /** Outline every region in its plugin's colour. */
  highlight: Schema.optional(Schema.Boolean.annotate({ title: 'Highlight regions' })),
  /** The outline colour per region (`nav`, `doc`, `canvas`, `sheet`, `comp`), by tone name. */
  colors: Schema.optional(Schema.Record(Schema.String, Schema.String).annotate({ title: 'Region colours' })),
};

/** The kind's own fields, kept under `data` (decision 21). */
export const AppFrameData = Schema.Struct(appFrameFields);

export const AppFrameNode = Schema.Struct({
  ...Scene.Element2D.fields,
  type: Schema.Literal('app-frame'),
  data: Schema.optional(AppFrameData),
});

type RegionProps = {
  /** The region's name in `colors` (`nav`, `doc`, `canvas`, `sheet`, `comp`). */
  region: string;
  highlight?: boolean;
  colors?: Readonly<Record<string, string>>;
  classNames?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/** A pane of the window, outlined in its plugin's colour where the slide highlights it. */
const Region = ({ region, highlight, colors, classNames, style, children }: RegionProps) => {
  // The field carries a tone's name, as a card's does, so the outline follows the canvas's mode.
  const tone = toneValue(colors?.[region]);
  const toned: Styled | undefined = highlight && tone ? { '--sd-hl': tone } : undefined;
  return (
    <div
      className={classNames}
      data-region={region}
      data-highlight={toned ? true : undefined}
      style={{ ...style, ...toned }}
    >
      {children}
    </div>
  );
};

/** A line of the wireframe: a filled bar standing for a run of text. */
const Line = ({ width, strong }: { width: string; strong?: boolean }) => (
  <i className='studio-wire-line block' data-strong={strong ? true : undefined} style={{ width }} />
);

/** A paragraph as the lines the deck's text comes out as, filling `height`. */
const Paragraph = ({ height }: { height: number }) => (
  <div className='flex flex-col justify-between' style={{ height }}>
    {['96%', '88%', '92%', '64%'].slice(0, Math.max(2, Math.round(height / 22.8))).map((width, index) => (
      <Line key={index} width={width} />
    ))}
  </div>
);

const NAV: readonly { folder: string; objects: readonly string[]; selected?: number }[] = [
  { folder: 'Launch', objects: ['Q4 launch plan', 'Roadmap', 'Tasks', 'Budget'], selected: 1 },
  { folder: 'Team', objects: ['Inbox', 'Design chat'] },
];

const Nav = () => (
  <div className='flex flex-col' style={{ gap: 5.6 }}>
    <div className='studio-frame-heading font-mono' style={{ marginBottom: 4.8 }}>
      SPACES
    </div>
    {NAV.map(({ folder, objects, selected }) => (
      <React.Fragment key={folder}>
        <div className='flex items-center' style={{ gap: 6.4, height: 22.8 }}>
          <Icon.Icon icon='ph--folder--regular' classNames='studio-frame-glyph' style={{ width: 17, height: 17 }} />
          <Line width='52%' strong />
        </div>
        {objects.map((object, index) => (
          <div
            key={object}
            className='studio-frame-object flex items-center'
            data-selected={index === selected ? true : undefined}
            style={{ gap: 6.4, height: 22.8, paddingInline: '19.2px 6.4px' }}
          >
            <Line width={`${52 + ((index * 13) % 36)}%`} />
          </div>
        ))}
      </React.Fragment>
    ))}
  </div>
);

/** The sheet embedded in the document: a header row and five rows of a table. */
const SheetEmbed = () => (
  <div className='flex flex-col justify-between dx-grow'>
    {Array.from({ length: 6 }, (_, row) => (
      <div key={row} className='flex' style={{ gap: 2.4 }}>
        {Array.from({ length: 4 }, (_, column) => (
          <i
            key={column}
            className='studio-wire-cell block flex-1'
            data-head={row === 0 ? true : undefined}
            style={{ height: 11.2 }}
          />
        ))}
      </div>
    ))}
  </div>
);

/** The canvas embedded in the document: three nodes and the links between them. */
const CanvasEmbed = () => (
  <svg className='dx-grow w-full' viewBox='0 0 160 60' preserveAspectRatio='xMidYMid meet'>
    <line x1={34} y1={30} x2={80} y2={16} className='stroke-neutral-border' strokeWidth={1.4} />
    <line x1={34} y1={30} x2={80} y2={44} className='stroke-neutral-border' strokeWidth={1.4} />
    <line x1={80} y1={16} x2={126} y2={30} className='stroke-neutral-border' strokeWidth={1.4} />
    {[
      [34, 30],
      [80, 16],
      [80, 44],
      [126, 30],
    ].map(([x, y], index) => (
      <rect key={index} x={x - 14} y={y - 7} width={28} height={14} rx={3} className='fill-neutral-border' />
    ))}
  </svg>
);

const Assistant = () => (
  <div className='flex flex-col h-full' style={{ gap: 9.6 }}>
    <div className='flex items-center' style={{ gap: 6.4 }}>
      <Icon.Icon icon='ph--sparkle--regular' classNames='studio-frame-glyph' style={{ width: 18, height: 18 }} />
      <Line width='54%' strong />
    </div>
    <div className='studio-frame-message' data-me={true} style={{ width: '82%', alignSelf: 'flex-end' }}>
      <Line width='84%' />
      <Line width='56%' />
    </div>
    <div className='studio-frame-message' style={{ width: '88%' }}>
      <Line width='92%' />
      <Line width='74%' />
      <Line width='48%' />
    </div>
    <div className='studio-frame-input mt-auto'>
      <Line width='44%' />
    </div>
  </div>
);

export const AppFrameNodeView = ({ node }: NodeViewProps) => {
  const data = kindData(AppFrameData, node);
  if (node.type !== 'app-frame' || !data) {
    return null;
  }
  const { highlight, colors } = data;
  const regions = { highlight, colors };
  const { width, height } = node.size;
  const scale = width / FRAME.width;
  return (
    <div className='studio-frame dx-cover rounded-[19px] overflow-hidden' data-testid='app-frame-node'>
      <div
        className='flex flex-col'
        style={{
          width: FRAME.width,
          height: height / scale,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        <div className='studio-frame-bar flex items-center shrink-0' style={{ height: BAR, gap: 8, paddingInline: 16 }}>
          {[0, 1, 2].map((index) => (
            <i key={index} className='studio-frame-dot block rounded-full' style={{ width: 10.4, height: 10.4 }} />
          ))}
          <span className='studio-frame-heading font-mono' style={{ marginInlineStart: 16 }}>
            composer.space
          </span>
        </div>
        <div className='flex dx-grow' style={{ gap: PAD, padding: PAD }}>
          <Region
            region='nav'
            {...regions}
            classNames='studio-frame-pane shrink-0 overflow-hidden'
            style={{ width: SIDE, padding: '16px 12.8px' }}
          >
            <Nav />
          </Region>
          <Region
            region='doc'
            {...regions}
            classNames='studio-frame-doc grow min-w-0 flex flex-col'
            style={{ padding: '22.4px 25.6px', gap: DOC.gap }}
          >
            <div className='flex items-end' style={{ height: DOC.title }}>
              <Line width='62%' strong />
            </div>
            <Paragraph height={DOC.first} />
            <Region region='canvas' {...regions} classNames='studio-frame-embed' style={{ height: DOC.canvas }}>
              <div className='studio-frame-caption font-mono'>CANVAS</div>
              <CanvasEmbed />
            </Region>
            <Paragraph height={DOC.second} />
            <Region
              region='sheet'
              {...regions}
              classNames='studio-frame-embed flex flex-col'
              style={{ height: DOC.sheet }}
            >
              <div className='studio-frame-caption font-mono'>SHEET</div>
              <SheetEmbed />
            </Region>
          </Region>
          <Region
            region='comp'
            {...regions}
            classNames='studio-frame-pane shrink-0 overflow-hidden'
            style={{ width: SIDE, padding: '16px 14.4px' }}
          >
            <Assistant />
          </Region>
        </div>
        <div
          className='studio-frame-foot flex items-center shrink-0'
          style={{ height: FOOT, gap: 19.2, paddingInline: 19.2 }}
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
      </div>
    </div>
  );
};

export const appFrameSpec: ElementKindSpec = {
  name: 'App frame',
  icon: 'ph--app-window--regular',
  key: 'W',
  schema: AppFrameNode,
  component: AppFrameNodeView,
  create: ({ id, z, center, size }) => ({ type: 'app-frame', id, z, center, size, data: { highlight: true } }),
  // Nominal units (one unit is the major grid cell, 48px): the deck's 660 x 650 window, give or take.
  defaultSize: { width: 14, height: 13.5 },
  resizable: true,
  minSize: { width: 240, height: 240 },
  // The window is the shape: the kind draws its own surface, its rules and its panes.
  bare: true,
};
