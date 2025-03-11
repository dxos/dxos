//
// Copyright 2025 DXOS.org
//

import { effect, untracked } from '@preact/signals-core';

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { FunctionType } from '@dxos/functions/types';
import { create } from '@dxos/live-object';
import { ClientCapabilities } from '@dxos/plugin-client';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { Filter, parseId, type Query, type SpaceId, type Space } from '@dxos/react-client/echo';

import { AUTOMATION_PLUGIN } from '../meta';

export default (context: PluginsContext) => {
  const state = create({ functionsAvailable: false });
  const queries = new Map<SpaceId, Query<FunctionType>>();
  const subscriptions = new EventSubscriptions();

  const getQueryForSpace = (space: Space) => {
    return untracked(() => {
      if (queries.has(space.id)) {
        return queries.get(space.id)!;
      }

      const query = space.db.query(Filter.schema(FunctionType));
      subscriptions.add(query.subscribe());
      queries.set(space.id, query);
      return query;
    });
  };

  const unsubscribe = effect(() => {
    const client = context.requestCapabilities(ClientCapabilities.Client)[0];
    const workspace = context.requestCapabilities(Capabilities.Layout)[0]?.workspace;
    const { spaceId } = parseId(workspace);
    if (!spaceId || !client) {
      return;
    }

    const space = client.spaces.get(spaceId);
    if (!space) {
      return;
    }

    const query = getQueryForSpace(space);
    state.functionsAvailable = query.objects.length > 0;
  });

  return contributes(
    DeckCapabilities.ComplementaryPanel,
    {
      id: 'automation',
      label: ['automation panel label', { ns: AUTOMATION_PLUGIN }],
      icon: 'ph--robot--regular',
      filter: () => state.functionsAvailable,
    },
    () => {
      unsubscribe();
      subscriptions.clear();
    },
  );
};
