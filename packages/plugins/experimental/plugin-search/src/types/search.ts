//
// Copyright 2025 DXOS.org
//

import type { DXN } from '@dxos/keys';

export type SearchResult = {
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
  objectType?: DXN.String;

  object?: any;
};
