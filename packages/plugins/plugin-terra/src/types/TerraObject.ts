//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';

import { type Domain } from '../sim/index.ts';

/** The kinds of movable object the simulation supports. */
export const Kind = Schema.Literals(['boat', 'plane', 'satellite', 'tank', 'rocket']);
export type Kind = Schema.Schema.Type<typeof Kind>;

/** A position on the planet; degrees, with `height` a fraction of radius above sea level. */
export const GeoPointSchema = Schema.Struct({
  lat: Schema.Number,
  lng: Schema.Number,
  height: Schema.Number,
});

/** Circular orbit parameters for objects that never touch the surface. */
export const Orbit = Schema.Struct({
  altitude: Schema.Number,
  inclination: Schema.Number,
  phase: Schema.Number,
  period: Schema.Number,
});

export class TerraObject extends Type.makeObject<TerraObject>(DXN.make('org.dxos.type.terra.object', '0.1.0'))(
  Schema.Struct({
    kind: Kind,
    name: Schema.optional(Schema.String),
    /** Surface angular speed in radians per simulated second. */
    speed: Schema.Number,
    /** Initial bearing in degrees for objects with no destination. */
    heading: Schema.optional(Schema.Number),
    source: Schema.optional(GeoPointSchema),
    target: Schema.optional(GeoPointSchema),
    orbit: Schema.optional(Orbit),
    /** Epoch used as this object's deterministic clock origin. */
    spawnedAt: Schema.Number,
  }).pipe(
    LabelAnnotation.set(['name']),
    // Kind-neutral: `IconAnnotation` is a static schema-level value, so one icon covers boats,
    // tanks, satellites and rockets alike — a plane icon would mislabel four kinds out of five.
    Annotation.IconAnnotation.set({ icon: 'ph--shapes--regular', hue: 'green' }),
  ),
) {}

export type MakeProps = {
  kind: Kind;
  name?: string;
  speed: number;
  heading?: number;
  source?: Schema.Schema.Type<typeof GeoPointSchema>;
  target?: Schema.Schema.Type<typeof GeoPointSchema>;
  orbit?: Schema.Schema.Type<typeof Orbit>;
  spawnedAt: number;
};

/** Creates a `TerraObject` from the given properties; positions are derived at runtime, never stored. */
export const make = (props: MakeProps): TerraObject => Obj.make(TerraObject, props);

/** The medium a kind travels through, which selects its passability rule when routing. */
export const domainFor = (kind: Kind): Domain => {
  switch (kind) {
    case 'boat':
      return 'sea';
    case 'tank':
      return 'land';
    case 'plane':
    case 'rocket':
    case 'satellite':
      return 'air';
  }
};
