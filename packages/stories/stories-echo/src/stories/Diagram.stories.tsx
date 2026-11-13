//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import {
  DIAGRAM_COMMANDS,
  canvasDrawingSchemas,
  composerDiagrams,
  loadDiagramSet,
} from '@dxos/plugin-canvas/Architecture';
import * as CanvasPlugin from '@dxos/plugin-canvas/CanvasPlugin';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as Cell from '@dxos/storybook-testing/Cell';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';

import { decorators } from '../testing.ts';

const diagram = SampleSpace.partial('echo-demo-diagram', {
  schemas: canvasDrawingSchemas,
  run: () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const overview = yield* Effect.promise(() => loadDiagramSet(db, composerDiagrams(DIAGRAM_COMMANDS)));
      return { overview };
    }),
});

const meta: Meta<typeof ModuleContainer.Root> = {
  title: 'stories/stories-echo/Diagram',
  render: ModuleContainer.Root,
  args: { compact: true },
  parameters: { layout: 'fullscreen' },
  tags: ['docs-embed'],
};

export default meta;

/** Composer's architecture as nested canvas drawings: a box with a level beneath it opens it. */
export const Diagram: StoryObj = {
  decorators: decorators({
    title: 'Infinite canvas',
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make()],
    onInit: async ({ run }) => {
      const { overview } = await run(diagram);
      return { views: { overview: { label: 'Overview', layout: [[Cell.article(overview)]] } }, open: ['overview'] };
    },
  }),
};
