//
// Copyright 2024 DXOS.org
//

import type { inspect, InspectOptionsStylized } from 'node:util';

import { inspectCustom } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import type { SpaceId } from './space-id';

/**
 * DXN unambiguously names a resource like an ECHO object, schema definition, plugin, etc.
 * Each DXN starts with a dx prefix, followed by a resource kind.
 * Colon Symbol : is used a delimiter between parts.
 * DXNs may contain slashes.
 * '@' in the place of the space id is used to denote that the DXN should be resolved in the local space.
 *
 * @example
 *
 * ```
 * dx:echo:<space key>:<echo id>
 * dx:echo:BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE:01J00J9B45YHYSGZQTQMSKMGJ6
 * dx:echo:@:01J00J9B45YHYSGZQTQMSKMGJ6
 * dx:type:dxos.org/type/Calendar
 * dx:plugin:dxos.org/agent/plugin/functions
 * ```
 */
export class DXN {
  /**
   * Kind constants.
   */
  static kind = Object.freeze({
    /**
     * dxn:type:<type name>[:<version>]
     */
    TYPE: 'type',
    /**
     * dxn:echo:<space id>:<echo id>
     * dxn:echo:@:<echo id>
     */
    ECHO: 'echo',
    /**
     * dxn:queue:<subspace tag>:<space id>:<queue id>[:object id]
     * dxn:queue:data:BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE:01J00J9B45YHYSGZQTQMSKMGJ6
     * dxn:queue:trace:BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE:01J00J9B45YHYSGZQTQMSKMGJ6
     */
    QUEUE: 'queue',
  });

  static equals(a: DXN, b: DXN) {
    return a.kind === b.kind && a.parts.length === b.parts.length && a.parts.every((part, i) => part === b.parts[i]);
  }

  static isDXNString(dxn: string) {
    return dxn.startsWith('dxn:');
  }

  static parse(dxn: string): DXN {
    if (typeof dxn !== 'string') {
      throw new Error(`Invalid DXN: ${dxn}`);
    }
    const [prefix, kind, ...parts] = dxn.split(':');
    if (!(prefix === 'dxn')) {
      throw new Error(`Invalid DXN: ${dxn}`);
    }
    if (!(typeof kind === 'string' && kind.length > 0)) {
      throw new Error(`Invalid DXN: ${dxn}`);
    }
    if (!(parts.length > 0)) {
      throw new Error(`Invalid DXN: ${dxn}`);
    }

    return new DXN(kind, parts);
  }

  /**
   * @example `dxn:type:example.com/type/Contact`
   */
  static fromTypename(type: string) {
    return new DXN(DXN.kind.TYPE, [type]);
  }

  /**
   * @example `dxn:type:example.com/type/Contact:0.1.0`
   */
  // TODO(dmaretskyi): Consider using @ as the version separator.
  static fromTypenameAndVersion(type: string, version: string) {
    return new DXN(DXN.kind.TYPE, [type, version]);
  }

  /**
   * @example `dxn:echo:@:01J00J9B45YHYSGZQTQMSKMGJ6`
   */
  static fromLocalObjectId(id: string) {
    return new DXN(DXN.kind.ECHO, [LOCAL_SPACE_TAG, id]);
  }

  #kind: string;
  #parts: string[];

  constructor(kind: string, parts: string[]) {
    invariant(parts.length > 0);
    invariant(parts.every((part) => typeof part === 'string' && part.length > 0 && part.indexOf(':') === -1));

    // Per-type validation.
    switch (kind) {
      case DXN.kind.TYPE:
        if (parts.length > 2) {
          throw new Error('Invalid "type" DXN');
        }
        break;
      case DXN.kind.ECHO:
        if (parts.length !== 2) {
          throw new Error('Invalid "echo" DXN');
        }
        break;
    }

    this.#kind = kind;
    this.#parts = parts;
  }

  get kind() {
    return this.#kind;
  }

  get parts() {
    return this.#parts;
  }

  toTypename() {
    invariant(this.#kind === DXN.kind.TYPE);
    return this.#parts[0];
  }

  hasTypenameOf(typename: string) {
    return this.#kind === DXN.kind.TYPE && this.#parts.length === 1 && this.#parts[0] === typename;
  }

  asTypeDXN(): DXN.TypeDXN | undefined {
    if (this.kind !== DXN.kind.TYPE) {
      return undefined;
    }

    const [type, version] = this.#parts;
    return {
      type,
      version: version as string | undefined,
    };
  }

  asEchoDXN(): DXN.EchoDXN | undefined {
    if (this.kind !== DXN.kind.ECHO) {
      return undefined;
    }

    const [spaceId, echoId] = this.#parts;
    return {
      spaceId: spaceId as SpaceId | undefined,
      echoId,
    };
  }

  asQueueDXN(): DXN.QueueDXN | undefined {
    if (this.kind !== DXN.kind.QUEUE) {
      return undefined;
    }

    const [subspaceTag, spaceId, queueId, objectId] = this.#parts;
    if (typeof queueId !== 'string') {
      return undefined;
    }
    return {
      subspaceTag,
      spaceId: spaceId as SpaceId,
      queueId,
      objectId: objectId as string | undefined,
    };
  }

  isLocalObjectId() {
    return this.#kind === DXN.kind.ECHO && this.#parts[0] === LOCAL_SPACE_TAG && this.#parts.length === 2;
  }

  toString() {
    return `dxn:${this.#kind}:${this.#parts.join(':')}`;
  }

  /**
   * Used by Node.js to get textual representation of this object when it's printed with a `console.log` statement.
   */
  [inspectCustom](depth: number, options: InspectOptionsStylized, inspectFn: typeof inspect) {
    const printControlCode = (code: number) => {
      return `\x1b[${code}m`;
    };

    return (
      printControlCode(inspectFn.colors.blueBright![0]) + this.toString() + printControlCode(inspectFn.colors.reset![0])
    );
  }
}

export declare namespace DXN {
  export type TypeDXN = {
    type: string;
    version?: string;
  };

  export type EchoDXN = {
    spaceId?: SpaceId;
    echoId: string; // TODO(dmaretskyi): ObjectId.
  };

  export type QueueDXN = {
    subspaceTag: string;
    spaceId: SpaceId;
    queueId: string; // TODO(dmaretskyi): ObjectId.
    objectId?: string; // TODO(dmaretskyi): ObjectId.
  };
}

/**
 * Tags for ECHO DXNs that should resolve the object ID in the local space.
 */
export const LOCAL_SPACE_TAG = '@';

export const QueueSubspaceTags = Object.freeze({
  DATA: 'data',
  TRACE: 'trace',
});
