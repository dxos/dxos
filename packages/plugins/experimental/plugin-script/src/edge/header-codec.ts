//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Factor out from @dxos/hub-protocol

const ENCODING = 'base64';

export type EncodedKey = { __k: string };

export type EncodedBytes = { __b: string };

export type EncodedTimestamp = { __t: number };

export interface KeyCodec<KeyType> {
  isKey(value: any): value is KeyType;
  encode(key: KeyType): EncodedKey;
  decode(value: EncodedKey): KeyType;
}

// TODO(wittjosiah): Use deepMapValues from @dxos/util -- it handles recursion for you.
export class HeaderCodec<Key> {
  constructor(private readonly _keyCodec: KeyCodec<Key>) {}

  encode(obj: any): string {
    const objectToEncode = this._prepareForEncoding(obj);
    const encoded = Buffer.from(JSON.stringify(objectToEncode));
    return encoded.toString(ENCODING);
  }

  decode<Type>(buffer: string): Type {
    const json = JSON.parse(Buffer.from(buffer, ENCODING).toString());
    return this._decodeRecursive(json);
  }

  private _decodeRecursive(obj: any): any {
    return this._recurse(obj, (value) => {
      if (isEncodedBytes(value)) {
        return decodeBytes(value.__b);
      }
      if (isEncodedKey(value)) {
        return this._keyCodec.decode(value);
      }
      if (isEncodedDate(value)) {
        return decodeDate(value);
      }
      return null;
    });
  }

  private _prepareForEncoding(obj: any): any {
    return this._recurse(obj, (value) => {
      if (value instanceof Uint8Array) {
        return { __b: encodeBytes(value) };
      }
      if (this._keyCodec.isKey(value)) {
        return this._keyCodec.encode(value);
      }
      if (value instanceof Date) {
        return encodeDate(value);
      }
      return null;
    });
  }

  private _recurse(obj: any, handler: (obj: object) => any | null): any {
    if (typeof obj !== 'object') {
      return obj;
    }
    const handled = handler(obj);
    if (handled != null) {
      return handled;
    }
    if (Array.isArray(obj)) {
      const result = [];
      for (const elem of obj) {
        result.push(this._recurse(elem, handler));
      }
      return result;
    }
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this._recurse(value, handler);
    }
    return result;
  }
}

const isEncodedKey = (obj: object): obj is EncodedKey => '__k' in obj && typeof obj.__k === 'string';
const isEncodedBytes = (obj: object): obj is EncodedBytes => '__b' in obj && typeof obj.__b === 'string';
const isEncodedDate = (obj: object): obj is EncodedTimestamp => '__t' in obj && typeof obj.__t === 'number';

const encodeDate = (date: Date) => ({ __t: date.getTime() });
const decodeDate = (timestamp: EncodedTimestamp) => new Date(timestamp.__t);

const encodeBytes = (bytes: Uint8Array) => Buffer.from(bytes).toString(ENCODING);
const decodeBytes = (bytes: string) => Buffer.from(bytes, ENCODING);
