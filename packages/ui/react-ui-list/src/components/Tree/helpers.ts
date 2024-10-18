//
// Copyright 2024 DXOS.org
//

const DEFAULT_INDENTATION = 16;

export const paddingIndendation = (level: number, indentation = DEFAULT_INDENTATION) => ({
  paddingInlineStart: `${(level - 1) * indentation}px`,
});

export const marginIndendation = (level: number, indentation = DEFAULT_INDENTATION) => ({
  marginInlineStart: `${(level - 1) * indentation}px`,
});
