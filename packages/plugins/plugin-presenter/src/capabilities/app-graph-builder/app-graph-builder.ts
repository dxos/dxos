//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability, Common } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { ATTENDABLE_PATH_SEPARATOR, DeckOperation } from '@dxos/plugin-deck/types';
import { CreateAtom, GraphBuilder } from '@dxos/plugin-graph';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Collection } from '@dxos/schema';

import { meta } from '../../meta';
import { PresenterOperation, type PresenterSettingsProps } from '../../types';

export default Capability.makeModule((context) =>
  Effect.sync(() => {
    return Capability.contributes(
      Common.Capability.AppGraphBuilder,
      GraphBuilder.createExtension({
        id: `${meta.id}/root`,
        // TODO(wittjosiah): This is a hack to work around presenter previously relying on "variant". Remove.
        match: (node) => {
          const isPresentable =
            Obj.instanceOf(Collection.Collection, node.data) || Obj.instanceOf(Markdown.Document, node.data);
          return isPresentable ? Option.some(node.data) : Option.none();
        },
        connector: (object, get) => {
          const [settingsStore] = get(context.capabilities(Common.Capability.SettingsStore));
          const settings = get(
            CreateAtom.fromSignal(() => settingsStore?.getStore<PresenterSettingsProps>(meta.id)?.value),
          );
          const isPresentable = settings?.presentCollections
            ? Obj.instanceOf(Collection.Collection, object) || Obj.instanceOf(Markdown.Document, object)
            : Obj.instanceOf(Markdown.Document, object);
          if (!isPresentable) {
            return [];
          }
          const id = Obj.getDXN(object).toString();
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
        },
        actions: (object, get) => {
          const [settingsStore] = get(context.capabilities(Common.Capability.SettingsStore));
          const settings = get(
            CreateAtom.fromSignal(() => settingsStore?.getStore<PresenterSettingsProps>(meta.id)?.value),
          );
          const isPresentable = settings?.presentCollections
            ? Obj.instanceOf(Collection.Collection, object) || Obj.instanceOf(Markdown.Document, object)
            : Obj.instanceOf(Markdown.Document, object);
          if (!isPresentable) {
            return [];
          }
          const dxn = Obj.getDXN(object);
          const id = dxn.toString();
          const { spaceId } = dxn.asEchoDXN()!;
          return [
            {
              id: `${PresenterOperation.TogglePresentation.meta.key}/${id}`,
              // TODO(burdon): Allow function so can generate state when activated.
              //  So can set explicit fullscreen state coordinated with current presenter state.
              data: async () => {
                const { invokePromise } = context.getCapability(Common.Capability.OperationInvoker);
                const layout = context.getCapability(DeckCapabilities.MutableDeckState);
                const presenterId = [id, 'presenter'].join(ATTENDABLE_PATH_SEPARATOR);
                if (!layout.deck.fullscreen) {
                  void invokePromise(DeckOperation.Adjust, {
                    type: 'solo--fullscreen' as const,
                    id: presenterId,
                  });
                }
                await invokePromise(Common.LayoutOperation.Open, {
                  subject: [presenterId],
                  workspace: spaceId,
                });
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
        },
      }),
    );
  }),
);
