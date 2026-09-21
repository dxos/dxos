//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';

import { PreviewCapabilities } from '#types';

import { PreviewEvents } from '../events.ts';

// Browser-only with the popover it serves: the resolver loads objects for a card no headless host renders.
export const LinkResolver = Capability.makeModule(
  'LinkResolver',
  { provides: [PreviewCapabilities.LinkResolver], activatesOn: PreviewEvents.Start, environments: [] },
  () =>
    Effect.succeed(
      Capability.contribute(PreviewCapabilities.LinkResolver, [
        {
          match: (url) => EID.tryParse(url) !== undefined,
          resolve: ({ eid, label }, { space }) =>
            Effect.gen(function* () {
              const parsed = EID.tryParse(eid);
              if (!parsed || !space) {
                return undefined;
              }
              const entity = yield* Effect.tryPromise(() => space.db.makeRef(parsed).load()).pipe(
                Effect.catch(() => Effect.succeed(undefined)),
              );
              // A relation has no card; only an object is previewed.
              if (!Obj.isObject(entity)) {
                return undefined;
              }
              return { label: Obj.getLabel(entity, { fallback: 'typename' }) ?? label, object: entity };
            }),
        },
      ]),
    ),
);
