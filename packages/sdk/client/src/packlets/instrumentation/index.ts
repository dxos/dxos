//
// Copyright 2023 DXOS.org
//

import { ClientServicesProvider } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { DataPipelineProcessed } from '@dxos/protocols';
import { LogEntry, LogLevel, QueryLogsRequest } from '@dxos/protocols/proto/dxos/client/services';
import { entry } from '@dxos/util';

type State = {
  processed: number;
  throughput: {
    begin: number;
    end: number;
    processed: number;
  }[];
};

export class Instrumentation {
  private readonly _ctx = new Context({
    onError: (err) => {
      log.catch(err);
    },
  });

  private _state = new Map<string, State>();

  constructor(private readonly _serviceProvider: ClientServicesProvider) {}

  get state(): Record<string, State> {
    return Object.fromEntries(this._state.entries());
  }

  async open() {
    const stream = this._serviceProvider.services.LoggingService!.queryLogs({
      filters: [
        {
          level: LogLevel.TRACE,
        },
      ],
      options: QueryLogsRequest.MatchingOptions.EXPLICIT,
    });

    stream.subscribe(
      (msg) => {
        this._update(msg);
      },
      (err) => {
        if (err) {
          this._ctx.raise(err);
        }
      },
    );

    this._ctx.onDispose(() => stream.close());
  }

  async close() {
    await this._ctx.dispose();
  }

  private _update(event: LogEntry) {
    if (event.level !== LogLevel.TRACE) {
      return;
    }

    switch (event.message) {
      case 'dxos.echo.data-pipeline.processed':
        {
          const { spaceKey } = event.context! as DataPipelineProcessed;
          const state = entry(this._state, spaceKey).orInsert({ processed: 0, throughput: [] }).value;

          state.processed++;
          if (state.throughput.length === 0) {
            state.throughput.push({ begin: Date.now(), end: 0, processed: 0 });
          }

          let last = state.throughput[state.throughput.length - 1];
          if (Date.now() - last.begin > 5_000) {
            last.end = Date.now();
            last = { begin: last.end, end: 0, processed: 0 };
            state.throughput.push(last);
          }

          last.processed++;
        }
        break;
    }
  }
}
