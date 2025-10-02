//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, LayoutAction, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { createExtension, rxFromSignal } from '@dxos/plugin-graph';
import { Markdown } from '@dxos/plugin-markdown/types';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { meta } from '../meta';
import { PresenterAction, type PresenterSettingsProps } from '../types';

export default (context: PluginContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: meta.id,
      // TODO(wittjosiah): This is a hack to work around presenter previously relying on "variant". Remove.
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => {
              const [settingsStore] = get(context.capabilities(Capabilities.SettingsStore));
              const settings = get(rxFromSignal(() => settingsStore?.getStore<PresenterSettingsProps>(meta.id)?.value));
              const isPresentable = settings?.presentCollections
                ? Obj.instanceOf(DataType.Collection, node.data) || Obj.instanceOf(Markdown.Document, node.data)
                : Obj.instanceOf(Markdown.Document, node.data);
              return isPresentable ? Option.some(node.data) : Option.none();
            }),
            Option.map((object) => {
              const id = fullyQualifiedId(object);
              return [
                {
                  id: [id, 'presenter'].join(ATTENDABLE_PATH_SEPARATOR),
                  data: { type: meta.id, object },
                  type: meta.id,
                  properties: {
                    label: 'Presenter',
                    icon: 'ph--presentation--regular',
                    disposition: 'hidden',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => {
              const [settingsStore] = get(context.capabilities(Capabilities.SettingsStore));
              const settings = get(rxFromSignal(() => settingsStore?.getStore<PresenterSettingsProps>(meta.id)?.value));
              const isPresentable = settings?.presentCollections
                ? Obj.instanceOf(DataType.Collection, node.data) || Obj.instanceOf(Markdown.Document, node.data)
                : Obj.instanceOf(Markdown.Document, node.data);
              return isPresentable ? Option.some(node.data) : Option.none();
            }),
            Option.map((object) => {
              const id = fullyQualifiedId(object);
              const spaceId = getSpace(object)?.id;
              return [
                {
                  id: `${PresenterAction.TogglePresentation._tag}/${id}`,
                  // TODO(burdon): Allow function so can generate state when activated.
                  //  So can set explicit fullscreen state coordinated with current presenter state.
                  data: async () => {
                    const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                    const layout = context.getCapability(DeckCapabilities.MutableDeckState);
                    const presenterId = [id, 'presenter'].join(ATTENDABLE_PATH_SEPARATOR);
                    if (!layout.deck.fullscreen) {
                      void dispatch(
                        createIntent(DeckAction.Adjust, {
                          type: 'solo--fullscreen',
                          id: presenterId,
                        }),
                      );
                    }
                    await dispatch(
                      createIntent(LayoutAction.Open, {
                        part: 'main',
                        subject: [presenterId],
                        options: { workspace: spaceId },
                      }),
                    );
                  },
                  properties: {
                    label: ['toggle presentation label', { ns: meta.id }],
                    icon: 'ph--presentation--regular',
                    disposition: 'list-item',
                    keyBinding: {
                      macos: 'shift+meta+p',
                      windows: 'shift+alt+p',
                    },
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  );
