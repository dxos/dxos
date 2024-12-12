//
// Copyright 2023 DXOS.org
//

export class ContextDeadlineExceededError extends Error {
  constructor() {
    super('Context deadline exceeded.');
  }
}
