//
// Copyright 2025 DXOS.org
//

import { type ObjectJSON, objectToJSON } from './internal';
import type * as Obj from './Obj';
import type * as Relation from './Relation';

// TODO(burdon): Move Obj | Relation agnostic methods here; export to Obj/Relation.

/**
 * Base type for Obj and Relation.
 */
export type Any = Obj.Any | Relation.Any;

/**
 * JSON representation of an object.
 */
export type JSON = ObjectJSON;

/**
 * Converts entity to its JSON representation.
 */
export const toJSON = (obj: Any): JSON => objectToJSON(obj);
