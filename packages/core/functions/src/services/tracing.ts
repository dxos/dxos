//
// Copyright 2025 DXOS.org
//

import { Context } from 'effect';

import type { AnyEchoObject } from '@dxos/echo-schema';

export class TracingService extends Context.Tag('TracingService')<
  TracingService,
  {
    /**
     * Write an event to the tracing queue.
     * @param event - The event to write. Must be an a typed object.
     */
    write(event: AnyEchoObject): void;
  }
>() {
  static noop: Context.Tag.Service<TracingService> = { write: () => {} };

  static console: Context.Tag.Service<TracingService> = { write: (event) => console.log(event) };
}
