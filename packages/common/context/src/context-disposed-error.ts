//
// Copyright 2023 DXOS.org
//

export class ContextDisposedError extends Error {
  constructor() {
    super('Context disposed.');
  }
}
