//
// Copyright 2024 DXOS.org
//

export const wnfsUrl = (filePath: string[]) => {
  return 'wnfs://' + filePath.map((f) => encodeURIComponent(f)).join('/');
};
