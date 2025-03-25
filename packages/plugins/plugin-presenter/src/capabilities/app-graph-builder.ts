//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginsContext, Capabilities, createIntent } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { CollectionType } from '@dxos/plugin-space/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';

import { PRESENTER_PLUGIN } from '../meta';
import { PresenterAction, type PresenterSettingsProps } from '../types';
import { isInstanceOf } from '@dxos/echo-schema';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: PRESENTER_PLUGIN,
      filter: (node): node is Node<CollectionType | DocumentType> => {
        const settings = context
          .requestCapabilities(Capabilities.SettingsStore)[0]
          ?.getStore<PresenterSettingsProps>(PRESENTER_PLUGIN)?.value;
        return settings?.presentCollections
          ? isInstanceOf(CollectionType, node.data) || isInstanceOf(DocumentType, node.data)
          : isInstanceOf(DocumentType, node.data);
      },
      actions: ({ node }) => {
        const object = node.data;
        const id = fullyQualifiedId(object);
        return [
          {
            id: `${PresenterAction.TogglePresentation._tag}/${id}`,
            // TODO(burdon): Allow function so can generate state when activated.
            //  So can set explicit fullscreen state coordinated with current presenter state.
            data: async () => {
              const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
              await dispatch(createIntent(PresenterAction.TogglePresentation, { object }));
            },
            properties: {
              label: ['toggle presentation label', { ns: PRESENTER_PLUGIN }],
              icon: 'ph--presentation--regular',
              keyBinding: {
                macos: 'shift+meta+p',
                windows: 'shift+alt+p',
              },
            },
          },
        ];
      },
    }),
  );
