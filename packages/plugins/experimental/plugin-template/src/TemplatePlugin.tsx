//
// Copyright 2023 DXOS.org
//

import {
  createIntent,
  Capabilities,
  contributes,
  Events,
  defineModule,
  definePlugin,
  oneOf,
} from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { ReactSurface, IntentResolver } from './capabilities';
import { meta, TEMPLATE_PLUGIN } from './meta';
import translations from './translations';
import { TemplateAction, TemplateType } from './types';

export const TemplatePlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: oneOf(Events.Startup, Events.SetupAppGraph),
      activate: () =>
        contributes(Capabilities.Metadata, {
          id: TemplateType.typename,
          metadata: {
            createObject: (props: { name?: string }) => createIntent(TemplateAction.Create, props),
            placeholder: ['object placeholder', { ns: TEMPLATE_PLUGIN }],
            icon: 'ph--asterisk--regular',
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupClient,
      activate: () => contributes(ClientCapabilities.Schema, [TemplateType]),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
  ]);
