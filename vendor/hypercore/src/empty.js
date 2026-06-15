//
// Copyright 2023 DXOS.org
//

// Empty module to stub packages that we know won't be used at runtime and can be replaces with a mock like this.
module.exports = new Proxy(
  {},
  {
    get: (target, prop) => {
      throw new Error('Package has been stripped');
    },
  },
);
