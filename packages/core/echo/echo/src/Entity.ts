//
// Copyright 2025 DXOS.org
//

import type * as Obj from './Obj';
import type * as Relation from './Relation';

/**
 * NOTE: Relation does not extend Obj so that, for example, we can prevent Relations from being used as source and target objects.
 * However, we generally refer to Obj and Relation instances as "objects",
 * and many API methods accept both Obj.Any and Relation.Any (i.e., Entity.Any) instances.
 */
export type Any = Obj.Any | Relation.Any;
