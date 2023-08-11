//
// Copyright 2023 DXOS.org
//

import { ClientServicesProvider } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { LogEntry, LogLevel, QueryLogsRequest } from '@dxos/protocols/proto/dxos/client/services';
import { createBucketReducer, createGroupReducer, reduceSeries } from '@dxos/util';

/**
 * Activity monitor.
 */
export class Monitor {
  private readonly _ctx = new Context({
    onError: (err) => {
      log.catch(err);
    },
  });

  private _logs: LogEntry[] = [];

  // prettier-ignore
  constructor(
    private readonly _serviceProvider: ClientServicesProvider
  ) { }

  async open() {
    const stream = this._serviceProvider.services.LoggingService!.queryLogs({
      filters: [
        {
          level: LogLevel.TRACE,
        },
      ],
      options: QueryLogsRequest.MatchingOptions.EXPLICIT,
    });

    this._logs = [];
    stream.subscribe(
      (msg) => {
        if (msg.level === LogLevel.TRACE) {
          this._logs.push(msg);
        }
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

  getPipelineStats(bucketSize = 100) {
    return reduceSeries(
      createGroupReducer((event) => event.context?.spaceKey, createBucketReducer<LogEntry>(bucketSize)),
      this._logs.filter((event) => event.message === 'dxos.echo.data-pipeline.processed'),
    );
  }
}
