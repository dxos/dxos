//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';

const _MapSchema = S.struct({
  title: S.string,
}).pipe(E.echoObject('braneframe.Map', '0.1.0'));
export interface MapType extends E.ObjectType<typeof _MapSchema> {}
export const MapSchema: S.Schema<MapType> = _MapSchema;
