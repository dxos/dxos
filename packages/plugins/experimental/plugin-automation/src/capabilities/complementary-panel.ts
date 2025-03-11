//
// Copyright 2025 DXOS.org
//

import { effect, untracked } from '@preact/signals-core';

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { FunctionType } from '@dxos/functions/types';
import { create } from '@dxos/live-object';
import { ClientCapabilities } from '@dxos/plugin-client';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { Filter, parseId } from '@dxos/react-client/echo';

import { AUTOMATION_PLUGIN } from '../meta';

export default (context: PluginsContext) => {
  const state = create({ functionsAvailable: false });
  const setState = (next: boolean) => {
    untracked(() => {
      if (next !== state.functionsAvailable) {
        state.functionsAvailable = next;
      }
    });
  };

  const unsubscribe = effect(() => {
    const client = context.requestCapabilities(ClientCapabilities.Client)[0];
    const workspace = context.requestCapabilities(Capabilities.Layout)[0]?.workspace;
    const { spaceId } = parseId(workspace);
    if (!spaceId || !client) {
      setState(false);
      return;
    }

    const space = client.spaces.get(spaceId);
    if (!space) {
      setState(false);
      return;
    }

    return space.db
      .query(Filter.schema(FunctionType))
      .subscribe((query) => setState(query.objects.length > 0), { fire: true });
  });

  return contributes(
    DeckCapabilities.ComplementaryPanel,
    {
      id: 'automation',
      label: ['automation panel label', { ns: AUTOMATION_PLUGIN }],
      icon: 'ph--robot--regular',
      filter: () => state.functionsAvailable,
    },
    () => unsubscribe(),
  );
};
