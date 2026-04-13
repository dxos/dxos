//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';

import { ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { Research } from '#types';

import { translations } from './translations';

export const ResearchPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Research.ResearchAccount.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Research.ResearchAccount).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Research.ResearchAccount).pipe(Option.getOrThrow).hue ?? 'white',
          inputSchema: Research.CreateResearchAccountSchema,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Research.makeAccount(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: false,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
      {
        id: Research.ResearchReport.typename,
        metadata: {
          label: (object: Research.ResearchReport) => object.title,
          icon: Annotation.IconAnnotation.get(Research.ResearchReport).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Research.ResearchReport).pipe(Option.getOrThrow).hue ?? 'white',
        },
      },
    ],
  }),
  AppPlugin.addSchemaModule({
    schema: [Research.ResearchAccount, Research.ResearchReport],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
