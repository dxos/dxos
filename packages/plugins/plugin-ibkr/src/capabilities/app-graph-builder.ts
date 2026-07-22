//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { GraphBuilder } from '@dxos/plugin-graph';
import { linkedSegment, selectionAspect } from '@dxos/react-ui-attention';

import { meta } from '../meta';
import { Ibkr } from '../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read reactively so the extension establishes a dependency and heals once this
    // capability lands (dependency modules contribute individually, not batched per wave).
    const viewStateAtom = yield* Capability.atom(AttentionCapabilities.ViewState);
    const selectedId = Atom.family((nodeId: string) =>
      Atom.make((get) => {
        const [viewState] = get(viewStateAtom);
        if (!viewState) {
          return undefined;
        }
        const selection = get(viewState.atom(selectionAspect, nodeId));
        return selection.mode === 'single' ? selection.id : undefined;
      }),
    );

    const extension = yield* GraphBuilder.createExtension({
      id: 'portfolioReport',
      match: (node) =>
        Ibkr.isPortfolio(node.data) ? Option.some({ portfolio: node.data, nodeId: node.id }) : Option.none(),
      connector: ({ portfolio, nodeId }, get) => {
        const db = Obj.getDatabase(portfolio);
        const feed = portfolio.feed ? (get(portfolio.feed.atom) as Feed.Feed | undefined) : undefined;
        if (!db || !feed) {
          return Effect.succeed([]);
        }
        const reportId = get(selectedId(nodeId));
        // Id-based queries are untyped; the portfolio feed only ever holds Report snapshots.
        const report = get(
          db.query(Query.select(reportId ? Filter.id(reportId) : Filter.nothing()).from(feed)).atom,
        )[0] as Ibkr.Report | undefined;
        return Effect.succeed([
          AppNode.makeCompanion({
            id: linkedSegment('report'),
            label: ['report.companion.label', { ns: meta.profile.key }],
            icon: 'ph--file-text--regular',
            data: report ?? 'report',
          }),
        ]);
      },
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, [extension]);
  }),
);
