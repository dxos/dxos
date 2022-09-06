//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';

import { TestStreamService } from './proto';

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
          close();
          return;
        }

        next({ data: String(this.value) });

        setInterval(() => {
          this.value++;
          this._update.emit();
          next({ data: String(this.value) });

          if (this.value > 1000000) {
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
