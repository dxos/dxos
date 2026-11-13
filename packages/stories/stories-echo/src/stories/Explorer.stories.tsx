//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Filter, Query, Type } from '@dxos/echo';
import * as ExplorerPlugin from '@dxos/plugin-explorer/ExplorerPlugin';
import * as Graph from '@dxos/plugin-explorer/Graph';
import * as PreviewPlugin from '@dxos/plugin-preview/PreviewPlugin';
import * as Cell from '@dxos/storybook-testing/Cell';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';
import { Organization, Person } from '@dxos/types';

import { companies, companySchemas } from '../content/companies.ts';
import { decorators } from '../testing.ts';

const explorer = SampleSpace.partial('echo-demo-explorer', {
  schemas: [...companySchemas, Graph.Graph],
  run: () =>
    Effect.gen(function* () {
      // The space may hold other stories' content, so the graph keeps to the companies and their people.
      const types = [Organization.Organization, Person.Person];
      const raw = types.map((type) => `type:${Type.getTypename(type)}`).join(' OR ');
      const query = Query.select(Filter.or(...types.map((type) => Filter.type(type))));
      const graph = yield* Database.add(Graph.make({ name: 'Companies', query: { raw, ast: query.ast } }));
      return { graph };
    }),
});

const meta: Meta<typeof ModuleContainer.Root> = {
  title: 'stories/stories-echo/Explorer',
  render: ModuleContainer.Root,
  args: { compact: true },
  parameters: { layout: 'fullscreen' },
  tags: ['docs-embed'],
};

export default meta;

/** The companies and their people as a force-directed graph; hovering a node opens its card. */
export const Explorer: StoryObj = {
  decorators: decorators({
    title: 'Graph explorer',
    // Only this story previews: the preview plugin answers hovers anywhere on the page, so a second instance would
    // open a second card.
    plugins: [ExplorerPlugin.make(), PreviewPlugin.make()],
    onInit: async ({ run }) => {
      await run(companies);
      const { graph } = await run(explorer);
      return { views: { graph: { label: 'Graph', layout: [[Cell.article(graph)]] } }, open: ['graph'] };
    },
  }),
};
