import { DocHandle } from "@automerge/automerge-repo";
import { EchoDatabase } from "../database";
import { ObjectMeta, TypedObjectOptions, TypedObjectProperties, base, db, debug, subscribe } from "../object";
import { AbstractEchoObject } from "../object/object";
import { dxos } from "../proto/gen/schema";
import { next as automerge, Doc,  } from "@automerge/automerge";
import { AutomergeDb } from "./automerge-db";
import { PublicKey } from "@dxos/keys";
import { raise } from "@dxos/debug";
import { failedInvariant, invariant } from "@dxos/invariant";

export type BindOptions = {
  db: AutomergeDb;
  docHandle: DocHandle<any>;
  path: string[];
}

export class AutomergeObject implements TypedObjectProperties {
  private _db?: AutomergeDb;
  private _doc?: Doc<any>;
  private _docHandle?: DocHandle<any>;
  private _path: string[] = [];

  constructor (initialProps?: unknown, opts?: TypedObjectOptions) {
    this._initNewObject(initialProps, opts);
   
    return this._createProxy([]);
  }

  get __typename(): string | undefined {
    return undefined;
  }

  get __schema(): dxos.schema.Schema | undefined {
    return undefined;
  }

  get __meta(): ObjectMeta | undefined {
    return this._createProxy(['meta']);
  }

  get __deleted(): boolean {
    return this._getDoc().deleted;
  }
  toJSON() {
    return JSON.stringify(this._getDoc());
  }
  get id(): string {
    return this._docHandle?.documentId ?? PublicKey.random().toHex(); // TODO(dmaretskyi): fix random ids.
  }
  get [base](): AbstractEchoObject<any> {
    return this as any;
  }

  get [db](): EchoDatabase | undefined {
    return undefined;
  }

  get [debug](): string {
    return 'automerge'
  }

  [subscribe](callback: (value: any) => void): () => void {
    this._docHandle?.on('change', callback);
    return () => this._docHandle?.off('change', callback);
  }

  private _initNewObject(initialProps?: unknown, opts?: TypedObjectOptions) {
    this._doc = automerge.from({
      // TODO(dmaretskyi): type: ???.

      // TODO(dmaretskyi): Initial values for data.
      data: this._encode(initialProps),
      meta: this._encode({
        keys: [],
        ...opts?.meta,
      }),
    })
  }

  /**
   * @internal
   */
  _bind(options: BindOptions) {
    this._db = options.db;
    this._docHandle = options.docHandle;
    this._path = options.path;

    if(this._doc) {
      this._set([], this._doc);
      this._doc = undefined;
    }
  }

  private _createProxy(path: string[]): any {
    return new Proxy(this, {
      ownKeys: () => {
        return Object.keys(this._get(path));
      },
      
      has: (_, key) => {
        return key in this._get(path);
      },

      getOwnPropertyDescriptor: (_, key) => {
        return {
          enumerable: true,
          configurable: true, // TODO(dmaretskyi): Are they really configurable?
        };
      },

      get: (_, key) => {
        return this._get([...path, key as string]);
      },

      set: (_, key, value) => {
        this._set([...path, key as string], value);
        return true;
      },
    });
  }

  private _get(path: string[]) {
    const fullPath = [...this._path, ...path];
    let value = this._doc as any;
    for(const key of fullPath) {
      value = value[key];
    }

    if(typeof value === 'object' && value !== null) { // TODO(dmaretskyi): Check for Reference types.
      return this._createProxy(path);
    }

    return this._decode(value);
  }

  private _set(path: string[], value: any) {
    const fullPath = [...this._path, ...path];
    let parent = this._doc as any;
    for(const key of fullPath.slice(0, -1)) {
      parent = parent[key];
    }
    parent[fullPath.at(-1)!] = this._encode(value);
  }

  private _encode(value: any) {
    return value;
  }

  private _decode(value: any) {
    return value;
  }

  private _getDoc(): Doc<any> {
    return this._doc ?? this._docHandle?.docSync() ?? failedInvariant();
  }
}
