// Empty module to stub stripped packages.
//
// Copyright 2023 DXOS.org
//

module.exports = new Proxy(
  {},
  {
    get: (target, prop) => {
      throw new Error('Package has been stripped');
    },
  },
);
