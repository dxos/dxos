//
// Copyright 2023 DXOS.org
//

import { type Space, Filter } from '@dxos/client/echo';
import {
  type EchoReactiveObject,
  type ReactiveObject,
  DynamicSchema,
  getEchoObjectAnnotation,
  getSchema,
  type S,
} from '@dxos/echo-schema';
import { create } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { range as rangeUtil } from '@dxos/util';

import { type TestSchemaType } from './data';
import {
  type TestMutationsMap,
  type TestGeneratorMap,
  type TestObjectProvider,
  type TestSchemaMap,
  type MutationsProviderParams,
} from './types';
import { range } from './util';

/**
 * Typed object generator.
 */
export class TestObjectGenerator<T extends string = TestSchemaType> {
  // prettier-ignore
  constructor(
    protected readonly _schemas: TestSchemaMap<T>,
    private readonly _generators: TestGeneratorMap<T>,
    private readonly _provider?: TestObjectProvider<T>,
  ) {}

  get schemas(): (DynamicSchema | S.Schema<any>)[] {
    return Object.values(this._schemas);
  }

  getSchema(type: T): DynamicSchema | S.Schema<any> | undefined {
    return this.schemas.find((schema) => getEchoObjectAnnotation(schema)!.typename === type);
  }

  protected setSchema(type: T, schema: DynamicSchema | S.Schema<any>) {
    this._schemas[type] = schema;
  }

  // TODO(burdon): Runtime type check via: https://github.com/Effect-TS/schema (or zod).
  async createObject({ types }: { types?: T[] } = {}): Promise<ReactiveObject<any>> {
    const type = faker.helpers.arrayElement(types ?? (Object.keys(this._schemas) as T[]));
    const data = await this._generators[type](this._provider);
    const schema = this.getSchema(type);
    return schema ? create(schema, data) : create(data);
  }

  // TODO(burdon): Create batch.
  // TODO(burdon): Based on dependencies (e.g., organization before contact).
  async createObjects(map: Partial<Record<T, number>>) {
    const tasks = Object.entries<number>(map as any)
      .map(([type, count]) => {
        return range(() => this.createObject({ types: [type as T] }), count);
      })
      .flatMap((t) => t);

    return Promise.all(tasks);
  }
}

/**
 * Typed object generator for a space.
 */
export class SpaceObjectGenerator<T extends string> extends TestObjectGenerator<T> {
  constructor(
    private readonly _space: Space,
    schemaMap: TestSchemaMap<T>,
    generators: TestGeneratorMap<T>,
    private readonly _mutations?: TestMutationsMap<T>,
  ) {
    super(schemaMap, generators, async (type: T) => {
      const schema = this.getSchema(type);
      return (schema && (await this._space.db.query(Filter.schema(schema)).run()).objects) ?? [];
    });

    // TODO(burdon): Map initially are objects that have not been added to the space.
    // Merge existing schema in space with defaults.
    Object.entries<DynamicSchema | S.Schema<any>>(schemaMap).forEach(([type, dynamicSchema]) => {
      const schema = this._maybeRegisterSchema(type, dynamicSchema);

      this.setSchema(type as T, schema);
    });
  }

  addSchemas() {
    const result: (DynamicSchema | S.Schema<any>)[] = [];
    for (const [typename, schema] of Object.entries(this._schemas)) {
      result.push(this._maybeRegisterSchema(typename, schema as DynamicSchema | S.Schema<any>));
    }

    return result;
  }

  override async createObject({ types }: { types?: T[] } = {}): Promise<EchoReactiveObject<any>> {
    return this._space.db.add(await super.createObject({ types }));
  }

  private _maybeRegisterSchema(typename: string, schema: DynamicSchema | S.Schema<any>): DynamicSchema | S.Schema<any> {
    if (schema instanceof DynamicSchema) {
      const existingSchema = this._space.db.schema.getSchemaByTypename(typename);
      if (existingSchema != null) {
        return existingSchema;
      }
      this._space.db.add(schema.serializedSchema);
      return this._space.db.schema.registerSchema(schema.serializedSchema);
    } else {
      const existingSchema = this._space.db.graph.schemaRegistry.getSchema(typename);
      if (existingSchema != null) {
        return existingSchema;
      }
      this._space.db.graph.schemaRegistry.addSchema([schema]);
      return schema;
    }
  }

  async mutateObject(object: EchoReactiveObject<any>, params: MutationsProviderParams) {
    invariant(this._mutations, 'Mutations not defined.');
    for (const _ of rangeUtil(params.count)) {
      const type = getEchoObjectAnnotation(getSchema(object)!)!.typename as T;
      invariant(type && this._mutations?.[type], 'Invalid object type.');

      this._mutations![type](object, params);
    }
  }

  async mutateObjects(objects: EchoReactiveObject<any>[], params: MutationsProviderParams) {
    for (const object of objects) {
      await this.mutateObject(object, params);
    }
  }
}
