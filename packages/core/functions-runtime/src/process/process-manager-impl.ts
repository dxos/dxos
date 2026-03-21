import { Process } from './Process';

export class ProcessManagerImpl implements Process.Manager {
  constructor(private readonly _executable: Process.Executable) {}

  spawn<I, O>(factory: Process.Executable<I, O>): Effect.Effect<Process.Handle<I, O>> {
    return this._executable.run(factory);
  }
}