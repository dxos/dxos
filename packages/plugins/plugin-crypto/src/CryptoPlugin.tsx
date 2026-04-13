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
import { Crypto } from '#types';

import { translations } from './translations';

export const CryptoPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Crypto.CryptoWatchlist.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Crypto.CryptoWatchlist).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Crypto.CryptoWatchlist).pipe(Option.getOrThrow).hue ?? 'white',
          inputSchema: Crypto.CreateCryptoWatchlistSchema,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Crypto.makeWatchlist(props);
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
        id: Crypto.TokenMetric.typename,
        metadata: {
          label: (object: Crypto.TokenMetric) => `${object.symbol?.toUpperCase()} — ${object.name}`,
          icon: Annotation.IconAnnotation.get(Crypto.TokenMetric).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Crypto.TokenMetric).pipe(Option.getOrThrow).hue ?? 'white',
        },
      },
    ],
  }),
  AppPlugin.addSchemaModule({
    schema: [Crypto.CryptoWatchlist, Crypto.TokenMetric],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
