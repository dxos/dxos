//
// Copyright 2022 DXOS.org
//

export const setup = () => {
  process.on('unhandledRejection', error => {
    throw error;
  });
};
