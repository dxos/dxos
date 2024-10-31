//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition, parseMetadataResolverPlugin, resolvePlugin } from '@dxos/app-framework';
import { FunctionDef, FunctionTrigger } from '@dxos/functions/types';
import { invariant } from '@dxos/invariant';
import { parseClientPlugin } from '@dxos/plugin-client';
import { createExtension, toSignal } from '@dxos/plugin-graph';
import { getTypename, loadObjectReferences, parseId } from '@dxos/react-client/echo';

import { AutomationPanel } from './components';
import meta, { AUTOMATION_PLUGIN } from './meta';
import translations from './translations';
import { AutomationAction, type AutomationPluginProvides, ChainPromptType, ChainType } from './types';

// TODO(burdon): Prompt article.
// TODO(burdon): Trigger panel.

export const AutomationPlugin = (): PluginDefinition<AutomationPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [ChainType.typename]: {
            placeholder: ['object placeholder', { ns: AUTOMATION_PLUGIN }],
            icon: 'ph--magic-wand--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (chain: ChainType) => loadObjectReferences(chain, (chain) => chain.prompts),
          },
        },
      },
      translations,
      echo: {
        schema: [ChainType, ChainPromptType, FunctionDef, FunctionTrigger],
      },
      graph: {
        builder: (plugins) => {
          const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
          const metadataPlugin = resolvePlugin(plugins, parseMetadataResolverPlugin);
          const resolve = metadataPlugin?.provides.metadata.resolver;
          const client = clientPlugin?.provides.client;
          invariant(resolve);
          invariant(client);

          return [
            // Create nodes for object settings.
            createExtension({
              id: `${AUTOMATION_PLUGIN}/automation-for-subject`,
              resolver: ({ id }) => {
                if (!id.endsWith('~automation')) {
                  return;
                }

                const type = 'orphan-settings-for-subject';
                const icon = 'ph--magic-wand--regular';

                const [subjectId] = id.split('~');
                const { spaceId, objectId } = parseId(subjectId);
                const space = client.spaces.get().find((space) => space.id === spaceId);
                if (!objectId) {
                  // TODO(burdon): Ref SPACE_PLUGIN ns.
                  const label = space
                    ? space.properties.name || ['unnamed space label', { ns: AUTOMATION_PLUGIN }]
                    : ['unnamed object settings label', { ns: AUTOMATION_PLUGIN }];

                  // TODO(wittjosiah): Support comments for arbitrary subjects.
                  //   This is to ensure that the comments panel is not stuck on an old object.
                  return {
                    id,
                    type,
                    data: null,
                    properties: {
                      icon,
                      label,
                      showResolvedThreads: false,
                      object: null,
                      space,
                    },
                  };
                }

                const object = toSignal(
                  (onChange) => {
                    const timeout = setTimeout(async () => {
                      await space?.db.loadObjectById(objectId);
                      onChange();
                    });

                    return () => clearTimeout(timeout);
                  },
                  () => space?.db.getObjectById(objectId),
                  subjectId,
                );
                if (!object || !subjectId) {
                  return;
                }

                const meta = resolve(getTypename(object) ?? '');
                const label = meta.label?.(object) ||
                  object.name ||
                  meta.placeholder || ['unnamed object settings label', { ns: AUTOMATION_PLUGIN }];

                return {
                  id,
                  type,
                  data: null,
                  properties: {
                    icon,
                    label,
                    object,
                  },
                };
              },
            }),
          ];
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            // case 'article':
            // return data.object instanceof ChainType ? <ChainArticle chain={data.object} /> : null;

            case 'complementary--automation':
              return <AutomationPanel />;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case AutomationAction.CREATE: {
              return {
                // data: create(ChainType, { prompts: [] }),
                // data: create(FunctionTrigger, { function: '', spec: { type: 'timer', cron: '' } }),
              };
            }
          }
        },
      },
    },
  };
};
