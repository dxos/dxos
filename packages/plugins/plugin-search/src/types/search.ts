//
// Copyright 2025 DXOS.org
//

import type { Obj } from '@dxos/echo';
import type { DXN } from '@dxos/keys';

export type SearchResult<T extends Obj.Any = Obj.Any> = {
  id: string;

  /**
   * Type kind: "contact", "project", "org", etc.
   */
  type?: string;
  label?: string;
  match?: RegExp;
  snippet?: string;

  /**
   * Icon id.
   */
  icon?: string;

  /**
   * DXN of the object type.
   */
  // TODO(burdon): Different from `type` above?
  objectType?: DXN.String;
  object?: T;
};
