//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';

import { Obj } from '@dxos/echo';
import { Process, Trace } from '@dxos/functions';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { detachData } from './trace-buffer';

export interface ProcessTraceServiceOptions {
  /** Id of the process whose events we're tagging. */
  readonly pid: Process.ID;
  /** Parent process id (if any) — copied onto {@link Trace.Message.meta}. */
  readonly parentPid?: Process.ID;
  /** Human-readable process name for trace visualization. */
  readonly processName?: string;
  /** Additional meta copied onto every {@link Trace.Message}. */
  readonly traceMeta?: Trace.Meta;
  /** Space scope for persistence routing. */
  readonly space?: SpaceId;
  /** Shared, durable sink for non-ephemeral events. */
  readonly sink: Trace.Sink;
  /** Called for ephemeral events; typically pushed into the process handle's in-memory buffer. */
  readonly onEphemeral: (message: Trace.Message) => void;
}

/**
 * Build a per-process {@link Trace.TraceService} implementation that:
 *
 * - Packages each raw event into a {@link Trace.Message} with process/space meta.
 * - Detaches ECHO proxies from the event payload before embedding them as
 *   `Schema.Unknown` data (see {@link detachData}).
 * - Streams ephemeral events to `onEphemeral` (never persisted).
 * - Forwards non-ephemeral events to the shared durable sink.
 * - Swallows and logs write errors so a single bad event cannot kill the process.
 */
export const createProcessTraceService = (
  opts: ProcessTraceServiceOptions,
): Context.Tag.Service<typeof Trace.TraceService> => ({
  write: (event, data) => {
    try {
      // TODO(dmaretskyi): Batching.
      // Detach `data` from any ECHO proxy state — nested reactive
      // objects would otherwise cause `Obj.make` to fail when it
      // recurses through the Schema.Unknown event payload and tries
      // to re-attach schema metadata to non-configurable proxies.
      const detachedData = detachData(data);
      const message = Obj.make(Trace.Message, {
        meta: {
          ...(opts.traceMeta ?? {}),
          pid: opts.pid,
          parentPid: opts.parentPid,
          processName: opts.processName,
          space: opts.space ?? opts.traceMeta?.space,
        },
        isEphemeral: event.isEphemeral,
        events: [
          {
            type: event.key,
            timestamp: Date.now(),
            data: detachedData,
          },
        ],
      });
      // Ephemeral events are streamed live to subscribers and never
      // persisted; non-ephemeral events are forwarded to the shared
      // trace sink (feed persistence, devtools, etc.).
      if (message.isEphemeral) {
        opts.onEphemeral(message);
      } else {
        opts.sink.write(message);
      }
    } catch (err) {
      log.warn('trace write failed', { pid: opts.pid, event: event.key, err });
    }
  },
});
