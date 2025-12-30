//
// Copyright 2023 DXOS.org
//

import { Common, Plugin } from '@dxos/app-framework';
import { type Obj } from '@dxos/echo';

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
  Common.Plugin.addSchemaModule({ schema: [StackViewType] }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Plugin.make,
);
