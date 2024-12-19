//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createIntent, createResolver, createSurface, resolvePlugin, type PluginDefinition } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { parseClientPlugin } from '@dxos/plugin-client/types';
import { FunctionType } from '@dxos/plugin-script/types';
import { getSpace } from '@dxos/react-client/echo';

import { ComputeGraphContextProvider, SheetContainer, SheetObjectSettings } from './components';
import { type ComputeGraphRegistry } from './compute-graph';
import { compareIndexPositions, createSheet } from './defs';
import { computeGraphFacet } from './extensions';
import meta, { SHEET_PLUGIN } from './meta';
import { serializer } from './serializer';
import translations from './translations';
import { SheetAction, SheetType, type SheetPluginProvides } from './types';

export const SheetPlugin = (): PluginDefinition<SheetPluginProvides> => {
  let computeGraphRegistry: ComputeGraphRegistry | undefined;

  return {
    meta,
    ready: async ({ plugins }) => {
      const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
      invariant(client);
      let remoteFunctionUrl: string | undefined;
      if (client.config.values.runtime?.services?.edge?.url) {
        const url = new URL('/functions', client.config.values.runtime?.services?.edge?.url);
        url.protocol = 'https';
        remoteFunctionUrl = url.toString();
      }

      // Async import removes direct dependency on hyperformula.
      const { defaultPlugins, ComputeGraphRegistry } = await import('./compute-graph');
      computeGraphRegistry = new ComputeGraphRegistry({ plugins: defaultPlugins, remoteFunctionUrl });
    },
    provides: {
      context: ({ children }) => {
        invariant(computeGraphRegistry);
        return <ComputeGraphContextProvider registry={computeGraphRegistry}>{children}</ComputeGraphContextProvider>;
      },
      metadata: {
        records: {
          [SheetType.typename]: {
            createObject: (props: { name?: string }) => createIntent(SheetAction.Create, props),
            label: (object: any) => (object instanceof SheetType ? object.name : undefined),
            placeholder: ['sheet title placeholder', { ns: SHEET_PLUGIN }],
            icon: 'ph--grid-nine--regular',
            serializer,
          },
        },
      },
      translations,
      echo: {
        schema: [SheetType],
        // TODO(wittjosiah): Factor out to common package/plugin.
        //  FunctionType is currently registered here in case script plugin isn't enabled.
        system: [FunctionType],
      },
      markdown: {
        extensions: ({ document: doc }) => {
          invariant(computeGraphRegistry);
          const space = getSpace(doc);
          if (space) {
            const computeGraph = computeGraphRegistry.getOrCreateGraph(space);
            return computeGraphFacet.of(computeGraph);
          }
        },
      },
      thread: {
        predicate: (data) => data instanceof SheetType,
        createSort: (sheet) => (indexA, indexB) =>
          !indexA || !indexB ? 0 : compareIndexPositions(sheet, indexA, indexB),
      },
      surface: {
        definitions: () => [
          createSurface({
            id: `${SHEET_PLUGIN}/sheet`,
            role: ['article', 'section'],
            filter: (data): data is { subject: SheetType } =>
              data.subject instanceof SheetType && !!getSpace(data.subject),
            component: ({ data, role }) => (
              <SheetContainer space={getSpace(data.subject)!} sheet={data.subject} role={role} />
            ),
          }),
          createSurface({
            id: `${SHEET_PLUGIN}/settings`,
            role: 'complementary--settings',
            filter: (data): data is { subject: SheetType } => data.subject instanceof SheetType,
            component: ({ data }) => <SheetObjectSettings sheet={data.subject} />,
          }),
        ],
      },
      intent: {
        resolvers: () => [
          createResolver(SheetAction.Create, ({ name }) => ({ data: { object: createSheet({ name }) } })),
          createResolver(SheetAction.InsertAxis, ({ model, axis, index, count }) => {
            const _indices = model[axis === 'col' ? 'insertColumns' : 'insertRows'](index, count);
          }),
          createResolver(SheetAction.DropAxis, ({ model, axis, axisIndex, deletionData }, undo) => {
            if (!undo) {
              const undoData = model[axis === 'col' ? 'dropColumn' : 'dropRow'](axisIndex);
              return {
                undoable: {
                  message: (translations[0]['en-US'][SHEET_PLUGIN] as any)[`${axis} dropped label`],
                  data: { ...undoData, model },
                },
              };
            } else if (undo && deletionData) {
              model[deletionData.axis === 'col' ? 'restoreColumn' : 'restoreRow'](deletionData);
            }
          }),
        ],
      },
    },
  };
};
