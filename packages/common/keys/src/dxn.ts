//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

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
    ECHO: 'echo',
    TYPE: 'type',
  });

  static parse(dxn: string): DXN {
    const [prefix, kind, ...parts] = dxn.split(':');
    if (!(prefix === 'dxn')) {
      throw new Error('Invalid DXN');
    }
    if (!(typeof kind === 'string' && kind.length > 0)) {
      throw new Error('Invalid DXN');
    }
    if (!(parts.length > 0)) {
      throw new Error('Invalid DXN');
    }
    return new DXN(kind, parts);
  }

  #kind: string;
  #parts: string[];

  constructor(kind: string, parts: string[]) {
    invariant(parts.length > 0);
    invariant(parts.every((part) => typeof part === 'string' && part.length > 0 && part.indexOf(':') === -1));

    // Per-type validation.
    switch (kind) {
      case DXN.kind.ECHO:
        invariant(parts.length === 2);
        break;
      case DXN.kind.TYPE:
        invariant(parts.length === 1);
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

  isTypeDXNOf(typename: string) {
    return this.#kind === DXN.kind.TYPE && this.#parts.length === 1 && this.#parts[0] === typename;
  }

  toString() {
    return `dxn:${this.#kind}:${this.#parts.join(':')}`;
  }
}

/**
 * Tags for ECHO DXNs that should resolve the object ID in the local space.
 */
export const LOCAL_SPACE_TAG = '@';
