//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Filter, Query, Type } from '@dxos/echo';
import * as ExplorerPlugin from '@dxos/plugin-explorer/ExplorerPlugin';
import * as Graph from '@dxos/plugin-explorer/Graph';
import * as PreviewPlugin from '@dxos/plugin-preview/PreviewPlugin';
import { Organization, Person } from '@dxos/types';

import { companySchemas } from '../companies.ts';
import * as Demo from '../Demo.ts';

const partial = SampleSpace.partial('echo-demo-explorer', {
  schemas: [...companySchemas, Graph.Graph],
  run: () =>
    Effect.gen(function* () {
      // The space also holds the other demos' content, so the graph keeps to the companies and their people.
      const types = [Organization.Organization, Person.Person];
      const raw = types.map((type) => `type:${Type.getTypename(type)}`).join(' OR ');
      const query = Query.select(Filter.or(...types.map((type) => Filter.type(type))));
      const graph = yield* Database.add(Graph.make({ name: 'Companies', query: { raw, ast: query.ast } }));
      return { graph };
    }),
});

/** The companies and their people as a force-directed graph; hovering a node opens its card. */
export const ExplorerDemo = Demo.make({
  id: 'explorer',
  title: 'Graph explorer',
  partial,
  // Only this demo previews: the preview plugin answers hovers anywhere on the page, so a second instance would open
  // a second card.
  plugins: () => [ExplorerPlugin.make(), PreviewPlugin.make()],
  views: { graph: 'Graph' },
  layout: ['graph'],
});
