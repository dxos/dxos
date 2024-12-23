//
// Copyright 2024 DXOS.org
//

import { PropertyMeta } from './annotations';

/**
 * Marker interface for object with an `id`.
 */
export interface HasId {
  readonly id: string;
}

/**
 * @internal
 */
export const FIELD_PATH_ANNOTATION = 'path';

/**
 * Sets the path for the field.
 * @param path Data source path in the json path format. This is the field path in the source object.
 */
// TODO(burdon): Field, vs. path vs. property.
export const FieldPath = (path: string) => PropertyMeta(FIELD_PATH_ANNOTATION, path);

/**
 * @internal
 * Internal Effect-schema implementation detail.
 */
export const schemaVariance = {
  _A: (_: any) => _,
  _I: (_: any) => _,
  _R: (_: never) => _,
};
