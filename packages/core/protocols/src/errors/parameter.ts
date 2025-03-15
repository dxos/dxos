//
// Copyright 2024 DXOS.org
//

export const assertParameter = (parameterName: string, condition: unknown, expected?: string): asserts condition => {
  if (!condition) {
    throw new TypeError(`Parameter \`${parameterName}\` is invalid. Expected ${expected}.`);
  }
};
