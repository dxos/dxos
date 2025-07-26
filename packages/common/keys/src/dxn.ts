//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import type { inspect, InspectOptionsStylized } from 'node:util';

import { devtoolsFormatter, type DevtoolsFormatter, inspectCustom } from '@dxos/debug';
import { assertArgument, invariant } from '@dxos/invariant';

import { ObjectId } from './object-id';
import { SpaceId } from './space-id';

/**
 * Tags for ECHO DXNs that should resolve the object ID in the local space.
 */
// TODO(dmaretskyi): Rebrand this as "unknown location" to specify objects in the same space or queue. Essentially making the DXN it a URI not URL
// TODO(dmaretskyi): "@" is a separator character in the URI spec.
export const LOCAL_SPACE_TAG = '@';

// TODO(burdon): Namespace for.
export const QueueSubspaceTags = Object.freeze({
  DATA: 'data',
  TRACE: 'trace',
});

export type QueueSubspaceTag = (typeof QueueSubspaceTags)[keyof typeof QueueSubspaceTags];

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
  // TODO(dmaretskyi): Should this be a transformation into the DXN type?
  static Schema = Schema.NonEmptyString.pipe(
    Schema.pattern(/^dxn:([^:]+):(?:[^:]+:?)+[^:]$/),
    // TODO(dmaretskyi): To set the format we need to move the annotation IDs out of the echo-schema package.
    // FormatAnnotation.set(FormatEnum.DXN),
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
     * dxn:type:<type name>[:<version>]
     */
    TYPE: 'type',

    /**
     * dxn:echo:<space id>:<echo id>
     * dxn:echo:@:<echo id>
     */
    // TODO(burdon): Rename to OBJECT? (BREAKING CHANGE).
    // TODO(burdon): Add separate Kind for space.
    ECHO: 'echo',

    /**
     * The subspace tag enables us to partition queues by usage within the context of a space.
     * dxn:queue:<subspace_tag>:<space_id>:<queue_id>[:object_id]
     * dxn:queue:data:BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE:01J00J9B45YHYSGZQTQMSKMGJ6
     * dxn:queue:trace:BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE:01J00J9B45YHYSGZQTQMSKMGJ6
     */
    QUEUE: 'queue',
  })

  get kind() {
    return this.#kind;
  };

  static equals(a: DXN, b: DXN): boolean {
    return a.kind === b.kind && a.parts.length === b.parts.length && a.parts.every((part, i) => part === b.parts[i]);
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
    } catch (error) {
      return undefined;
    }
  }

  /**
   * @example `dxn:type:example.com/type/Contact`
   */
  static fromTypename(typename: string): DXN {
    return new DXN(DXN.kind.TYPE, [typename]);
  }

  /**
   * @example `dxn:type:example.com/type/Contact:0.1.0`
   */
  // TODO(dmaretskyi): Consider using @ as the version separator.
  static fromTypenameAndVersion(typename: string, version: string): DXN {
    return new DXN(DXN.kind.TYPE, [typename, version]);
  }

  /**
   * @example `dxn:echo:@:01J00J9B45YHYSGZQTQMSKMGJ6`
   */
  static fromLocalObjectId(id: string): DXN {
    assertArgument(ObjectId.isValid(id), `Invalid object ID: ${id}`);
    return new DXN(DXN.kind.ECHO, [LOCAL_SPACE_TAG, id]);
  }

  static fromQueue(subspaceTag: QueueSubspaceTag, spaceId: SpaceId, queueId: ObjectId, objectId?: ObjectId) {
    invariant(SpaceId.isValid(spaceId));
    invariant(ObjectId.isValid(queueId));
    invariant(!objectId || ObjectId.isValid(objectId));

    return new DXN(DXN.kind.QUEUE, [subspaceTag, spaceId, queueId, ...(objectId ? [objectId] : [])]);
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

  get parts() {
    return this.#parts;
  }

  // TODO(burdon): Should getters fail?
  get typename() {
    invariant(this.#kind === DXN.kind.TYPE);
    return this.#parts[0];
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
}

// TODO(dmaretskyi): Fluent API:
/*
class DXN {
  ...
isEchoDXN(): this is EchoDXN {
  return this.#kind === DXN.kind.ECHO;
}
...
}

interface EchoDXN extends DXN {
  objectId: ObjectId;
}

declare const dxn: DXN;

dxn.objectId

if(dxn.isEchoDXN()) {
  dxn.objectId
}
  ```

/**
 * API namespace.
 */
export declare namespace DXN {
  export type TypeDXN = {
    type: string;
    version?: string;
  };

  export type EchoDXN = {
    spaceId?: SpaceId;
    // TODO(burdon): Rename objectId.
    echoId: string; // TODO(dmaretskyi): ObjectId.
  };

  export type QueueDXN = {
    subspaceTag: string;
    spaceId: SpaceId;
    queueId: string; // TODO(dmaretskyi): ObjectId.
    objectId?: string; // TODO(dmaretskyi): ObjectId.
  };

  /**
   * DXN represented as a javascript string.
   */
  export type String = string & { __DXNString: never };
  // TODO(burdon): Make brand.
  // export const String = S.String.pipe(S.brand('DXN'));
  // export type String = S.To(typoeof String);
}
