//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type LatLngLiteral } from '@dxos/react-ui-geo';

import { type MapControlType } from '../containers';
import { meta } from '../meta';

const LatLngLiteralSchema = Schema.Struct({
  lat: Schema.Number,
  lng: Schema.Number,
});

export namespace MapCapabilities {
  export const StateSchema = Schema.mutable(
    Schema.Struct({
      type: Schema.Literal('globe', 'map'),
      center: Schema.optional(LatLngLiteralSchema),
      zoom: Schema.optional(Schema.Number),
    }),
  );

  export type State = {
    type: MapControlType;
    center?: LatLngLiteral;
    zoom?: number;
  };

  export const State = Capability.make<Atom.Writable<State>>(`${meta.id}/capability/state`);
}
