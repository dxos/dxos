//
// Copyright 2024 DXOS.org
//

import type { InspectOptionsStylized, inspect } from 'node:util';

import * as Schema from 'effect/Schema';

import { type DevtoolsFormatter, devtoolsFormatter, inspectCustom } from '@dxos/debug';
import { assertArgument, invariant } from '@dxos/invariant';

import { ObjectId } from './object-id';
import { SpaceId } from './space-id';

/**
 * Tags for ECHO DXNs that should resolve the object ID in the local space.
 */
// TODO(dmaretskyi): Rebrand this as "unknown location" to specify objects in the same space or queue. Essentially making the DXN it a URI not URL
// TODO(dmaretskyi): "@" is a separator character in the URI spec.
export const LOCAL_SPACE_TAG = '@';

export const DXN_ECHO_REGEXP = /@(dxn:[a-zA-Z0-p:@]+)/;

// TODO(burdon): Namespace for.
export const QueueSubspaceTags = Object.freeze({
  DATA: 'data',
  TRACE: 'trace',
});

export type QueueSubspaceTag = (typeof QueueSubspaceTags)[keyof typeof QueueSubspaceTags];

// TODO(burdon): Refactor.
// Consider: https://github.com/multiformats/multiaddr
// dxn:echo:[<space-id>:[<queue-id>:]]<object-id>
// dxn:echo:[S/<space-id>:[Q/<queue-id>:]]<object-id>
// dxn:type:dxos.org/markdown/Contact

/**
 * DXN unambiguously names a resource like an ECHO object, schema definition, plugin, etc.
 * Each DXN starts with a dxn prefix, followed by a resource kind.
 * Colon Symbol : is used a delimiter between parts.
 * DXNs may contain slashes.
 * '@' in the place of the space id is used to denote that the DXN should be resolved in the local space.
 *
 * @example
 * ```
 * dxn:echo:<space key>:<echo id>
 * dxn:echo:BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE:01J00J9B45YHYSGZQTQMSKMGJ6
 * dxn:echo:@:01J00J9B45YHYSGZQTQMSKMGJ6
 * dxn:type:dxos.org/type/Calendar
 * dxn:plugin:dxos.org/agent/plugin/functions
 * ```
 */
export class DXN {
  // TODO(burdon): Rename to DXN (i.e., DXN.DXN).
  // TODO(dmaretskyi): Should this be a transformation into the DXN type?
  static Schema = Schema.NonEmptyString.pipe(
    Schema.pattern(/^dxn:([^:]+):(?:[^:]+:?)+[^:]$/),
    // TODO(dmaretskyi): To set the format we need to move the annotation IDs out of the echo-schema package.
    // FormatAnnotation.set(TypeFormat.DXN),
    Schema.annotations({
      title: 'DXN',
      description: 'DXN URI',
      examples: ['dxn:type:example.com/type/MyType', 'dxn:echo:@:01J00J9B45YHYSGZQTQMSKMGJ6'],
    }),
  );

  static hash(dxn: DXN): string {
    return dxn.toString();
  }

  /**
   * Kind constants.
   */
  static kind = Object.freeze({
    /**
     * dxn:type:<type_name>[:<version>]
     */
    TYPE: 'type',

    /**
     * dxn:echo:<space_id>:<echo_id>
     * dxn:echo:@:<echo_id>
     */
    // TODO(burdon): Rename to OBJECT? (BREAKING CHANGE to update "echo").
    // TODO(burdon): Add separate Kind for space?
    ECHO: 'echo',

    /**
     * The subspace tag enables us to partition queues by usage within the context of a space.
     * dxn:queue:<subspace_tag>:<space_id>:<queue_id>[:object_id]
     * dxn:queue:data:BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE:01J00J9B45YHYSGZQTQMSKMGJ6
     * dxn:queue:trace:BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE:01J00J9B45YHYSGZQTQMSKMGJ6
     */
    QUEUE: 'queue',
  });

  /**
   * Exactly equals.
   */
  static equals(a: DXN, b: DXN): boolean {
    return a.kind === b.kind && a.parts.length === b.parts.length && a.parts.every((part, i) => part === b.parts[i]);
  }

  static equalsEchoId(a: DXN, b: DXN): boolean {
    const a1 = a.asEchoDXN();
    const b1 = b.asEchoDXN();
    return !!a1 && !!b1 && a1.echoId === b1.echoId;
  }

  // TODO(burdon): Rename isValid.
  static isDXNString(dxn: string): boolean {
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

  static tryParse(dxn: string): DXN | undefined {
    try {
      return DXN.parse(dxn);
    } catch {
      return undefined;
    }
  }

  /**
   * @example `dxn:type:example.com/type/Person`
   */
  static fromTypename(typename: string): DXN {
    return new DXN(DXN.kind.TYPE, [typename]);
  }

  /**
   * @example `dxn:type:example.com/type/Person:0.1.0`
   */
  // TODO(dmaretskyi): Consider using @ as the version separator.
  static fromTypenameAndVersion(typename: string, version: string): DXN {
    return new DXN(DXN.kind.TYPE, [typename, version]);
  }

  /**
   * @example `dxn:echo:BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE:01J00J9B45YHYSGZQTQMSKMGJ6`
   */
  static fromSpaceAndObjectId(spaceId: SpaceId, objectId: ObjectId): DXN {
    assertArgument(SpaceId.isValid(spaceId), `Invalid space ID: ${spaceId}`);
    assertArgument(ObjectId.isValid(objectId), 'objectId', `Invalid object ID: ${objectId}`);
    return new DXN(DXN.kind.ECHO, [spaceId, objectId]);
  }

  /**
   * @example `dxn:echo:@:01J00J9B45YHYSGZQTQMSKMGJ6`
   */
  static fromLocalObjectId(id: string): DXN {
    assertArgument(ObjectId.isValid(id), 'id', `Invalid object ID: ${id}`);
    return new DXN(DXN.kind.ECHO, [LOCAL_SPACE_TAG, id]);
  }

  static fromQueue(subspaceTag: QueueSubspaceTag, spaceId: SpaceId, queueId: ObjectId, objectId?: ObjectId) {
    assertArgument(SpaceId.isValid(spaceId), `Invalid space ID: ${spaceId}`);
    assertArgument(ObjectId.isValid(queueId), 'queueId', `Invalid queue ID: ${queueId}`);
    assertArgument(!objectId || ObjectId.isValid(objectId), 'objectId', `Invalid object ID: ${objectId}`);

    return new DXN(DXN.kind.QUEUE, [subspaceTag, spaceId, queueId, ...(objectId ? [objectId] : [])]);
  }

  #kind: string;
  #parts: string[];

  constructor(kind: string, parts: string[]) {
    assertArgument(parts.length > 0, 'parts', `Invalid DXN: ${parts}`);
    assertArgument(
      parts.every((part) => typeof part === 'string' && part.length > 0 && part.indexOf(':') === -1),
      'parts',
      `Invalid DXN: ${parts}`,
    );

    // Per-type validation.
    switch (kind) {
      case DXN.kind.TYPE:
        if (parts.length > 2) {
          throw new Error('Invalid DXN.kind.TYPE');
        }
        break;
      case DXN.kind.ECHO:
        if (parts.length !== 2) {
          throw new Error('Invalid DXN.kind.ECHO');
        }
        break;
    }

    this.#kind = kind;
    this.#parts = parts;
  }

  toString(): DXN.String {
    return `dxn:${this.#kind}:${this.#parts.join(':')}` as DXN.String;
  }

  toJSON(): string {
    return this.toString();
  }

  /**
   * Used by Node.js to get textual representation of this object when it's printed with a `console.log` statement.
   */
  [inspectCustom](depth: number, options: InspectOptionsStylized, inspectFn: typeof inspect): string {
    const printControlCode = (code: number) => {
      return `\x1b[${code}m`;
    };

    return (
      printControlCode(inspectFn.colors.blueBright![0]) + this.toString() + printControlCode(inspectFn.colors.reset![0])
    );
  }

  get [devtoolsFormatter](): DevtoolsFormatter {
    return {
      header: () => {
        return ['span', { style: 'font-weight: bold;' }, this.toString()];
      },
    };
  }

  get kind() {
    return this.#kind;
  }

  get parts() {
    return this.#parts;
  }

  // TODO(burdon): Should getters fail?
  get typename() {
    invariant(this.#kind === DXN.kind.TYPE);
    return this.#parts[0];
  }

  equals(other: DXN): boolean {
    return DXN.equals(this, other);
  }

  hasTypenameOf(typename: string): boolean {
    return this.#kind === DXN.kind.TYPE && this.#parts.length === 1 && this.#parts[0] === typename;
  }

  isLocalObjectId(): boolean {
    return this.#kind === DXN.kind.ECHO && this.#parts[0] === LOCAL_SPACE_TAG && this.#parts.length === 2;
  }

  asTypeDXN(): DXN.TypeDXN | undefined {
    if (this.kind !== DXN.kind.TYPE) {
      return undefined;
    }

    const [type, version] = this.#parts;
    return {
      // TODO(wittjosiah): Should be `typename` for consistency.
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
      spaceId: spaceId === LOCAL_SPACE_TAG ? undefined : (spaceId as SpaceId | undefined),
      // TODO(burdon): objectId.
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
      subspaceTag: subspaceTag as QueueSubspaceTag,
      spaceId: spaceId as SpaceId,
      queueId,
      objectId: objectId as string | undefined,
    };
  }

  /**
   * Produces a new DXN with the given parts appended.
   */
  extend(parts: string[]): DXN {
    return new DXN(this.#kind, [...this.#parts, ...parts]);
  }
}

/**
 * API namespace.
 */
export declare namespace DXN {
  /**
   * DXN represented as a javascript string.
   */
  // TODO(burdon): Use Effect branded string?
  // export const String = S.String.pipe(S.brand('DXN'));
  // export type String = S.To(typoeof String);
  export type String = string & { __DXNString: never };

  export type TypeDXN = {
    type: string;
    version?: string;
  };

  export type EchoDXN = {
    spaceId?: SpaceId;
    echoId: string; // TODO(dmaretskyi): Rename to `objectId` and use `ObjectId` for the type.
  };

  export type QueueDXN = {
    subspaceTag: QueueSubspaceTag;
    spaceId: SpaceId;
    queueId: string; // TODO(dmaretskyi): ObjectId.
    objectId?: string; // TODO(dmaretskyi): ObjectId.
  };
}
