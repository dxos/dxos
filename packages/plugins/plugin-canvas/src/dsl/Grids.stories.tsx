//
// Copyright 2026 DXOS.org
//

//
// What a `grid` does, one layout per story, each seeded FROM ITS DSL rather than from records: the text below each
// story is the whole input, so a story is also the proof that the rule survives being written down. A grid places
// the boxes naming it as their `parent` and draws nothing itself, so what is on screen is the placement.
//
// The last story nests them: three columns, each a label over a body, each body a run of boxes, which is the shape
// a slide is built from.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { type ContentMap, DSL, applyCommands } from '@dxos/diagram';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { SceneHandler } from '@dxos/react-ui-canvas';
import * as Cell from '@dxos/storybook-testing/Cell';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';
import * as StoryHarness from '@dxos/storybook-testing/StoryHarness';
import { trim } from '@dxos/util';

import * as CanvasPlugin from '#meta';
import { translations } from '#translations';

import types from '../capabilities/schema.ts';
import { addTestCanvas } from '../testing/canvas.ts';
import { SourceColumn, seeded } from './source-column.tsx';

/** A plain ground with a dotted 8px pitch, so what is on screen is the placement and nothing else. */
const CANVAS = { styleSet: 'neu', background: 'neu', grid: 8, backgroundGrid: 'dots', readonly: true } as const;

const seedSource =
  (source: string) =>
  (content: ContentMap): void => {
    const { commands, problems } = DSL.read(source);
    const errors = problems.filter(({ severity }) => severity === 'error');
    if (errors.length > 0) {
      throw new Error(`grid story does not parse: ${errors.map(({ message }) => message).join(' · ')}`);
    }
    applyCommands(content, commands, SceneHandler);
  };

const story = (name: string, source: string): StoryObj<typeof meta> => ({
  decorators: StoryHarness.decorators({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make()],
    onInit: async ({ space }) => {
      const canvas = addTestCanvas(space.db, seedSource(source), CANVAS);
      const drawing = space.db.add(Drawing.make({ name, canvas }));
      await space.db.flush();
      // The text IS the input here, so it is shown beside the drawing: edit a track and press Rebuild.
      seeded.canvas = canvas;
      seeded.source = undefined;
      return [[Cell.article(drawing)], [{ object: drawing, component: SourceColumn }]];
    },
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 60_000 });
    // Every child the document names is placed: a grid that solved to nothing would still draw its own frame.
    const placed = source.split('\n').filter((line) => line.includes('parent=')).length;
    await expect(canvasElement.querySelectorAll('[data-node-id]').length).toBeGreaterThanOrEqual(placed);
  },
});

const meta: Meta<typeof ModuleContainer.Root> = {
  title: 'plugins/plugin-canvas/dsl/Grids',
  render: ModuleContainer.Root,
  parameters: { layout: 'fullscreen', translations },
};

export default meta;

/** Three equal columns: the simplest grid there is, and the one every slide starts from. */
export const Columns = story(
  'columns',
  trim`
    object demo @ 0,0 {
      grid root 0,0 900x300 cols=3 gap=24 padding=24 stroke=dashed {
        rect a "One"
        rect b "Two"
        rect c "Three"
      }
    }
  `,
);

/** The same rule down the other axis. */
export const Rows = story(
  'rows',
  trim`
    object demo @ 0,0 {
      grid root 0,0 400x480 rows=3 gap=16 padding=16 stroke=dashed {
        rect a "One"
        rect b "Two"
        rect c "Three"
      }
    }
  `,
);

/** Both axes: children fill the cells in order, row by row, as CSS grid's auto-flow does. */
export const Cells = story(
  'cells',
  trim`
    object demo @ 0,0 {
      grid root 0,0 720x480 cols=3 rows=2 gap=16 padding=16 stroke=dashed {
        rect a "1"
        rect b "2"
        rect c "3"
        rect d "4"
        rect e "5"
        rect f "6"
      }
    }
  `,
);

/**
 * The three kinds of track. `160` is a fixed extent, `auto` is the content's own size — the middle box states
 * 200x0, so the track is 200 wide — and the `fr` tracks divide what is left in proportion.
 */
export const Tracks = story(
  'tracks',
  trim`
    object demo @ 0,0 {
      grid root 0,0 900x240 cols="160 auto 1fr 2fr" gap=16 padding=16 stroke=dashed {
        rect fixed "160"
        rect content 200x0 "auto"
        rect one "1fr"
        rect two "2fr"
      }
    }
  `,
);

/**
 * One cell size, whatever the count. `autoRows` sizes the implicit tracks (CSS's `grid-auto-rows`), so the two
 * columns draw cards the same height rather than each dividing its own frame; `alignContent` then says where the
 * space they leave over goes, which is how a short run sits in the middle of a tall column.
 */
export const Uniform = story(
  'uniform',
  trim`
    object demo @ 0,0 {
      grid root 0,0 720x600 cols=2 gap=32 padding=32 stroke=dashed {
        grid left gap=16 autoRows=120 alignContent=center stroke=dashed {
          rect a "One"
          rect b "Two"
        }
        grid right gap=16 autoRows=120 alignContent=center stroke=dashed {
          rect c "One"
          rect d "Two"
          rect e "Three"
        }
      }
    }
  `,
);

/**
 * Nesting, which is the shape a slide is: a row of three columns, each column a label over a body, each body a run
 * of boxes. Nothing states a coordinate below the outermost frame — every position on screen comes from the rule.
 */
export const Nested = story(
  'nested',
  trim`
    object demo @ 0,0 {
      grid root 0,0 1200x600 cols=3 gap=32 padding=32 stroke=dashed {
        grid col-0 rows="40 1fr" gap=12 {
          rect label-0 "Composer" fill=none stroke=none align=center valign=middle fontSize=28
          grid body-0 gap=12 {
            rect plank-0 "Roadmap"
            rect plank-1 "Budget"
            rect plank-2 "Design chat"
          }
        }
        grid col-1 rows="40 1fr" gap=12 {
          rect label-1 "ECHO Hyperspace" fill=none stroke=none align=center valign=middle fontSize=28
          grid body-1 gap=12 {
            ellipse field "Spaces"
          }
        }
        grid col-2 rows="40 1fr" gap=12 {
          rect label-2 "EDGE Services" fill=none stroke=none align=center valign=middle fontSize=28
          grid body-2 gap=8 {
            rect svc-0 "Calendar"
            rect svc-1 "Email"
            rect svc-2 "Storage"
            rect svc-3 "Search"
            rect svc-4 "Travel"
          }
        }
      }
    }
  `,
);
