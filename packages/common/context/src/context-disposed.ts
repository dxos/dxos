export class ContextDisposedError extends Error {
  constructor() {
    super('Context disposed.');
  }
}