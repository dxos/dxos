//
// Copyright 2024 DXOS.org
//

export const DEFAULT_INDENTATION = 8;

export const paddingIndentation = (level: number, indentation = DEFAULT_INDENTATION) => ({
  paddingInlineStart: `${(level - 1) * indentation}px`,
});
