//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Annotation, Database, Filter, type JsonSchema, Obj, Query, type Registry } from '@dxos/echo';
import { log } from '@dxos/log';

/** Reads echo's registry into the shapes the fixed tool surface serves. */

/** Same constraint as tool names; prompt names surface as `/mcp__<server>__<name>`. */
const PROMPT_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/** NSID of a registry key: `dxn:` prefix and `:<version>` tail stripped — the form ToolIds carry. */
export const nsid = (key: string): string => key.replace(/^dxn:/, '').replace(/:\d+\.\d+\.\d+$/, '');

/** An opted-in skill with its derived prompt name and materialized instructions. */
export type McpSkill = {
  skill: Skill.Skill;
  key: string;
  promptName: string;
  description?: string;
  instructions: string;
};

const isOperationRecord = Obj.instanceOf(Operation.PersistentOperation);

/**
 * The opted-in skills, named by their key's final segment.
 *
 * Opt-in exists because a skill written for the in-app chat runtime assumes tools an MCP client
 * does not have. A prompt-name collision throws rather than resolving silently, since two skills
 * claiming one name is an authorship error; `reservedNames` covers the host's static prompts.
 */
export const mcpSkills = (
  registry: Registry.Registry,
  reservedNames: readonly string[] = [],
): Effect.Effect<McpSkill[]> =>
  Effect.promise(() => registry.query(Filter.type(Skill.Skill)).run()).pipe(
    Effect.map((skills) => {
      const projected: McpSkill[] = [];
      for (const skill of skills) {
        if (!Skill.isMcpPrompt(skill)) {
          continue;
        }
        const key = Obj.getMeta(skill).key;
        const instructions = skill.instructions?.source?.target?.content;
        if (!key || !instructions) {
          log.warn('skill has no key or instructions; not projected', { key, name: skill.name });
          continue;
        }
        const promptName = nsid(key).split('.').at(-1) ?? '';
        if (!PROMPT_NAME_PATTERN.test(promptName)) {
          log.warn('projected prompt name violates the name constraint; skill skipped', { key, promptName });
          continue;
        }
        projected.push({
          skill,
          key: nsid(key),
          promptName,
          description: skill.description ?? skill.name,
          instructions,
        });
      }

      const deduped = dedupeByKey(projected);
      const holders = new Map<string, string>(reservedNames.map((name) => [name, '<static prompt>']));
      for (const candidate of deduped) {
        const holder = holders.get(candidate.promptName);
        if (holder !== undefined) {
          throw new Error(
            `MCP prompt name collision: '${candidate.promptName}' claimed by both ${holder} and ${candidate.key}.`,
          );
        }
        holders.set(candidate.promptName, candidate.key);
      }
      return deduped;
    }),
  );

/** One entry per key, last-added winning, because a live registry re-registers its contributions. */
const dedupeByKey = <T extends { readonly key: string }>(entries: readonly T[]): T[] => {
  const byKey = new Map<string, T>();
  for (const entry of entries) {
    byKey.set(entry.key, entry);
  }
  return [...byKey.values()];
};

/** Operation NSID → the skills naming it; membership here is what makes an operation reachable. */
export const ownersOf = (skills: readonly McpSkill[]): Map<string, string[]> => {
  const owners = new Map<string, string[]>();
  for (const candidate of skills) {
    // A skill's `tools` entries are derived tool names (`Skill.toolDefinitions`), not operation
    // NSIDs, so membership is keyed by the name a record derives — see {@link toolNameOf}.
    for (const tool of candidate.skill.tools) {
      owners.set(tool, [...(owners.get(tool) ?? []), candidate.promptName]);
    }
  }
  return owners;
};

/**
 * The key an operation record is governed by: its derived tool name, the form a skill's `tools` list
 * carries. Undefined when the record's key cannot derive a valid name, which makes it ungoverned
 * rather than aborting the surface — registry records arrive as untrusted JSON.
 */
export const toolNameOf = (record: Operation.PersistentOperation): string | undefined => {
  const key = Operation.getKey(record);
  return key == null ? undefined : Operation.tryToolNameFromKey(key);
};

/** Operation records matching an optional text query, whose semantics are echo's `Filter.text`. */
export const findRecords = (
  registry: Registry.Registry,
  text: string | undefined,
): Effect.Effect<Operation.PersistentOperation[]> => {
  const base = Filter.type(Operation.PersistentOperation);
  const filter = text != null && text.trim().length > 0 ? Filter.and(base, Filter.text(text)) : base;
  return Effect.promise(() => registry.query(Query.select(filter)).run()).pipe(
    // One record per key, matching {@link lookup}, so a re-registered operation lists once.
    Effect.map((records) => {
      const byKey = new Map<string, Operation.PersistentOperation>();
      for (const record of records.filter(isOperationRecord)) {
        byKey.set(nsid(Operation.getKey(record) ?? ''), record);
      }
      return [...byKey.values()];
    }),
  );
};

/** The record a key names, in any spelling (`dxn:` prefix, `:<version>` tail, or bare NSID). */
export const lookup = (registry: Registry.Registry, key: string): Operation.PersistentOperation | undefined => {
  const entity = registry.getByURI(`dxn:${nsid(key)}`);
  return entity != null && isOperationRecord(entity) ? entity : undefined;
};

/** The mutation class a record claims; an undecodable value claims nothing rather than throwing. */
const mutationOf = (record: Operation.PersistentOperation): Operation.Mutation | undefined => {
  try {
    return Operation.getMutation(record);
  } catch (error) {
    log.warn('mutation annotation did not decode; reporting without safety hints', {
      key: Operation.getKey(record),
      error: String(error),
    });
    return undefined;
  }
};

/**
 * One operation as `queryOperations` describes it. `schema` travels only on a `keys` lookup, because
 * a schema costs the model hundreds of tokens where the rest of a view costs a description.
 */
export type OperationView = {
  key: string;
  name?: string;
  description?: string;
  /** Prompt names of the skills that govern this operation. */
  skills: readonly string[];
  /** Whether the operation is space-addressed, making `invokeOperation`'s `spaceId` load-bearing. */
  requiresSpace: boolean;
  /** Behavioral hints, grouped as MCP's own readOnly/destructive/idempotent trio is. */
  hints: {
    mutation?: Operation.Mutation;
    idempotent?: boolean;
  };
  /** JSON Schemas of the operation's input and output; present on a `keys` lookup only. */
  schema?: {
    input?: JsonSchema.JsonSchema;
    output?: JsonSchema.JsonSchema;
  };
};

/**
 * Whether the operation acts on a space, which is what makes `invokeOperation`'s `spaceId`
 * load-bearing: `Database.Service` materializes from it and from nothing else.
 */
export const requiresSpace = (record: Operation.PersistentOperation): boolean =>
  (record.services ?? []).includes(Database.Service.key);

export const operationView = (
  record: Operation.PersistentOperation,
  owners: Map<string, string[]>,
  withSchema: boolean,
): OperationView => {
  // The client addresses an operation by key, so that is what rides in the view; skill membership is
  // keyed by the derived tool name instead, the form a skill's `tools` list carries.
  const key = nsid(Operation.getKey(record) ?? '');
  const toolName = toolNameOf(record);
  const idempotent = Option.getOrUndefined(Annotation.get(record, Operation.IdempotentAnnotation));
  return {
    key,
    name: record.name.length > 0 ? record.name : undefined,
    description: record.description,
    skills: (toolName == null ? undefined : owners.get(toolName)) ?? [],
    requiresSpace: requiresSpace(record),
    hints: {
      mutation: mutationOf(record),
      idempotent: idempotent === true ? true : undefined,
    },
    ...(withSchema ? { schema: { input: record.inputSchema, output: record.outputSchema } } : {}),
  };
};
