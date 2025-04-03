//
// Copyright 2025 DXOS.org
//

export type SearchResult = {
  id: string;
  type?: string;
  label?: string;
  match?: RegExp;
  snippet?: string;
  object?: any;
};
