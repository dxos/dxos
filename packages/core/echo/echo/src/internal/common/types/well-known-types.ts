//
// Copyright 2026 DXOS.org
//

import { DXN } from '@dxos/keys';

/**
 * DXN identity of the system {@link Tag} type.
 *
 * Defined in this low-level leaf so it can be shared by the public `Tag` type (which brands the
 * schema with this DXN) and by `EntityMetaSchema.tags` (which builds a `Ref<Tag>` schema from it)
 * without either importing the other — `Tag` is top-level and `meta` is deep-internal, so a direct
 * dependency between them would form an eval-order cycle.
 */
export const TagTypeDXN = DXN.make('org.dxos.type.tag', '0.1.0');
