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
import { GitHub } from '#types';

import { translations } from './translations';

export const GitHubPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: GitHub.GitHubAccount.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(GitHub.GitHubAccount).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(GitHub.GitHubAccount).pipe(Option.getOrThrow).hue ?? 'white',
          inputSchema: GitHub.CreateGitHubAccountSchema,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = GitHub.makeAccount(props);
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
        id: GitHub.GitHubRepo.typename,
        metadata: {
          label: (object: GitHub.GitHubRepo) => object.name,
          icon: Annotation.IconAnnotation.get(GitHub.GitHubRepo).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(GitHub.GitHubRepo).pipe(Option.getOrThrow).hue ?? 'white',
        },
      },
    ],
  }),
  AppPlugin.addSchemaModule({
    schema: [GitHub.GitHubAccount, GitHub.GitHubRepo],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
