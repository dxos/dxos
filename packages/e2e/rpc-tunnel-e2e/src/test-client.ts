//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { log } from '@dxos/log';
import { type TestStreamService } from '@dxos/protocols/proto/example/testing/rpc';

const STORAGE_KEY = 'testclient';

export class TestClient {
  private _persistent: boolean;
  private _value: number;
  private _update = new Event();

  constructor({ persistant, value }: { persistant?: boolean; value?: number } = {}) {
    this._persistent = Boolean(persistant);

    if (value) {
      this.persist(value);
      this._value = value;
      return;
    }

    const str = this._persistent && localStorage.getItem(STORAGE_KEY);
    try {
      this._value = str ? parseInt(str) : 0;
    } catch {
      this._value = 0;
    }
  }

  persist(value: number) {
    this._persistent && localStorage.setItem('testclient', String(value));
  }

  get value() {
    return this._value;
  }

  set value(value: number) {
    this.persist(value);
    this._value = value;
  }

  get handlers() {
    const TestStreamService: TestStreamService = {
      testCall: (req) =>
        new Stream(({ next, close }) => {
          if (req.data !== 'requestData') {
            log.info('Invalid request, closing...');
            close();
            return;
          }

          log.info('Opening stream...');
          next({ data: String(this.value) });

          setInterval(() => {
            this._value++;
            this._update.emit();
            next({ data: String(this.value) });
            log(`Value incremented to ${this._value}`);

            if (this._value > 1000000) {
              close();
            }
          }, 10);
        }),
    };

    return {
      TestStreamService,
    };
  }

  subscribe(callback: (value: number) => void) {
    this._update.on(() => {
      callback(this._value);
    });
  }
}
