//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createSurface, parseMetadataResolverPlugin, type PluginDefinition, resolvePlugin } from '@dxos/app-framework';
import { FunctionTrigger } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { parseClientPlugin } from '@dxos/plugin-client';
import { createExtension, toSignal } from '@dxos/plugin-graph';
import { memoizeQuery } from '@dxos/plugin-space';
import {
  getSpace,
  getTypename,
  isEchoObject,
  loadObjectReferences,
  parseId,
  type ReactiveEchoObject,
  RefArray,
  SpaceState,
} from '@dxos/react-client/echo';
import { translations as formTranslations } from '@dxos/react-ui-form';

import { AssistantPanel, AutomationPanel } from './components';
import meta, { AUTOMATION_PLUGIN } from './meta';
import translations from './translations';
import { type AutomationPluginProvides, ChainPromptType, ChainType } from './types';

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
            loadReferences: async (chain: ChainType) => await RefArray.loadAll(chain.prompts ?? []),
          },
        },
      },
      translations: [...translations, ...formTranslations],
      echo: {
        system: [ChainType, ChainPromptType, FunctionTrigger],
      },
      complementary: {
        panels: [
          {
            id: 'automation',
            label: ['open automation panel label', { ns: AUTOMATION_PLUGIN }],
            icon: 'ph--magic-wand--regular',
          },
          {
            id: 'assistant',
            label: ['open assistant panel label', { ns: AUTOMATION_PLUGIN }],
            icon: 'ph--atom--regular',
          },
        ],
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
                const spaces = toSignal(
                  (onChange) => client.spaces.subscribe(() => onChange()).unsubscribe,
                  () => client.spaces.get(),
                );
                const space = spaces?.find(
                  (space) => space.id === spaceId && space.state.get() === SpaceState.SPACE_READY,
                );
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

                const [object] = memoizeQuery(space, { id: objectId });
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
            createExtension({
              id: `${AUTOMATION_PLUGIN}/assistant-for-subject`,
              resolver: ({ id }) => {
                // TODO(Zan): Find util (or make one). Effect schema!!
                if (!id.endsWith('~assistant')) {
                  return;
                }

                const [subjectId] = id.split('~');
                const { spaceId, objectId } = parseId(subjectId);
                const spaces = toSignal(
                  (onChange) => client.spaces.subscribe(() => onChange()).unsubscribe,
                  () => client.spaces.get(),
                );
                const space = spaces?.find(
                  (space) => space.id === spaceId && space.state.get() === SpaceState.SPACE_READY,
                );
                if (!objectId) {
                  // TODO(wittjosiah): Support assistant for arbitrary subjects.
                  //   This is to ensure that the assistant panel is not stuck on an old object.
                  return {
                    id,
                    type: 'orphan-automation-for-subject',
                    data: null,
                    properties: {
                      icon: 'ph--atom--regular',
                      label: ['assistant panel label', { ns: AUTOMATION_PLUGIN }],
                      object: null,
                      space,
                    },
                  };
                }

                const [object] = memoizeQuery(space, { id: objectId });

                return {
                  id,
                  type: 'orphan-automation-for-subject',
                  data: null,
                  properties: {
                    icon: 'ph--atom--regular',
                    label: ['assistant panel label', { ns: AUTOMATION_PLUGIN }],
                    object,
                  },
                };
              },
            }),
          ];
        },
      },
      surface: {
        definitions: () => [
          createSurface({
            id: `${AUTOMATION_PLUGIN}/assistant`,
            role: 'complementary--assistant',
            component: ({ data }) => <AssistantPanel subject={data.subject} />,
          }),
          createSurface({
            id: `${AUTOMATION_PLUGIN}/automation`,
            role: 'complementary--automation',
            filter: (data): data is { subject: ReactiveEchoObject<any> } =>
              isEchoObject(data.subject) && !!getSpace(data.subject),
            component: ({ data }) => <AutomationPanel space={getSpace(data.subject)!} object={data.subject} />,
          }),
        ],
      },
      intent: {
        resolver: (intent) => {},
      },
    },
  };
};
