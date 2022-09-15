//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';

import { TestStreamService } from './proto';

const log = debug('dxos:rpc-tunnel-e2e:test-client');

const STORAGE_KEY = 'testclient';

export class TestClient {
  private _value: number;
  private _update = new Event();

  constructor (private _persistant = false) {
    try {
      const str = this._persistant && localStorage.getItem(STORAGE_KEY);
      this._value = str ? parseInt(str) : 0;
    } catch {
      this._value = 0;
    }
  }

  get value () {
    return this._value;
  }

  set value (val: number) {
    this._persistant && localStorage.setItem('testclient', String(val));
    this._value = val;
  }

  get handlers () {
    const TestStreamService: TestStreamService = {
      testCall: req => new Stream(({ next, close }) => {
        if (req.data !== 'requestData') {
          log('Invalid request, closing...');
          close();
          return;
        }

        log('Opening stream...');
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
      })
    };

    return {
      TestStreamService
    };
  }

  subscribe (callback: (value: number) => void) {
    this._update.on(() => {
      callback(this._value);
    });
  }
}
