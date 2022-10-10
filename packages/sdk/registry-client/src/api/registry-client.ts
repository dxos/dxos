//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';
import protobuf from 'protobufjs';

import { decodeProtobuf, encodeProtobuf } from '@dxos/codec-protobuf';
import { raise } from '@dxos/debug';
// eslint-disable-next-line no-restricted-imports
import { Record as RawRecord } from '@dxos/protocols/dist/src/proto/gen/dxos/registry.js'; // Hack until we can set "moduleResolution": "nodenext" in tsconfig.json.
import { ComplexMap, isNotNullOrUndefined } from '@dxos/util';

import {
  RecordExtension,
  decodeExtensionPayload,
  encodeExtensionPayload,
  sanitizeExtensionData
} from '../encoding/index.js';
import { AccountKey } from './account-key.js';
import { CID } from './cid.js';
import { DomainKey } from './domain-key.js';
import { DXN } from './dxn.js';
import { Filtering, Filter } from './filtering.js';
import { Authority, RegistryClientBackend } from './registry.js';

export type ResourceSet = {
  name: DXN
  tags: Record<string, CID>
}

export type RegistryRecord<T = any> = Omit<RawRecord, 'payload' | 'type'> & {
  cid: CID
  payload: RecordExtension<T>
}

export type RegistryType = Omit<RawRecord, 'payload' | 'type'> & {
  cid: CID
  type: {
    /**
     * FQN of the root message in the protobuf definitions.
     * NOTE: Should not be used to name this type.
     */
    messageName: string
    protobufDefs: protobuf.Root
    /**
     * Source of the type definition.
     */
    protobufIpfsCid?: CID
  }
}

/**
 * Record metadata provided by the user.
 */
export interface RecordMetadata {
  displayName?: string
  description?: string
  tags?: string[]
}

export interface TypeRecordMetadata extends RecordMetadata {
  protobufIpfsCid?: string
}

/**
 * Main API for DXNS registry.
 */
export class RegistryClient {
  private readonly _recordCache = new ComplexMap<CID, Promise<RegistryRecord | undefined>>(cid => cid.toB58String());
  private readonly _typeCache = new ComplexMap<CID, Promise<RegistryType | undefined>>(cid => cid.toB58String());

  constructor (
    private readonly _backend: RegistryClientBackend
  ) {}

  //
  // Domains
  //

  /**
   * Resolves a domain key from the domain name.
   * @param domainName Name of the domain.
   */
  async getDomainKey (domainName: string): Promise<DomainKey> {
    return this._backend.getDomainKey(domainName);
  }

  /**
   * Returns a list of authorities created in DXOS system.
   */
  async listAuthorities (): Promise<Authority[]> {
    return this._backend.listAuthorities();
  }

  /**
   * Creates a new domain in the system under a generated name.
   * @param account DXNS account that will own the domain.
   */
  async registerAuthority (account: AccountKey): Promise<DomainKey> {
    return this._backend.registerAuthority(account);
  }

  //
  // Resources
  //

  /**
   * Gets resource by its registered name.
   * @param name DXN of the resource used for registration.
   */
  async getResource (name: DXN): Promise<CID | undefined> {
    name = name.tag ? name : name.with({ tag: 'latest' });
    return this._backend.getResource(name);
  }

  /**
   * List resources registered in the system.
   * @param filter Filter that each returned record must meet.
   */
  async listResources (filter?: Filter): Promise<ResourceSet[]> {
    const resources = await this._backend.listResources();

    return resources
      .filter(([name]) => Filtering.matchResource(name, filter))
      .reduce((result, [name, cid]) => {
        if (!name.tag) {
          return result;
        }

        const index = result.findIndex(set => set.name.authority === name.authority && set.name.path === name.path);
        const set = result[index] ?? { name: name.with({ tag: null }), tags: {} };
        set.tags[name.tag] = cid;

        if (index === -1) {
          result.push(set);
        } else {
          result[index] = set;
        }

        return result;
      }, new Array<ResourceSet>());
  }

  /**
   * Registers or updates a resource in the system.
   * Undefined CID means that the resource will be deleted.
   * @param name Identifies the domain and name of the resource.
   * @param tag Tag for the resource.
   * @param cid CID of the record to be referenced with the given name.
   * @param owner DXNS account that will own the resource.
   */
  async registerResource (
    name: DXN,
    cid: CID | undefined,
    owner: AccountKey
  ): Promise<void> {
    return this._backend.registerResource(name, cid, owner);
  }

  //
  // Records
  //

  /**
   * Gets record details by CID.
   * @param cid CID of the record.
   */
  async getRecord<T> (cid: CID): Promise<RegistryRecord<T> | undefined> {
    if (this._recordCache.has(cid)) {
      return this._recordCache.get(cid);
    }

    const recordPromise = this._fetchRecord(cid);
    this._recordCache.set(cid, recordPromise);

    return recordPromise;
  }

  /**
   * Gets resource by its registered name.
   * @param name DXN of the resource used for registration.
   */
  async getRecordByName<T> (name: DXN): Promise<RegistryRecord<T> | undefined> {
    const cid = await this.getResource(name);
    if (!cid) {
      return undefined;
    }

    const record = await this.getRecord<T>(cid);
    return record;
  }

  /**
   * Lists records in the system.
   * @param filter Filter that each returned record must meet.
   */
  async listRecords (filter?: Filter): Promise<RegistryRecord[]> {
    const rawRecords = await this._backend.listRecords();
    const records = await Promise.all(rawRecords.map(({ cid, ...record }) =>
      this._decodeRecord(cid, record)
    ));

    return records
      .filter(isNotNullOrUndefined)
      .filter(record => Filtering.matchRecord(record, filter));
  }

  /**
   * Creates a new data record in the system.
   * @param data Payload data of the record.
   * @param typeId CID of the type record that holds the schema of the data.
   * @param meta Record metadata information.
   */
  async registerRecord (data: unknown, typeId: CID, meta: RecordMetadata = {}): Promise<CID> {
    const type = await this.getTypeRecord(typeId);
    assert(type);

    const record = {
      ...meta,
      created: new Date(),
      payload: await encodeExtensionPayload(sanitizeExtensionData(data, CID.from(typeId)),
        async cid => (await this.getTypeRecord(cid)) ?? raise(new Error(`Type not found: ${cid}`)))
    };

    return this._backend.registerRecord(record);
  }

  /**
   * Gets type records details by CID.
   * @param cid CID of the record.
   */
  async getTypeRecord (cid: CID): Promise<RegistryType | undefined> {
    if (this._typeCache.has(cid)) {
      return this._typeCache.get(cid);
    }

    const typePromise = this._fetchType(cid);
    this._typeCache.set(cid, typePromise);

    return typePromise;
  }

  /**
   * Lists type records in the system.
   * @param filter Filter that each returned record must meet.
   */
  async listTypeRecords (filter?: Filter): Promise<RegistryType[]> {
    const records = await this._backend.listRecords();

    const types = records
      .filter(record => !!record.type)
      .map(({ cid, ...record }) => this._decodeType(cid, record));

    return types;
  }

  /**
   * Creates a new type record in the system.
   * @param schema Protobuf schema of the type.
   * @param messageFqn Fully qualified name of the message. It must reside in the schema definition.
   * @param meta Record metadata information.
   */
  async registerTypeRecord (messageName: string, schema: protobuf.Root, meta: TypeRecordMetadata = {}) {
    // Make sure message type exists.
    schema.lookupType(messageName);

    const record = {
      ...meta,
      created: new Date(),
      type: {
        messageName,
        protobufDefs: encodeProtobuf(schema),
        protobufIpfsCid: meta.protobufIpfsCid
      }
    };

    return this._backend.registerRecord(record);
  }

  private async _fetchRecord (cid: CID): Promise<RegistryRecord | undefined> {
    const rawRecord = await this._backend.getRecord(cid);
    const record = rawRecord && (await this._decodeRecord(cid, rawRecord));
    return record;
  }

  private async _decodeRecord (cid: CID, rawRecord: RawRecord): Promise<RegistryRecord | undefined> {
    if (!rawRecord.payload) {
      return undefined;
    }

    const payload = await decodeExtensionPayload(rawRecord.payload, async (cid: CID) =>
      (await this.getTypeRecord(cid)) ?? raise(new Error(`Type not found: ${cid}`))
    );

    return {
      ...rawRecord,
      cid,
      payload
    };
  }

  private async _fetchType (cid: CID): Promise<RegistryType | undefined> {
    const record = await this._backend.getRecord(cid);
    if (!record) {
      return undefined;
    }

    return this._decodeType(cid, record);
  }

  private _decodeType (cid: CID, rawRecord: RawRecord): RegistryType {
    if (!rawRecord.type) {
      throw new Error('Invalid type');
    }

    const { messageName, protobufDefs, protobufIpfsCid } = rawRecord.type;
    assert(messageName);
    assert(protobufDefs);

    return {
      ...rawRecord,
      cid,
      type: {
        messageName,
        protobufDefs: decodeProtobuf(protobufDefs),
        protobufIpfsCid: protobufIpfsCid ? CID.from(protobufIpfsCid) : undefined
      }
    };
  }
}
