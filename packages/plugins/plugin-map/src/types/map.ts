//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Obj, Type } from '@dxos/echo';
import { createViewFromSpace, type CreateViewFromSpaceProps } from '@dxos/schema';

export const MapView = Schema.Struct({
  locationFieldId: Schema.String,
}).pipe(Type.Obj({ typename: 'dxos.org/type/MapView', version: '0.1.0' }));
export type MapView = Schema.Schema.Type<typeof MapView>;

type CreateMapProps = Omit<CreateViewFromSpaceProps, 'presentation'> & {
  locationFieldId: string;
};

export const createMap = async ({ locationFieldId, ...props }: CreateMapProps) => {
  const map = Obj.make(MapView, { locationFieldId });
  const { jsonSchema, view } = await createViewFromSpace({ ...props, presentation: map });
  return { jsonSchema, view };
};
