//
// Copyright 2026 DXOS.org
//

import { type Ref } from '@dxos/echo';

/** Whether `ref` points at the object with `id`; a ref's URI may omit the space a live object's URI carries. */
export const refersTo = (ref: Ref.Ref<unknown> | undefined, id: string): boolean => !!ref?.uri.endsWith(`/${id}`);
