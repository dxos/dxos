//
// Copyright 2024 DXOS.org
//

import { Buffer } from 'buffer/';

import { process } from './process';

(() => {
  // NOTE(Zan): When running in native context `globalThis.global` is an immutable property.
  // - Socket already polyfills it.

  // Check if `globalThis` is defined and if `global` can be assigned.
  if (typeof globalThis !== 'undefined' && !Object.getOwnPropertyDescriptor(globalThis, 'global')) {
    Object.defineProperty(globalThis, 'global', {
      value: globalThis,
      configurable: true,
      writable: false,
      enumerable: true,
    });
  }

  if (typeof globalThis !== 'undefined' && !globalThis.Buffer) {
    globalThis.Buffer = Buffer;
  }

  if (typeof globalThis !== 'undefined' && !globalThis.process) {
    globalThis.process = process;
  }
})();
