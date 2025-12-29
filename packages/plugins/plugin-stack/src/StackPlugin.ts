//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin } from '@dxos/app-framework';
import { type Obj } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { ReactSurface } from './capabilities';
import { SECTION_IDENTIFIER, meta } from './meta';
import { translations } from './translations';
import { StackViewType } from './types';

export const StackPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: {
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
    },
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [StackViewType]),
  }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Plugin.make,
);
