//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';
import { type Obj } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { ReactSurface } from './capabilities';
import { SECTION_IDENTIFIER, meta } from './meta';
import { translations } from './translations';
import { StackViewType } from './types';

export const StackPlugin = definePlugin(meta, () => [
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
        id: SECTION_IDENTIFIER,
        metadata: {
          parse: (section: { object: Obj.Any }, type: string) => {
            switch (type) {
              case 'node':
                return { id: section.object.id, label: (section.object as any).title, data: section.object };
              case 'object':
                return section.object;
              case 'view-object':
                return section;
            }
          },
        },
      }),
    ],
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => contributes(ClientCapabilities.Schema, [StackViewType]),
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
]);
