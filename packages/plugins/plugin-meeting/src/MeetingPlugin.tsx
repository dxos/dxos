//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';

import { AppGraphBuilder, CallManager, IntentResolver, ReactRoot, ReactSurface } from './capabilities';
import { meta } from './meta';
import translations from './translations';
import { MeetingAction, MeetingType } from './types';

export const MeetingPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/call-manager`,
      activatesOn: ClientEvents.ClientReady,
      activate: CallManager,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: Events.SetupMetadata,
      activate: () => [
        contributes(Capabilities.Metadata, {
          id: MeetingType.typename,
          metadata: {
            label: (object: any) =>
              isInstanceOf(MeetingType, object) ? object.name || new Date(object.created).toLocaleString() : undefined,
            icon: 'ph--video-conference--regular',
          },
        }),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/object-form`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () =>
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: MeetingType,
            hidden: true,
            getIntent: () => createIntent(MeetingAction.Create),
          }),
        ),
    }),
    defineModule({
      id: `${meta.id}/module/react-root`,
      activatesOn: Events.Startup,
      activate: ReactRoot,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupReactSurface,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntentResolver,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
  ]);
