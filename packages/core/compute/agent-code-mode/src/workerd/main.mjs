//
// Copyright 2026 DXOS.org
//

//
// The entrypoint of a `WorkerdSandbox` isolate, imported as text (`?raw`) and loaded beside `prelude.mjs` and the
// model's program, which the sandbox writes as `program.mjs`. The host calls `run` with the function that answers the
// facade; the program's value crosses as JSON, as the model's output would.
//

import { WorkerEntrypoint } from 'cloudflare:workers';

import { drain, install } from './prelude.mjs';
import program from './program.mjs';

export default class extends WorkerEntrypoint {
  async run(host) {
    install(host, this.env.REF_MARKER);
    try {
      const value = await program();
      await drain();
      // `undefined` crosses as itself, so a program that returned nothing is not reported as having returned `null`.
      return { _tag: 'Ok', value: value === undefined ? undefined : JSON.parse(JSON.stringify(value) ?? 'null') };
    } catch (error) {
      // Drained here too, so output the program produced before it threw still reaches the model.
      try {
        await drain();
      } catch {}
      return { _tag: 'Error', message: error && error.message ? error.message : String(error) };
    }
  }
}
