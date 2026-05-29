//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';

import { DXN, type Database, type Entity, Filter, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import {
  type AnyProperties,
  GeneratorAnnotationId,
  type GeneratorAnnotationValue,
  type JsonSchemaType,
  getSchemaReference,
  getTypeAnnotation,
} from '@dxos/echo/internal';
import {
  type SchemaProperty,
  findAnnotation,
  getProperties,
  isArrayType,
  isNestedType,
  runAndForwardErrors,
} from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { getDeep } from '@dxos/util';

/**
 * Decouples from random.
 */
export type ValueGenerator<T = any> = Record<string, () => T>;

const randomBoolean = (p = 0.5) => Math.random() <= p;
const randomElement = <T>(elements: T[]): T => elements[Math.floor(Math.random() * elements.length)];

/**
 * Type that has typename and version properties (created with Type.Obj).
 * @deprecated Use Type.AnyObj instead.
 */
export type TypedSchema = Type.AnyObj;

export type TypeSpec = {
  type: Type.AnyEntity;
  count: number;
};

/**
 * Create sets of objects.
 */
export const createObjectFactory =
  (db: Database.Database, generator: ValueGenerator) =>
  async (specs: TypeSpec[]): Promise<any[]> => {
    const result: any[] = [];
    for (const { type, count } of specs) {
      try {
        invariant(Type.isObject(type), 'TypeSpec.type must be an object type');
        const pipeline = createObjectPipeline(generator, type, { db });
        const objects = await runAndForwardErrors(createArrayPipeline(count, pipeline));
        result.push(...objects);
        // NOTE: Flush so that available to other generators as refs.
        await db.flush();
      } catch (err) {
        log.catch(err);
      }
    }

    return result;
  };

export type RelationSpec = {
  /** A relation type (created with `Type.makeRelation`). */
  type: Type.AnyEntity;
  count: number;
};

/**
 * Create sets of relations between existing objects.
 *
 * Parallel to {@link createObjectFactory}: iterates relation specs, resolves each relation's
 * declared source/target object types, queries the database for candidate objects of those
 * types, and creates `count` relations between randomly-paired source/target objects. The
 * relation's own properties are generated from their generator annotations (as for objects).
 *
 * Objects of the source/target types must already exist in the database — run
 * {@link createObjectFactory} for those types first.
 */
export const createRelationFactory =
  (db: Database.Database, generator: ValueGenerator) =>
  async (specs: RelationSpec[]): Promise<any[]> => {
    const result: any[] = [];
    for (const { type, count } of specs) {
      try {
        invariant(Type.isRelation(type), 'RelationSpec.type must be a relation type');

        // Resolve the source/target object typenames declared on the relation type.
        const annotation = getTypeAnnotation(Type.getSchema(type));
        const sourceTypename = annotation?.sourceSchema && DXN.getName(annotation.sourceSchema);
        const targetTypename = annotation?.targetSchema && DXN.getName(annotation.targetSchema);
        invariant(sourceTypename && targetTypename, 'Relation type must declare source and target types');

        // Query candidate endpoints.
        // TODO(burdon): Filter.typename doesn't currently work for mutable objects.
        const allObjects = await db.query(Query.select(Filter.everything())).run();
        const sources = allObjects.filter((object) => Obj.getTypename(object) === sourceTypename);
        const targets = allObjects.filter((object) => Obj.getTypename(object) === targetTypename);
        if (sources.length === 0 || targets.length === 0) {
          log.warn('no candidate objects for relation', { sourceTypename, targetTypename });
          continue;
        }

        for (let i = 0; i < count; i++) {
          const props = createProps(generator, type as unknown as Type.AnyObj)({
            [Relation.Source]: randomElement(sources),
            [Relation.Target]: randomElement(targets),
          } as any);
          result.push(addToDatabase(db)(Relation.make(type as any, props as any)));
        }

        // NOTE: Flush so relations are available to subsequent generators.
        await db.flush();
      } catch (err) {
        log.catch(err);
      }
    }

    return result;
  };

/**
 * Set properties based on generator annotation.
 */
export const createProps = <S extends Type.AnyObj>(generator: ValueGenerator, schema: S, force = false) => {
  type T = Type.InstanceType<S>;
  return (data: Entity.Properties<T> = {} as Entity.Properties<T>): Entity.Properties<T> => {
    return getProperties(Type.getSchema(schema).ast).reduce<Entity.Properties<T>>((obj, property) => {
      const name = property.name.toString();
      if ((obj as any)[name] === undefined && name !== 'id') {
        (obj as any)[name] = createValue(generator, schema, property, force);
      }

      return obj;
    }, data);
  };
};

/**
 * Generate value for property.
 */
const createValue = <S extends Type.AnyObj>(
  generator: ValueGenerator,
  schema: S,
  property: SchemaProperty,
  force = false,
): any | undefined => {
  const defaultValue = SchemaAST.getDefaultAnnotation(property.type);
  if (Option.isSome(defaultValue)) {
    return structuredClone(defaultValue.value);
  }

  // Generator value from annotation.
  const annotation = findAnnotation<GeneratorAnnotationValue>(property.type, GeneratorAnnotationId);
  if (annotation) {
    const {
      generator: generatorName,
      probability = 0.5,
      args = [],
    } = typeof annotation === 'string' ? { generator: annotation } : annotation;
    if (!property.isOptional || force || randomBoolean(probability)) {
      const fn = getDeep<(...args: any[]) => any>(generator, generatorName.split('.'));
      if (!fn) {
        log.warn('unknown generator', { generatorName });
      } else {
        return fn(...args);
      }
    }
  }

  // TODO(dmaretskyi): Support generating nested objects here; or generator via type.
  if (!property.isOptional) {
    if (isArrayType(property.type)) {
      return [];
    } else if (isNestedType(property.type)) {
      return {};
    } else {
      const prop = [Type.getTypename(schema), property.name.toString()].filter(Boolean).join('.');
      throw new Error(`Required property: ${prop}:${property.type._tag}`);
    }
  }
};

/**
 * Set references.
 */
export const createReferences = <S extends Type.AnyObj>(schema: S, db: Database.Database) => {
  type T = Type.InstanceType<S>;
  return async (obj: T): Promise<T> => {
    // Collect all references to set.
    const refsToSet: Array<{ name: PropertyKey; ref: any }> = [];

    for (const property of getProperties(Type.getSchema(schema).ast)) {
      if (!property.isOptional || randomBoolean()) {
        if (Ref.isRefType(property.type)) {
          const jsonSchema = findAnnotation<JsonSchemaType>(property.type, SchemaAST.JSONSchemaAnnotationId);
          if (jsonSchema) {
            const { typename } = getSchemaReference(jsonSchema) ?? {};
            invariant(typename);
            // TODO(burdon): Filter.typename doesn't currently work for mutable objects.
            const allObjects = await db.query(Query.select(Filter.everything())).run();
            const objects = allObjects.filter((obj) => Obj.getTypename(obj) === typename);
            if (objects.length) {
              const object = randomElement(objects);
              refsToSet.push({ name: property.name, ref: Ref.make(object) });
            }
          }
        }
      }
    }

    // Set all references within a change context.
    if (refsToSet.length > 0) {
      Obj.update(obj as any, (mutableObj: any) => {
        for (const { name, ref } of refsToSet) {
          mutableObj[name] = ref;
        }
      });
    }

    return obj;
  };
};

export const createReactiveObject = <S extends Type.AnyObj>(type: S) => {
  return (data: Entity.Properties<Type.InstanceType<S>>) => Obj.make<S>(type, data as any);
};

export const addToDatabase = (db: Database.Database) => {
  // TODO(dmaretskyi): Fix DB types.
  return <T extends AnyProperties>(obj: T): Obj.OfShape<T> => db.add(obj as any) as any;
};

export const logObject = (message: string) => (obj: any) => log.info(message, { obj });

export const createObjectArray = <T extends AnyProperties>(n: number): Entity.Properties<T>[] =>
  Array.from({ length: n }, () => ({}) as Entity.Properties<T>);

export const createArrayPipeline = <T extends AnyProperties>(
  n: number,
  pipeline: (obj: Entity.Properties<T>) => Effect.Effect<T, never, never>,
) => {
  return Effect.forEach(createObjectArray<T>(n), pipeline);
};

export type CreateOptions = {
  /** Database for references. */
  db?: Database.Database;

  /** If true, set all optional properties, otherwise randomly set them. */
  force?: boolean;
};

/**
 * Create an object creation pipeline.
 */
export const createObjectPipeline = <S extends Type.AnyObj>(
  generator: ValueGenerator,
  type: S,
  { db, force }: CreateOptions,
): ((obj: Entity.Properties<Type.InstanceType<S>>) => Effect.Effect<Type.InstanceType<S>, never, never>) => {
  type T = Type.InstanceType<S>;
  if (!db) {
    return (obj: Entity.Properties<T>) => {
      const pipeline: Effect.Effect<T> = Effect.gen(function* () {
        const withProps = createProps(generator, type, force)(obj);
        return createReactiveObject(type)(withProps);
      });

      return pipeline;
    };
  } else {
    return (obj: Entity.Properties<T>) => {
      const pipeline: Effect.Effect<T, never, never> = Effect.gen(function* () {
        const withProps = createProps(generator, type, force)(obj);
        const liveObj = createReactiveObject(type)(withProps);
        const withRefs = yield* Effect.promise(() => createReferences(type, db)(liveObj));
        return addToDatabase(db)(withRefs);
      });

      return pipeline;
    };
  }
};

export type ObjectGenerator<T extends AnyProperties> = {
  createObject: () => T;
  createObjects: (n: number) => T[];
};

// TODO(ZaymonFC): Sync generator doesn't work with db; createReferences is async and can't be invoked with `Effect.runSync`.
// TODO(dmaretskyi): Expose effect API instead of pairs of sync/async APIs.
export const createGenerator = <S extends Type.AnyObj>(
  generator: ValueGenerator,
  type: S,
  options: Omit<CreateOptions, 'db'> = {},
): ObjectGenerator<Type.InstanceType<S>> => {
  const pipeline = createObjectPipeline(generator, type, options);

  return {
    createObject: () => Effect.runSync(pipeline({} as Entity.Properties<Type.InstanceType<S>>)),
    createObjects: (n: number) => Effect.runSync(createArrayPipeline(n, pipeline)),
  };
};

export type AsyncObjectGenerator<T> = {
  createObject: () => Promise<T>;
  createObjects: (n: number) => Promise<T[]>;
};

export const createAsyncGenerator = <S extends Type.AnyObj>(
  generator: ValueGenerator,
  type: S,
  options: CreateOptions = {},
): AsyncObjectGenerator<Type.InstanceType<S>> => {
  type T = Type.InstanceType<S>;
  const pipeline = createObjectPipeline(generator, type, options);

  return {
    createObject: () => runAndForwardErrors(pipeline({} as Entity.Properties<T>)),
    createObjects: (n: number) => runAndForwardErrors(createArrayPipeline(n, pipeline)),
  };
};
