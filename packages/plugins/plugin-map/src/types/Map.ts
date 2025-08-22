//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Obj, Type } from '@dxos/echo';
import { type MakeProps } from '@dxos/echo/Obj';
import { LabelAnnotation, ViewAnnotation } from '@dxos/echo-schema';
import { type CreateViewFromSpaceProps, createViewFromSpace } from '@dxos/schema';

export const Map = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(burdon): Should be part of view.
  locationFieldId: Schema.optional(Schema.String),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Map',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
);

export type Map = Schema.Schema.Type<typeof Map>;

export const makeMap = (props: MakeProps<typeof Map> = {}) => Obj.make(Map, props);

type CreateMapProps = Omit<CreateViewFromSpaceProps, 'presentation'> & {
  locationFieldId: string;
};

/**
 * @param param0 @deprecated
 */
// TODO(burdon): Reconcile type with view.
export const createMapView = async ({ locationFieldId, ...props }: CreateMapProps) => {
  const map = Obj.make(Map, { locationFieldId });
  const { jsonSchema, view } = await createViewFromSpace({ ...props, presentation: map });
  return { jsonSchema, view };
};
