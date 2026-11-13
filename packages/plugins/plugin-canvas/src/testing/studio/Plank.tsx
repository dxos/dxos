//
// Copyright 2026 DXOS.org
//

//
// A Composer plank as a canvas element kind: one wireframe component — a board, a sheet, a thread — under a header of
// its icon, its title and the package it comes from. Three of them stand down the left of the Hyperspace slide,
// standing for the plugins a person has open (studio `assets/deck/lib/planks.mjs` over `lib/kit.mjs`).
//
// The wireframe is drawn at the kit's own 480-unit width and scaled into the node, as `fitPlanks()` does on the
// slide, so its internal spacing is the kit's rather than a function of the node's size. What is drawn is a
// wireframe of each component, not the kit itself: the kit is an HTML/CSS library of another repository, and a
// drawing that embedded it could not be read where that library is not there. The structure is the kit's
// (`board()`, `sheet()`, `thread()`), which is what the slide shows at this size.
//
// Nothing links to a plank except its own flow into the substrate, so it needs no ports.
//

import './theme.css';

import * as Schema from 'effect/Schema';
import React from 'react';

import { type ElementKindSpec, type NodeViewProps, TextPart, kindData } from '@dxos/react-ui-canvas';
import * as Icon from '@dxos/react-ui/Icon';
import { Scene } from '@dxos/scene';

/** The width the kit lays a component out in; the plank scales this to its own box. */
const KIT_WIDTH = 480;

/** The kit components the deck's slides use, with the glyph and package of each (`COMPONENTS` in `lib/kit.mjs`). */
const COMPONENTS: Record<string, { icon: string; package: string }> = {
  board: { icon: 'ph--kanban--regular', package: 'react-ui-board' },
  sheet: { icon: 'ph--table--regular', package: 'react-ui-sheet' },
  thread: { icon: 'ph--chat-circle--regular', package: 'react-ui-thread' },
};

const DEFAULT_COMPONENT = { icon: 'ph--app-window--regular', package: '' };

export const plankFields = {
  /** Which wireframe component: `board`, `sheet`, `thread`. */
  comp: Schema.optional(Schema.String.annotate({ title: 'Component' })),
  /** The package it comes from (`react-ui-board`), at the right of the header. */
  package: Schema.optional(Schema.String.annotate({ title: 'Package' })),
};

/** The kind's own fields, kept under `data` (decision 21); the heading is the core base's `label`. */
export const PlankData = Schema.Struct(plankFields);

export const PlankNode = Schema.Struct({
  ...Scene.Element2D.fields,
  type: Schema.Literal('plank'),
  label: Schema.String,
  data: Schema.optional(PlankData),
});

/** A line of the wireframe: a filled bar standing for a run of text. */
const Line = ({ width, strong }: { width: string; strong?: boolean }) => (
  <i className='studio-wire-line block' data-strong={strong ? true : undefined} style={{ width }} />
);

const BOARD_COLUMNS: readonly { title: string; tone?: string; cards: readonly string[][] }[] = [
  { title: 'Todo', cards: [['80%', '60%'], ['70%']] },
  { title: 'Doing', tone: 'var(--sd-accent)', cards: [['75%'], ['85%', '55%'], ['65%']] },
  { title: 'Done', tone: 'var(--sd-t-message)', cards: [['70%']] },
];

const Board = () => (
  <div className='flex gap-[10px] h-full'>
    {BOARD_COLUMNS.map(({ title, tone, cards }) => (
      <div key={title} className='studio-wire-col flex-1 flex flex-col gap-[7px] p-[8px] rounded-[7px]'>
        <div className='flex items-center gap-[5px]'>
          <i className='block rounded-full' style={{ width: 7, height: 7, background: tone ?? 'var(--sd-line)' }} />
          <Line width='46%' strong />
        </div>
        {cards.map((lines, index) => (
          <div key={index} className='studio-wire-card flex flex-col gap-[4px] p-[6px] rounded-[5px]'>
            {lines.map((width, line) => (
              <Line key={line} width={width} strong={line === 0} />
            ))}
          </div>
        ))}
      </div>
    ))}
  </div>
);

/** The budget sheet: a header row, five rows and a total, with the quarters' stacked bars floating over them. */
const Sheet = () => {
  const bars = [
    [36, 18, 12, 9, 6],
    [40, 20, 13, 14, 8],
    [44, 22, 16, 18, 9],
  ];
  const colors = [
    'var(--sd-accent)',
    'var(--sd-t-message)',
    'var(--sd-t-event)',
    'var(--sd-t-file)',
    'var(--sd-t-sheet)',
  ];
  return (
    <div className='relative h-full'>
      <div className='flex flex-col gap-[3px]'>
        {Array.from({ length: 8 }, (_, row) => (
          <div key={row} className='flex gap-[3px]' data-head={row === 0 ? true : undefined}>
            {Array.from({ length: 5 }, (_, column) => (
              <i
                key={column}
                className='studio-wire-cell block flex-1 rounded-[2px]'
                data-head={row === 0 || row === 6 ? true : undefined}
                data-selected={row === 6 && column === 4 ? true : undefined}
                style={{ height: 15 }}
              />
            ))}
          </div>
        ))}
      </div>
      <svg className='absolute' viewBox='0 0 120 100' style={{ right: 4, bottom: 4, width: 150, height: 84 }}>
        {bars.map((column, index) => {
          let y = 96;
          return column.map((height, row) => {
            y -= height;
            return (
              <rect
                key={`${index}-${row}`}
                x={10 + index * 34}
                y={y}
                width={22}
                height={height}
                fill={colors[row]}
                opacity={0.85}
              />
            );
          });
        })}
      </svg>
    </div>
  );
};

const THREAD = [
  { me: false, lines: ['80%', '50%'] },
  { me: true, lines: ['70%'] },
  { me: false, lines: ['90%', '60%'] },
  { me: true, lines: ['50%'] },
];

const Thread = () => (
  <div className='flex flex-col gap-[8px] h-full'>
    {THREAD.map(({ me, lines }, index) => (
      <div key={index} className='flex items-start gap-[6px]' style={{ justifyContent: me ? 'flex-end' : undefined }}>
        {!me && (
          <i className='block rounded-full shrink-0' style={{ width: 18, height: 18, background: 'var(--sd-line)' }} />
        )}
        <div
          className='studio-wire-bubble flex flex-col gap-[4px] p-[7px] rounded-[9px]'
          data-me={me ? true : undefined}
          style={{ width: '58%' }}
        >
          {lines.map((width, line) => (
            <Line key={line} width={width} />
          ))}
        </div>
      </div>
    ))}
    <div className='studio-wire-compose mt-auto p-[8px] rounded-[9px]'>
      <Line width='34%' />
    </div>
  </div>
);

const Generic = () => (
  <div className='flex flex-col justify-between h-full'>
    {['90%', '72%', '84%', '60%', '78%'].map((width, index) => (
      <Line key={index} width={width} strong={index === 0} />
    ))}
  </div>
);

const BODIES: Record<string, () => React.ReactElement> = { board: Board, sheet: Sheet, thread: Thread };

export const PlankNodeView = ({ node, editing }: NodeViewProps) => {
  const data = kindData(PlankData, node);
  if (node.type !== 'plank' || !data) {
    return null;
  }
  const label = 'label' in node && typeof node.label === 'string' ? node.label : '';
  const component = COMPONENTS[data.comp ?? ''] ?? DEFAULT_COMPONENT;
  const Body = BODIES[data.comp ?? ''] ?? Generic;
  const { width, height } = node.size;
  const scale = width / KIT_WIDTH;
  return (
    <div className='studio-card dx-cover rounded-xl overflow-hidden' data-testid='plank-node'>
      {/* The kit's own width, scaled into the node from its top left: the wireframe's spacing is the kit's. */}
      <div
        className='flex flex-col'
        style={{ width: KIT_WIDTH, height: height / scale, transform: `scale(${scale})`, transformOrigin: '0 0' }}
      >
        <div className='studio-plank-header flex items-center gap-[10px] px-[16px]' style={{ height: 52 }}>
          <Icon.Icon icon={component.icon} classNames='studio-card-icon shrink-0' style={{ width: 24, height: 24 }} />
          <TextPart part='label' text={label} editing={editing} classNames='grow truncate'>
            {label}
          </TextPart>
          <span className='studio-plank-package font-mono shrink-0'>{data.package ?? component.package}</span>
        </div>
        <div className='dx-grow px-[16px] py-[14px]'>
          <Body />
        </div>
      </div>
    </div>
  );
};

export const plankSpec: ElementKindSpec = {
  name: 'Plank',
  icon: 'ph--sidebar--regular',
  key: 'K',
  schema: PlankNode,
  component: PlankNodeView,
  create: ({ id, z, center, size }) => ({ type: 'plank', id, z, center, size, label: 'Plank', comp: 'board' }),
  // Nominal units (one unit is the major grid cell, 48px): the deck's 300 x 231 plank, give or take.
  defaultSize: { width: 6, height: 5 },
  resizable: true,
  minSize: { width: 150, height: 120 },
  parts: [{ field: 'label' }],
  // The panel is the shape: the kind draws its own surface and header rule.
  bare: true,
};
