import { Context } from '@dxos/context';
import {
  DIAGNOSTICS_TIMEOUT,
  DiagnosticMetadata,
  DiagnosticsData,
  DiagnosticsManager,
  DiagnosticsRequest,
} from './diagnostic';
import { Trigger, sleep } from '@dxos/async';
import { createId } from './util';

const DEFAULT_CHANNEL_NAME = 'dxos-diagnostics';

const DISCOVER_TIME = 500;

export type DiagnosticChannelMessage =
  | {
      type: 'DIAGNOSTICS_DISCOVER';
    }
  | {
      type: 'DIAGNOSTICS_ANNOUNCE';
      diagnostics: DiagnosticMetadata[];
    }
  | {
      type: 'DIAGNOSTICS_FETCH';
      requestId: string;
      request: DiagnosticsRequest;
    }
  | {
      type: 'DIAGNOSTICS_RESPONSE';
      requestId: string;
      data: DiagnosticsData;
    };

export class DiagnosticsChannel {
  private _ctx = new Context();

  private readonly _channel: BroadcastChannel;

  constructor(private readonly _channelName: string = DEFAULT_CHANNEL_NAME) {
    this._channel = new BroadcastChannel(_channelName);
  }

  destroy() {
    void this._ctx.dispose();
  }

  serve(manager: DiagnosticsManager) {
    const listener = async (event: MessageEvent) => {
      switch (event.data.type) {
        case 'DIAGNOSTICS_DISCOVER': {
          const diagnostics = manager.list();
          this._channel.postMessage({ type: 'DIAGNOSTICS_ANNOUNCE', diagnostics } satisfies DiagnosticChannelMessage);
          break;
        }
        case 'DIAGNOSTICS_FETCH': {
          const { requestId, request } = event.data;
          if (request.instanceId !== manager.instanceId) {
            break;
          }

          const data = await manager.fetch(request);
          this._channel.postMessage({
            type: 'DIAGNOSTICS_RESPONSE',
            requestId,
            data,
          } satisfies DiagnosticChannelMessage);
          break;
        }
      }
    };

    this._channel.addEventListener('message', listener);
    this._ctx.onDispose(() => this._channel.removeEventListener('message', listener));
  }

  async discover(): Promise<DiagnosticMetadata[]> {
    const diagnostics: DiagnosticMetadata[] = [];

    const collector = (event: MessageEvent) => {
      const data = event.data as DiagnosticChannelMessage;
      switch (data.type) {
        case 'DIAGNOSTICS_ANNOUNCE':
          diagnostics.push(...data.diagnostics);
          break;
      }
    };

    try {
      this._channel.addEventListener('message', collector);
      this._channel.postMessage({ type: 'DIAGNOSTICS_DISCOVER' } satisfies DiagnosticChannelMessage);

      await sleep(DISCOVER_TIME);

      // Dedup.
      const result: DiagnosticMetadata[] = [];
      for (const diagnostic of diagnostics) {
        if (!result.some((d) => d.id === diagnostic.id && d.instanceId === diagnostic.instanceId)) {
          result.push(diagnostic);
        }
      }

      return diagnostics;
    } finally {
      this._channel.removeEventListener('message', collector);
    }
  }

  async fetch(request: DiagnosticsRequest): Promise<DiagnosticsData> {
    const requestId = createId();

    const trigger = new Trigger<DiagnosticsData>();
    const listener = (event: MessageEvent) => {
      const data = event.data as DiagnosticChannelMessage;
      if (data.type === 'DIAGNOSTICS_RESPONSE' && data.requestId === requestId) {
        trigger.wake(data.data);
      }
    };

    try {
      this._channel.addEventListener('message', listener);
      this._channel.postMessage({ type: 'DIAGNOSTICS_FETCH', requestId, request } satisfies DiagnosticChannelMessage);

      // NOTE: Must have await keyword in this block.
      const result = await trigger.wait({ timeout: DIAGNOSTICS_TIMEOUT });

      return result;
    } finally {
      this._channel.removeEventListener('message', listener);
    }
  }
}
