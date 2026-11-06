//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Filter, Query } from '@dxos/echo';
import * as ExplorerPlugin from '@dxos/plugin-explorer/ExplorerPlugin';
import * as Graph from '@dxos/plugin-explorer/Graph';
import * as PreviewPlugin from '@dxos/plugin-preview/PreviewPlugin';

import { companySchemas, seedCompanies } from '../companies.ts';
import * as Demo from '../Demo.ts';

const partial = SampleSpace.partial('echo-demo-explorer', {
  schemas: [...companySchemas, Graph.Graph],
  run: () =>
    Effect.gen(function* () {
      yield* seedCompanies();
      const graph = yield* Database.add(
        Graph.make({ name: 'Companies', query: { ast: Query.select(Filter.everything()).ast } }),
      );
      return { graph };
    }),
});

/** The space as a force-directed graph of companies and their people; hovering a node opens its card. */
export const ExplorerDemo = Demo.make({
  id: 'explorer',
  title: 'Graph explorer',
  partial,
  // Only this demo previews: the preview plugin answers hovers anywhere on the page, so a demo whose space lacks the
  // hovered object would answer with an empty card.
  plugins: () => [ExplorerPlugin.make(), PreviewPlugin.make()],
  views: { graph: 'Graph' },
  layout: ['graph'],
});
