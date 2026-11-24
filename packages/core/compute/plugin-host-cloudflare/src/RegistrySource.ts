//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { ToolId } from '@dxos/ai';
import { type FunctionWrappingOptions } from '@dxos/compute-runtime/protocol';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { type Entity, Obj, type Query, Type } from '@dxos/echo';
import { DXN, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import type { PluginProtocol } from '@dxos/protocols';

import * as TypeSource from './TypeSource.ts';

/** A source of an invocation's registry, as the compute runtime registers it (`registrySource`). */
export type Source = NonNullable<FunctionWrappingOptions['registrySource']>;

/** The keys of what the bundle registers itself, which win over EDGE's records of the same key. */
export type Own = {
  readonly skills: ReadonlySet<string>;
  readonly operations: ReadonlySet<string>;
};

/**
 * EDGE's registry as a source of an invocation's registry: a registry URI resolves, and a registry query that names no
 * key enumerates, whichever enabled plugin publishes the type, skill or operation. Built per invocation: the skill
 * catalog it reads once is a promise of this request's I/O context, which a later request may not await.
 */
export const fromRegistry = (registry: PluginProtocol.Registry, own: Own): Source => {
  const types = TypeSource.fromRegistry(registry);
  let catalog: Promise<PluginProtocol.SkillCatalog> | undefined;
  const skillCatalog = () => (catalog ??= retryable(registry.listSkills(), () => (catalog = undefined)));

  // Converted once per source: each conversion mints new ids, and the registry tells entities apart by id.
  let skillEntities: Promise<Skill.Skill[]> | undefined;
  const skills = (): Promise<Skill.Skill[]> =>
    (skillEntities ??= retryable(
      skillCatalog().then(({ skills }) =>
        skills.filter((record) => !own.skills.has(bareKey(record.key))).map(fromSkillRecord),
      ),
      () => (skillEntities = undefined),
    ));

  const readOperations = async (): Promise<Operation.PersistentOperation[]> => {
    const records: Operation.PersistentOperation[] = [];
    for (const json of (await skillCatalog()).operations) {
      // A record off the wire is untrusted: one that is not an operation is skipped rather than asserted.
      const record = await Obj.fromJSON(json).catch(() => undefined);
      if (record === undefined || !Obj.instanceOf(Operation.PersistentOperation, record)) {
        continue;
      }
      const key = Operation.getKey(record);
      if (key !== undefined && !own.operations.has(bareKey(key))) {
        records.push(record);
      }
    }
    return records;
  };

  let operationEntities: Promise<Operation.PersistentOperation[]> | undefined;
  const operations = (): Promise<Operation.PersistentOperation[]> =>
    (operationEntities ??= retryable(readOperations(), () => (operationEntities = undefined)));

  return {
    resolve: async (uri: URI.URI) => {
      if (!DXN.isDXN(uri)) {
        return undefined;
      }
      const type = await types(uri);
      if (type !== undefined) {
        return type;
      }
      const key = DXN.getName(uri);
      const version = DXN.getVersion(uri);
      // A versioned URI addresses that version only, as the registry's own lookup reads it.
      const matches = (entityKey: string | undefined, entityVersion: string | undefined) =>
        entityKey !== undefined && bareKey(entityKey) === key && (version === undefined || entityVersion === version);
      return (
        (await skills()).find((skill) => matches(Skill.getKey(skill), Obj.getMeta(skill).version)) ??
        (await operations()).find((record) => matches(Operation.getKey(record), Operation.getVersion(record)))
      );
    },
    query: async (query: Query.Any): Promise<readonly Entity.Unknown[]> => {
      const selected = selectedTypenames(query);
      const answers: Entity.Unknown[] = [];
      if (selected.has(Type.getTypename(Type.Type) ?? '')) {
        answers.push(...(await registry.listTypes()).flatMap(rebuildType));
      }
      if (selected.has(Type.getTypename(Skill.Skill) ?? '')) {
        answers.push(...(await skills()));
      }
      if (selected.has(Type.getTypename(Operation.PersistentOperation) ?? '')) {
        answers.push(...(await operations()));
      }
      return answers;
    },
  };
};

/**
 * A skill as EDGE's registry describes it: its tools resolve against the operation records the registry lists beside
 * it. Template inputs and MCP servers do not cross the wire.
 */
export const fromSkillRecord = (record: PluginProtocol.SkillRecord): Skill.Skill =>
  Skill.make({
    key: record.key,
    name: record.name,
    ...(record.description !== undefined ? { description: record.description } : {}),
    tools: record.tools.map((tool) => ToolId.make(tool)),
    instructions: Template.make({ source: record.instructions ?? '' }),
    mcpPrompt: record.mcpPrompt,
    // `enableSkills` refuses a skill without it, so dropping it would leave an agent unable to turn the skill on.
    ...(record.agentCanEnable ? { agentCanEnable: true } : {}),
  });

/**
 * A listed type rebuilt from its JSON Schema, or none: one record whose schema cannot be rebuilt costs only that type,
 * not the whole listing.
 */
const rebuildType = (record: PluginProtocol.TypeRecord): Type.AnyEntity[] => {
  try {
    return [TypeSource.fromRecord(record)];
  } catch (error) {
    log.warn('published type not rebuilt from its JSON Schema', { typename: record.typename, error });
    return [];
  }
};

/**
 * `request`, calling `reset` when it rejects: a memoized lookup that failed once must not fail every later call in the
 * invocation, while a successful answer stays cached.
 */
const retryable = <T>(request: Promise<T>, reset: () => void): Promise<T> =>
  request.catch((error) => {
    reset();
    throw error;
  });

/** Keys compare without the `dxn:` prefix, which records and definitions spell differently. */
export const bareKey = (key: string): string => key.replace(/^dxn:/, '');

/** The typenames a query selects with `Filter.type`, which decide what a source enumerates for it. */
const selectedTypenames = (query: Query.Any): Set<string> => {
  const typenames = new Set<string>();
  const collect = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(collect);
    } else if (node !== null && typeof node === 'object') {
      for (const [field, value] of Object.entries(node)) {
        if (field === 'typename' && typeof value === 'string') {
          const dxn = DXN.tryMake(value);
          if (dxn !== undefined) {
            typenames.add(DXN.getName(dxn));
          }
        } else {
          collect(value);
        }
      }
    }
  };
  collect(query.ast);
  return typenames;
};
