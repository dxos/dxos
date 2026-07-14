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
import { Connection, Connector, connectorAuthActions } from '@dxos/plugin-connector';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { linkedSegment, selectionAspect } from '@dxos/react-ui-attention';

import { IBKR_CONNECTOR_ID } from '../constants';
import { meta } from '../meta';
import { Ibkr } from '../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
    const selectedId = Atom.family((nodeId: string) =>
      Atom.make((get) => {
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

    const connectorAuthExtension = yield* GraphBuilder.createExtension({
      id: 'portfolioConnectorAuth',
      match: (node) => (Ibkr.isPortfolio(node.data) ? Option.some(node.data) : Option.none()),
      // A `connector:` (not `actions:`) extension, so `connectorAuthActions`' group node keeps its
      // type — see the doc comment on `AppNode.makeToolbarActionGroup`.
      relation: Node.actionRelation(),
      connector: (portfolio, get) => {
        const db = Obj.getDatabase(portfolio);
        if (!db) {
          return Effect.succeed([]);
        }
        const allConnections = get(db.query(Filter.type(Connection.Connection)).atom);
        const connected = allConnections.some((connection) => connection.connectorId === IBKR_CONNECTOR_ID);
        if (connected) {
          // Connected: the article's own "Sync" button covers this action.
          return Effect.succeed([]);
        }
        return Effect.gen(function* () {
          const allConnectors = (yield* Capability.Service).getAll(Connector).flat();
          return connectorAuthActions({
            connectorIds: [IBKR_CONNECTOR_ID],
            db,
            spaceId: db.spaceId,
            allConnectors,
            allConnections,
          });
        });
      },
    });

    return Capability.contributes(AppCapabilities.AppGraphBuilder, [extension, connectorAuthExtension]);
  }),
);
