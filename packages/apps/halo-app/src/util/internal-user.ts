//
// Copyright 2022 DXOS.org
//

export const isInternalUser = () => {
  return Boolean(localStorage.getItem('isInternalUser'));
};
