//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Spec from '@dxos/compute/Spec';
import { Database, Obj, Text } from '@dxos/echo';
import * as FeatureMap from '@dxos/plugin-code/FeatureMap';
import * as SpecItem from '@dxos/plugin-code/SpecItem';

import { type SpecResult } from './spec.ts';

//
// The feature map is the spec text's `feat` blocks; this partial writes their status and dependencies into them.
// "Flight options" cites the flights spec, whose blocks are its subfeatures.
//

/** Feature keys by the block each is read from. */
export const FEATURES = {
  create: 'F-1',
  mark: 'F-2',
  heatmap: 'F-3',
  newPage: 'F-4',
  pollPage: 'F-5',
  zones: 'F-6',
  dst: 'F-7',
  flights: 'F-8',
} as const;

export const FLIGHT_FEATURES = { trip: 'F-1', search: 'F-2', pick: 'F-3', overlay: 'F-4' } as const;

export type FeatureKey = keyof typeof FEATURES;

export type FlightFeatureKey = keyof typeof FLIGHT_FEATURES;

type AnyKey = FeatureKey | FlightFeatureKey;

/** Each pair is `[feature, the feature it needs]`. */
export const DEPENDENCIES: ReadonlyArray<readonly [AnyKey, AnyKey]> = [
  ['mark', 'create'],
  ['heatmap', 'mark'],
  ['newPage', 'create'],
  ['pollPage', 'heatmap'],
  ['zones', 'create'],
  ['dst', 'zones'],
  ['flights', 'heatmap'],
  ['flights', 'dst'],
  ['search', 'trip'],
  ['pick', 'search'],
  ['overlay', 'pick'],
  // Across the two specs: the limits are set against the best slot, and the markers are drawn in the reader's zone.
  ['search', 'heatmap'],
  ['overlay', 'zones'],
];

export type FeaturesInput = { spec: SpecResult };

export type FeaturesResult = { map: Spec.Spec; flights: Spec.Spec };

/** A block's title, read from the line that opens it. */
const titleOf = (text: string, block: string): string => {
  const title = text.match(new RegExp(`^feat ${block}: (.+)$`, 'm'))?.[1];
  if (!title) {
    throw new Error(`no feat ${block}`);
  }
  return title;
};

export const FeaturesPartial: SampleSpace.Partial<FeaturesResult, FeaturesInput> = SampleSpace.partial('features', {
  schemas: [Spec.Spec],
  run: ({ spec }: FeaturesInput) =>
    Effect.gen(function* () {
      const { spec: map, flights } = spec;
      const owner = (key: AnyKey) =>
        key in FEATURES
          ? { spec: map, block: FEATURES[key as FeatureKey] }
          : { spec: flights, block: FLIGHT_FEATURES[key as FlightFeatureKey] };

      // Each spec's feat blocks carry their status and what they need; a block in the other spec is cited by link.
      const write = <K extends AnyKey>(target: Spec.Spec, blocks: Record<K, string>) =>
        Effect.gen(function* () {
          // Made by this template, so a text that will not load is a bug, not an outcome.
          const text = yield* Database.load(target.content).pipe(Effect.orDie);
          const content = SpecItem.writeFeatures(
            text.content,
            (Object.entries(blocks) as [K, string][]).map(([key, block]) => {
              const depends = DEPENDENCIES.filter(([source]) => source === key).map(([, needed]) => {
                const { spec: other, block } = owner(needed);
                return other.id === target.id ? block : SpecItem.citation(other, block);
              });
              return {
                key: block,
                title: titleOf(text.content, block),
                fields: {
                  status: 'planned',
                  ...(depends.length > 0 && { depends }),
                  ...(key === 'flights' && { spec: `echo:///${flights.id}` }),
                },
              };
            }),
          );
          Obj.update(text, (text) => {
            Text.update(text, 'content', content);
          });
          Obj.update(target, (target) => {
            target.dialects.splice(0, target.dialects.length, FeatureMap.SOFTWARE_DIALECT);
          });
        });

      yield* write(map, FEATURES);
      yield* write(flights, FLIGHT_FEATURES);
      return { map, flights };
    }),
});
