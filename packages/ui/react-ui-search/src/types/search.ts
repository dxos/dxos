//
// Copyright 2025 DXOS.org
//

import type { Entity } from '@dxos/echo';

export type SearchResult<T extends Entity.Unknown = Entity.Unknown> = {
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
  object?: T;
};
