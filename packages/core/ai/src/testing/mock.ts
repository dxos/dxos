//
// Copyright 2025 DXOS.org
//

import { type Signal, signal } from '@preact/signals-core';

import { createReplaySSEStream } from './test-stream';
import { createGenerationStream, type GenerationStream, type AiServiceClient, GenerationStreamImpl } from '../service';
import { type GenerationStreamEvent, type GenerateRequest, type GenerateResponse } from '../types';

export type SpyAiServiceMode = 'mock' | 'spy';

export class SpyAiService implements AiServiceClient {
  // TODO(wittjosiah): Factor out signal to higher level?
  private _mode: Signal<SpyAiServiceMode> = signal('spy');
  private _events: GenerationStreamEvent[] = [];

  constructor(private readonly _service: AiServiceClient) {}

  /** @reactive */
  get mode() {
    return this._mode.value;
  }

  get events() {
    return this._events;
  }

  setMode(mode: SpyAiServiceMode): void {
    this._mode.value = mode;
  }

  setEvents(events: GenerationStreamEvent[]): void {
    this._events = events;
  }

  /**
   * Save events to file.
   */
  async saveEvents(): Promise<void> {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: 'events.json',
      types: [
        {
          description: 'JSON',
          accept: { 'application/json': ['.json'] },
        },
      ],
    });
    const writableStream = await fileHandle.createWritable();
    await writableStream.write(JSON.stringify(this._events));
    await writableStream.close();
  }

  /**
   * Load events from file.
   */
  async loadEvents(): Promise<void> {
    const [fileHandle] = await window.showOpenFilePicker();
    const file = await fileHandle.getFile();
    const events = JSON.parse(await file.text());
    this._events = events;
  }

  /**
   * Generate non-streaming response.
   */
  async exec(request: GenerateRequest): Promise<GenerateResponse> {
    throw new Error('Not implemented');
  }

  /**
   * Process request and open message stream.
   */
  async execStream(request: GenerateRequest): Promise<GenerationStream> {
    switch (this._mode.peek()) {
      case 'mock': {
        return createGenerationStream(new Response(createReplaySSEStream(this._events)));
      }
      case 'spy': {
        const stream = await this._service.execStream(request);
        const iterator = async function* (this: SpyAiService) {
          for await (const item of stream) {
            this._events.push(item);
            yield item;
          }
        }.bind(this);

        const controller = new AbortController();
        controller.signal.onabort = () => {
          stream.abort();
        };

        return new GenerationStreamImpl(controller, iterator);
      }
    }
  }
}
