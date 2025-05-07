//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';

import { contributes, type PluginsContext, Capabilities, createIntent, chain, LayoutAction } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { CollectionType } from '@dxos/plugin-space/types';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';

import { PRESENTER_PLUGIN } from '../meta';
import { PresenterAction, type PresenterSettingsProps } from '../types';

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
        const spaceId = getSpace(object)?.id;
        return [
          {
            id: `${PresenterAction.TogglePresentation._tag}/${id}`,
            // TODO(burdon): Allow function so can generate state when activated.
            //  So can set explicit fullscreen state coordinated with current presenter state.
            data: async () => {
              const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
              const presenterId = [id, 'presenter'].join(ATTENDABLE_PATH_SEPARATOR);
              await dispatch(
                pipe(
                  createIntent(LayoutAction.Open, {
                    part: 'main',
                    subject: [presenterId],
                    options: { workspace: spaceId },
                  }),
                  chain(DeckAction.Adjust, {
                    type: 'solo--fullscreen',
                    id: presenterId,
                  }),
                ),
              );
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
