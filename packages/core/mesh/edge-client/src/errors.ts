//
// Copyright 2024 DXOS.org
//

export class EdgeConnectionClosedError extends Error {
  constructor() {
    super('Edge connection closed.');
  }
}

export class EdgeIdentityChangedError extends Error {
  constructor() {
    super('Edge identity changed.');
  }
}
