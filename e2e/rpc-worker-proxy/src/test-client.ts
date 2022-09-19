//
// Copyright 2022 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { TestStreamService } from '@dxos/protocols/proto/dxos/testing/rpc';

const STORAGE_KEY = 'testclient';

export class TestClient {
  private _value: number;

  constructor () {
    try {
      const str = localStorage.getItem(STORAGE_KEY);
      this._value = str ? parseInt(str) : 0;
    } catch {
      this._value = 0;
    }
  }

  get value () {
    return this._value;
  }

  set value (val: number) {
    localStorage.setItem('testclient', String(val));
    this._value = val;
  }

  get handlers (): TestStreamService {
    return {
      testCall: req => new Stream(({ next, close }) => {
        if (req.data !== 'requestData') {
          close();
          return;
        }

        next({ data: String(this.value) });

        setInterval(() => {
          this.value++;
          next({ data: String(this.value) });

          if (this.value > 1000000) {
            close();
          }
        }, 10);
      })
    };
  }
}
