//
// Copyright 2024 DXOS.org
//

import { HyperFormula } from 'hyperformula';

const FUNCTIONS = Object.values(HyperFormula.languages.enGB.functions);

export const MAX_DISTANCE = Number.MAX_SAFE_INTEGER;

const EMPTY: string[] = [];

export default (query: string): string[] => {
  if (query === '') {
    return EMPTY;
  }

  query = query.toUpperCase();

  return FUNCTIONS.filter((name) => name.startsWith(query));
};
