//
// Copyright 2022 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { base, TypedObject, dangerouslyMutateImmutableObject, isActualTypedObject } from './object';
import type { SchemaProps, Schema as SchemaProto } from './proto';

type Prototype = {
  new (...args: any): any;
  schema: SchemaProto;
};

/**
 * Constructed via generated protobuf class.
 */
export class TypeCollection {
  private readonly _prototypes = new Map<string, Prototype>();
  private readonly _types = new Map<string, SchemaProto>();
  private readonly _schemaDefs = new Map<string, SchemaProps>();

  get schemas(): SchemaProto[] {
    log.info('schemas', {
      types: this._types.size,
      prototypes: this._prototypes.size,
      schemaDefs: this._schemaDefs.size,
    });
    return Array.from(this._types.values());
  }

  mergeSchema(schema: TypeCollection) {
    Array.from(schema._prototypes.entries()).forEach(([name, prototype]) => {
      invariant(!this._prototypes.has(name), `Schema already exists: ${name}`);
      this._prototypes.set(name, prototype);
    });
    Array.from(schema._types.entries()).forEach(([name, type]) => {
      invariant(!this._types.has(name), `Schema already exists: ${name}`);
      this._types.set(name, type);
    });
  }

  /**
   * Called from generated code.
   */
  registerPrototype(proto: Prototype, schema: SchemaProps) {
    this._prototypes.set(schema.typename, proto);
    this._schemaDefs.set(schema.typename, schema);
    
    Object.defineProperty(proto, Symbol.hasInstance, {
      value: (instance: any) => {
        return instance instanceof TypedObject && instance.__typename === schema.typename;
      },
      enumerable: false,
      writable: false,
    });
  }

  getPrototype(name: string): Prototype | undefined {
    return this._prototypes.get(name);
  }

  getSchema(name: string): SchemaProto | undefined {
    return this._types.get(name);
  }

  /**
   * Resolve cross-schema references and instantiate schemas.
   */
  link() {
    if (deferLink) {
      // Circular dependency hack.
      return;
    }

    if (this._types.size !== 0) {
      throw new Error('Already linked.');
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Schema } = require('./proto');
    invariant(Schema, 'Circular dependency.');

    // Create immutable schema objects.
    for (const def of this._schemaDefs.values()) {
      const schema = new Schema(def, { immutable: true });
      this._types.set(schema.typename, schema);
    }

    // Link.
    dangerouslyMutateImmutableObject(() => {
      for (const type of this._types.values()) {
        for (const field of type.props) {
          if (field.refName) {
            if (this._types.has(field.refName)) {
              field.ref = this._types.get(field.refName);
            }
          }
        }

        const proto = this._prototypes.get(type.typename);
        invariant(proto, 'Missing prototype');
        proto.schema = type;
      }
    });

    for (const [typename, proto] of this._prototypes) {
      const schema = this._types.get(typename);
      invariant(schema);
      proto.schema = schema;
    }
  }
}

let deferLink = true;

/**
 * Call after module code has loaded to avoid circular dependency errors.
 */
// TODO(burdon): Factor out.
export const linkDeferred = () => {
  deferLink = false;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { schemaBuiltin } = require('./proto');
  schemaBuiltin.link();
};
