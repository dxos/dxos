//
// Copyright 2023 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { Filter, type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { EchoSchema, getTypeAnnotation } from '@dxos/echo/internal';
import { type AnyLiveObject } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { type Live, isLiveObject, live } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { entries, range } from '@dxos/util';

import { type TestSchemaType } from './data';
import {
  type MutationsProviderParams,
  type TestGeneratorMap,
  type TestMutationsMap,
  type TestObjectProvider,
  type TestSchemaMap,
} from './types';

/**
 * Typed object generator.
 * @deprecated
 */
export class TestObjectGenerator<T extends string = TestSchemaType> {
  // prettier-ignore
  constructor(
		protected readonly _schemas: TestSchemaMap<T>,
		private readonly _generators: TestGeneratorMap<T>,
		private readonly _provider?: TestObjectProvider<T>,
	) {}

  get schemas(): (EchoSchema | Schema.Schema.AnyNoContext)[] {
    return Object.values(this._schemas);
  }

  getSchema(type: T): EchoSchema | Schema.Schema.AnyNoContext | undefined {
    return this.schemas.find((schema) => getTypeAnnotation(schema)!.typename === type);
  }

  protected setSchema(type: T, schema: EchoSchema | Schema.Schema.AnyNoContext): void {
    this._schemas[type] = schema;
  }

  async createObject({ types }: { types?: T[] } = {}): Promise<Live<any>> {
    const type = faker.helpers.arrayElement(types ?? (Object.keys(this._schemas) as T[]));
    const data = await this._generators[type](this._provider);
    if (isLiveObject(data)) {
      return data;
    }

    const schema = this.getSchema(type);
    return schema ? Obj.make(schema, data) : live(data);
  }

  // TODO(burdon): Based on dependencies (e.g., organization before contact).
  async createObjects(map: Partial<Record<T, number>>) {
    const results: Live<any>[] = [];
    for (const [type, count] of entries(map)) {
      results.push(...(await Promise.all(range(count ?? 0, () => this.createObject({ types: [type as T] })))));
    }

    const tasks = Object.entries<number>(map as any)
      .map(([type, count]) => {
        return range(count, () => this.createObject({ types: [type as T] }));
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
      const objects = await this._space.db.query(schema ? Filter.type(schema) : Filter.nothing()).run();
      return objects;
    });
  }

  async addSchemas() {
    const result: (EchoSchema | Schema.Schema.AnyNoContext)[] = [];
    for (const [typename, schema] of Object.entries(this._schemas)) {
      const echoSchema = await this._maybeRegisterSchema(typename, schema as EchoSchema | Schema.Schema.AnyNoContext);
      this.setSchema(typename as T, echoSchema);
      result.push(echoSchema);
    }

    return result;
  }

  override async createObject({
    types,
  }: {
    types?: T[];
  } = {}): Promise<AnyLiveObject<any>> {
    return this._space.db.add(await super.createObject({ types }));
  }

  private async _maybeRegisterSchema(
    typename: string,
    schema: EchoSchema | Schema.Schema.AnyNoContext,
  ): Promise<EchoSchema | Schema.Schema.AnyNoContext> {
    if (schema instanceof EchoSchema) {
      const existingSchema = this._space.internal.db.schemaRegistry.getSchema(typename);
      if (existingSchema != null) {
        return existingSchema;
      }
      const [registeredSchema] = await this._space.internal.db.schemaRegistry.register([schema]);
      return registeredSchema;
    } else {
      const existingSchema = this._space.internal.db.graph.schemaRegistry.getSchema(typename);
      if (existingSchema != null) {
        return existingSchema;
      }
      await this._space.internal.db.graph.schemaRegistry.register([schema]);
      return schema;
    }
  }

  async mutateObject(object: AnyLiveObject<any>, params: MutationsProviderParams): Promise<void> {
    invariant(this._mutations, 'Mutations not defined.');
    const type = getTypeAnnotation(Obj.getSchema(object)!)!.typename as T;
    invariant(type && this._mutations?.[type], 'Invalid object type.');

    await this._mutations![type](object, params);
  }

  async mutateObjects(objects: AnyLiveObject<any>[], params: MutationsProviderParams): Promise<void> {
    for (const object of objects) {
      await this.mutateObject(object, params);
    }
  }
}
