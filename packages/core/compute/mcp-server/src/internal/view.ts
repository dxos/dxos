//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Annotation, Database, Filter, Obj, Query, type Registry } from '@dxos/echo';
import { log } from '@dxos/log';

/**
 * Reads of the registry into the shapes the fixed tool surface serves. The registry is echo's own
 * (`Registry.Registry` holding `PersistentOperation` and `Skill` entities), so what lives here is
 * only the projection judgment: which skills opt in, which operations they govern, and what a
 * `findOperations` row says about one.
 */

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
 * The opted-in skills, with prompt names derived from the key's final segment.
 *
 * Opt-in mirrors the old tool projection: a skill written for an in-app chat runtime assumes tools
 * an MCP client does not have. Name collisions throw — an authorship error the contract wants
 * surfaced loudly, not resolved silently; `reservedNames` covers the host's static prompts.
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

/**
 * One entry per key, the last added winning — the same answer `getByURI` gives, whose URI index a
 * later `add` overwrites. A key registered twice is re-registration (a live registry re-syncing
 * its contributions), not the authorship error the prompt-name collision check exists for.
 */
const dedupeByKey = <T extends { readonly key: string }>(entries: readonly T[]): T[] => {
  const byKey = new Map<string, T>();
  for (const entry of entries) {
    byKey.set(entry.key, entry);
  }
  return [...byKey.values()];
};

/**
 * Operation NSID → prompt names of the skills whose `tools` list names it. Skills are the atomic
 * unit of projection: membership here is what makes an operation findable and invocable at all.
 */
export const ownersOf = (skills: readonly McpSkill[]): Map<string, string[]> => {
  const owners = new Map<string, string[]>();
  for (const candidate of skills) {
    for (const tool of candidate.skill.tools) {
      const id = nsid(tool);
      owners.set(id, [...(owners.get(id) ?? []), candidate.promptName]);
    }
  }
  return owners;
};

/**
 * Operation records matching an optional text query — the registry evaluates `Filter.text`
 * in memory, so the search semantics live in echo rather than here.
 */
export const findRecords = (
  registry: Registry.Registry,
  text: string | undefined,
): Effect.Effect<Operation.PersistentOperation[]> => {
  const base = Filter.type(Operation.PersistentOperation);
  const filter = text != null && text.trim().length > 0 ? Filter.and(base, Filter.text(text)) : base;
  return Effect.promise(() => registry.query(Query.select(filter)).run()).pipe(
    // One record per key, matching {@link lookup}: a re-registered operation must list once, not
    // once per registration.
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
 * One operation as `findOperations` describes it. A view costs the model a description where a
 * schema costs hundreds of tokens, which is why `schema` travels only on a `keys` lookup.
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
    input?: unknown;
    output?: unknown;
  };
};

export const operationView = (
  record: Operation.PersistentOperation,
  owners: Map<string, string[]>,
  withSchema: boolean,
): OperationView => {
  const key = nsid(Operation.getKey(record) ?? '');
  const idempotent = Option.getOrUndefined(Annotation.get(record, Operation.IdempotentAnnotation));
  return {
    key,
    name: record.name.length > 0 ? record.name : undefined,
    description: record.description,
    skills: owners.get(key) ?? [],
    requiresSpace: (record.services ?? []).includes(Database.Service.key),
    hints: {
      mutation: mutationOf(record),
      idempotent: idempotent === true ? true : undefined,
    },
    ...(withSchema ? { schema: { input: record.inputSchema, output: record.outputSchema } } : {}),
  };
};
