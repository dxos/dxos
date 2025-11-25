//
// Copyright 2025 DXOS.org
//

import { type AnyEchoObject, type AnyProperties, type EntityKind } from './internal';
import type * as Type from './Type';

// NOTE: Relation does not extend Obj so that, for example, we can prevent Relations from being used as source and target objects.
//  However, we generally refer to Obj and Relation instances as "objects",
//  and many API methods accept both Obj.Any and Relation.Any (i.e., Entity.Any) instances.

/**
 * Obj or Relation.
 */
export type Entity<T extends AnyProperties> = {
  readonly [Type.KindId]: EntityKind;
} & AnyEchoObject &
  T;

/**
 * Any Obj or Relation.
 */
export interface Any extends AnyEchoObject {
  readonly [Type.KindId]: EntityKind;
}
