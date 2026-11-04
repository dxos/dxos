//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import type * as Spec from '@dxos/compute/Spec';
import { Database, Obj, Ref, Relation } from '@dxos/echo';
import * as Feature from '@dxos/plugin-code/Feature';
import * as FeatureMap from '@dxos/plugin-code/FeatureMap';
import * as SpecText from '@dxos/plugin-code/SpecText';

import { FLIGHTS_PATH, SPEC_PATH, type SpecResult } from './spec.ts';

//
// The feature map: one feature per `feat` block, read from the spec text itself so names, descriptions and
// requirements are the spec's own. "Flight options" owns the flights spec, whose blocks are its subfeatures.
//

/** Feature keys by the block each is read from. */
export const FEATURES = {
  create: 'F-1',
  mark: 'F-2',
  heatmap: 'F-3',
  zones: 'F-4',
  dst: 'F-5',
  flights: 'F-6',
} as const;

export const FLIGHT_FEATURES = { trip: 'F-1', search: 'F-2', pick: 'F-3', overlay: 'F-4' } as const;

export type FeatureKey = keyof typeof FEATURES;

export type FlightFeatureKey = keyof typeof FLIGHT_FEATURES;

type AnyKey = FeatureKey | FlightFeatureKey;

/** Each pair is `[feature, the feature it needs]`. */
export const DEPENDENCIES: ReadonlyArray<readonly [AnyKey, AnyKey]> = [
  ['mark', 'create'],
  ['heatmap', 'mark'],
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

export type FeaturesResult = {
  features: Record<FeatureKey, Feature.Feature>;
  flights: Record<FlightFeatureKey, Feature.Feature>;
};

/** Embeds each `feat` block of `text` as a feature on `spec`, then returns the features by key. */
const takeFeatures = <K extends string>(spec: Spec.Spec, path: string, text: string, blocks: Record<K, string>) =>
  Effect.gen(function* () {
    yield* Effect.promise(() => SpecText.take(spec, { path, text }));
    const features = yield* Effect.promise(() => Ref.loadAll(FeatureMap.getFeatures(spec)));
    const bySource = new Map(
      features.flatMap((feature) => Feature.getSources(feature).map((source) => [source, feature])),
    );
    return Object.fromEntries(
      Object.entries<string>(blocks).map(([key, block]) => {
        const feature = bySource.get(`${path}#${block}`);
        if (!feature) {
          throw new Error(`${path} has no feat ${block}`);
        }
        return [key, feature];
      }),
    ) as Record<K, Feature.Feature>;
  });

export const FeaturesPartial: SampleSpace.Partial<FeaturesResult, FeaturesInput> = SampleSpace.partial('features', {
  schemas: [Feature.Feature, Feature.DependsOn],
  run: ({ spec }: FeaturesInput) =>
    Effect.gen(function* () {
      const text = (target: Spec.Spec) => Effect.promise(async () => (await target.content.load()).content ?? '');
      const features = yield* takeFeatures(spec.spec, SPEC_PATH, yield* text(spec.spec), FEATURES);
      const flights = yield* takeFeatures(spec.flights, FLIGHTS_PATH, yield* text(spec.flights), FLIGHT_FEATURES);
      Obj.update(features.flights, (feature) => {
        feature.spec = Ref.make(spec.flights);
      });

      const all: Record<AnyKey, Feature.Feature> = { ...features, ...flights };
      for (const [source, target] of DEPENDENCIES) {
        yield* Database.add(Feature.makeDependsOn({ [Relation.Source]: all[source], [Relation.Target]: all[target] }));
      }

      return { features, flights };
    }),
});
