//
// Copyright 2024 DXOS.org
//

export const orderKeys = <O extends {}>(obj: O, order: (keyof O)[]): O => {
  const ordered: Partial<O> = {};
  for (const key of order) {
    if (key in obj) {
      ordered[key] = obj[key];
    }
  }
  for (const key in obj) {
    if (!(key in ordered)) {
      ordered[key] = obj[key];
    }
  }
  return ordered as O;
};
