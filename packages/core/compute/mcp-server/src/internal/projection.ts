//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import * as SchemaGetter from 'effect/SchemaGetter';
import * as SchemaIssue from 'effect/SchemaIssue';

import * as Operation from '@dxos/compute/Operation';
import { Database, JsonSchema } from '@dxos/echo';
import { log } from '@dxos/log';

import type * as McpRegistry from '../McpRegistry';

/**
 * Anthropic tool-name constraint, shared with the client's `mcp__<server>__` prefix inside a
 * 64-char budget. Prompt names surface as `/mcp__<server>__<name>` and are held to it too.
 *
 * Operations are no longer named by it: they are addressed by their registry key through
 * `invokeOperation`, so the key needs no shortening and two operations sharing a final segment is
 * no longer a collision.
 */
const PROMPT_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

const decodeMutation = Schema.decodeUnknownResult(Operation.MutationAnnotation.schema);

/**
 * Tool parameter fields. Narrower than `Schema.Struct.Fields`: schemas rebuilt from JSON Schema
 * carry no decoding or encoding services, and saying so keeps the tool handlers' requirement
 * channel empty.
 */
export type Fields = { readonly [key: string]: Schema.Codec<any, any> };

/**
 * One operation as `findOperations` returns it — the whole of what the model is told about an
 * operation, and the reason its schemas are separable: a catalog row costs a few dozen tokens
 * where an input schema costs hundreds, so the schemas travel only when the model asks for them
 * by key.
 */
export type OperationEntry = {
  /** Operation key without the `dxn:` prefix — what `invokeOperation` dispatches on. */
  key: string;
  name?: string;
  description?: string;
  /** Prompt names of the skills whose `tools` list names this operation. */
  skills: readonly string[];
  /**
   * Whether the operation is space-addressed — it declares `Database.Service` — which is what
   * makes `invokeOperation`'s `spaceId` load-bearing for this call.
   */
  requiresSpace: boolean;
  /** The operation's effect on state (`Operation.MutationAnnotation`); absent claims nothing. */
  mutation?: Operation.Mutation;
  /** `Operation.IdempotentAnnotation`. */
  idempotent?: boolean;
  /** Input JSON Schema, exactly as the registry serialized it; returned on request only. */
  inputSchema?: unknown;
  /** Output JSON Schema, same. */
  outputSchema?: unknown;
};

export type ProjectedOperation = {
  /** Operation key without the `dxn:` prefix — the form the registry dispatches on. */
  key: string;
  /** What the model is told about this operation. */
  entry: OperationEntry;
  /** What an `invokeOperation` input decodes through: ref fields widened to accept a JSON string. */
  parameters: Fields;
  /**
   * What the decoded input encodes back through on the way to the registry — un-widened, because
   * decoding turns ref envelopes into live `Ref`s and those do not survive an RPC boundary.
   */
  wireSchema?: Schema.Codec<any, any>;
};

export type ProjectedSkill = {
  /** Registry key of the skill definition. */
  key: string;
  promptName: string;
  description?: string;
  instructions: string;
  /** NSIDs of the skill's tools — the operations this skill projects. */
  tools: readonly string[];
};

/** `$id` of the reference declaration ECHO emits for a `Ref` field. */
const REF_SCHEMA_ID = '/schemas/echo/ref';

/**
 * Whether this JSON Schema property is a ref, an array of them, or a composition wrapping one.
 *
 * The declaration does not always sit at the top level: a field carrying its own annotations —
 * `taskCreate`'s `taskSet` has a `description`, `updateProject`'s `project` does not — renders as
 * `{ allOf: [<declaration>], description }`, so matching only the top-level `$id` catches one and
 * misses the other.
 */
const isRefProperty = (property: any): boolean => {
  if (property == null || typeof property !== 'object') {
    return false;
  }
  if (property.$id === REF_SCHEMA_ID) {
    return true;
  }
  for (const composition of [property.allOf, property.anyOf, property.oneOf]) {
    if (Array.isArray(composition) && composition.some(isRefProperty)) {
      return true;
    }
  }
  return property.type === 'array' && isRefProperty(property.items);
};

/**
 * Widens ref-valued parameters to also accept the envelope as a JSON *string*.
 *
 * A `Ref` serializes to a declaration schema (`$id: '/schemas/echo/ref'`) that carries no
 * `"type": "object"`, so nothing in the schema a model is shown says the value is structured — and
 * a model writing `input` by hand from that schema can perfectly reasonably send
 * `"{\"/\":\"echo:///01J…\"}"`. Without this the call fails on a decode error naming the
 * declaration rather than the string it actually got. The object form still decodes directly and
 * is unaffected.
 *
 * TODO(wittjosiah): Handle upstream. If ECHO's reference serialization declared `type: 'object'`
 * the schema would state the shape and this widening would not exist. Deferred: it changes
 * persisted schemas and older readers decode such a reference as a plain struct.
 */
export const tolerateStringifiedRefs = (fields: Fields, inputSchema: any): Fields => {
  const properties = inputSchema?.properties;
  if (properties == null) {
    return fields;
  }

  const widened: Record<string, Schema.Codec<any, any>> = { ...fields };
  for (const [name, field] of Object.entries(fields)) {
    if (!isRefProperty(properties[name])) {
      continue;
    }

    // An optional field arrives as a wrapper around the real schema. Widening it directly would
    // produce a required union and every call omitting the field would fail with
    // `Missing key at ["<name>"]`, so unwrap, widen, and re-apply the wrapper.
    const optional = isOptionalField(field);
    const schema = optional ? field.schema : field;

    const tolerant = Schema.Union([
      schema,
      Schema.String.pipe(
        Schema.decodeTo(schema, {
          decode: SchemaGetter.transformOrFail((text: string) =>
            Effect.try({
              try: () => JSON.parse(text),
              catch: () =>
                new SchemaIssue.InvalidValue({ message: 'Expected a reference envelope, or JSON encoding one' }, text),
            }),
          ),
          encode: SchemaGetter.transform((value) => JSON.stringify(value)),
        }),
      ),
    ]);

    widened[name] = optional ? Schema.optional(tolerant) : tolerant;
  }
  return widened;
};

/**
 * An optional field wraps the real schema, which is what the widening above must reach. Optionality
 * comes off the AST because other key modifiers (`Schema.mutableKey`) also expose `.schema`, and
 * treating one of those as optional would re-emit a required field as optional.
 */
const isOptionalField = (
  field: Schema.Codec<any, any>,
): field is Schema.Codec<any, any> & { readonly schema: Schema.Codec<any, any> } =>
  SchemaAST.isOptional(field.ast) && 'schema' in field && Schema.isSchema(field.schema);

const isStruct = (schema: Schema.Codec<any, any>): schema is Schema.Codec<any, any> & { readonly fields: Fields } =>
  'fields' in schema;

/** NSID of a registry key: `dxn:` prefix and `:<version>` tail stripped — the form ToolIds carry. */
const toNsid = (key: string): string => key.replace(/^dxn:/, '').replace(/:\d+\.\d+\.\d+$/, '');

/** The mutation class an annotation claims; an undecodable value claims nothing. */
const readMutation = (raw: unknown, key: string): Operation.Mutation | undefined =>
  raw == null
    ? undefined
    : Match.value(decodeMutation(raw)).pipe(
        Match.when({ _tag: 'Success' }, ({ success }) => success),
        Match.orElse(({ failure }) => {
          log.warn('mutation annotation did not decode; projecting without safety hints', {
            key,
            error: String(failure),
          });
          return undefined;
        }),
      );

/**
 * The two schemas a tool call travels through: `parameters` is what the model writes into (ref
 * fields widened to also accept a JSON string) and `wireSchema` is what those encode back through.
 * A non-object input yields neither — MCP has nowhere to put parameters that are not fields.
 */
const readInput = (inputSchema: unknown, key: string): { parameters: Fields; wireSchema?: Schema.Codec<any, any> } =>
  Match.value(inputSchema == null ? undefined : JsonSchema.toEffectSchema(inputSchema as any)).pipe(
    Match.when(Match.undefined, () => ({ parameters: {} })),
    Match.when(isStruct, (reconstructed) => ({
      parameters: tolerateStringifiedRefs(reconstructed.fields, inputSchema),
      wireSchema: reconstructed,
    })),
    Match.orElse(() => {
      log.warn('operation input schema is not an object; projected without parameters', { key });
      return { parameters: {} };
    }),
  );

/**
 * Projects registry records into catalog entries — driven by the projected skills.
 *
 * An operation projects iff a projected skill's `tools` list names it, and that membership is
 * reported on the entry as `skills` (the SEP-2640 shape: the model loads the named skill before
 * invoking); a tools entry naming no operation record projects nothing.
 *
 * Records arrive in wire form: `PersistentOperation` serializes with meta as a plain `@meta`
 * property carrying `key` and `annotations`, and with input/output as JSON Schema.
 */
export const projectOperations = (
  operations: readonly McpRegistry.OperationRecord[],
  skills: readonly ProjectedSkill[],
): ProjectedOperation[] => {
  // NSID → prompt names of the skills whose tools list it.
  const owners = new Map<string, string[]>();
  for (const skill of skills) {
    for (const tool of skill.tools) {
      const nsid = toNsid(tool);
      owners.set(nsid, [...(owners.get(nsid) ?? []), skill.promptName]);
    }
  }

  const projected: ProjectedOperation[] = [];
  // Records are JSON off the wire; each field is checked below rather than trusted from a type.
  for (const record of operations as Array<Record<string, any>>) {
    const meta = record?.['@meta'];
    const rawKey: unknown = meta?.key;
    if (typeof rawKey !== 'string' || rawKey.length === 0) {
      continue;
    }
    const owningSkills = owners.get(toNsid(rawKey));
    if (owningSkills == null) {
      continue;
    }

    const mutation = readMutation(meta?.annotations?.[Operation.MutationAnnotation.key], rawKey);
    const idempotent = meta?.annotations?.[Operation.IdempotentAnnotation.key] === true;

    const key = rawKey.replace(/^dxn:/, '');
    const { parameters, wireSchema } = readInput(record.inputSchema, key);

    projected.push({
      key,
      entry: {
        key,
        name: record.name,
        description: record.description,
        skills: owningSkills,
        requiresSpace: (record.services ?? []).includes(Database.Service.key),
        mutation,
        idempotent: idempotent ? true : undefined,
        inputSchema: record.inputSchema,
        outputSchema: record.outputSchema,
      },
      parameters,
      wireSchema,
    });
  }

  return projected;
};

/**
 * Projects skill records into prompt descriptors. The prompt name derives from the skill key's
 * final segment (skills carry no explicit projection name yet); collisions fail loudly, same
 * contract as the tool projection.
 */
export const projectSkills = (
  skills: readonly McpRegistry.SkillRecord[],
  reservedNames: readonly string[],
): ProjectedSkill[] => {
  const projected: ProjectedSkill[] = [];
  for (const skill of skills) {
    // Opt-in, mirroring the tool projection: a skill written for an in-app chat runtime assumes
    // tools an MCP client does not have. Silence rather than a warning: not opting in is the
    // default, not a mistake.
    if (!skill.mcpPrompt) {
      continue;
    }
    if (!skill.key || !skill.instructions) {
      log.warn('skill has no key or instructions; not projected', { key: skill.key, name: skill.name });
      continue;
    }
    const promptName = skill.key.replace(/^dxn:/, '').split('.').at(-1) ?? '';
    if (!PROMPT_NAME_PATTERN.test(promptName)) {
      log.warn('projected prompt name violates the name constraint; skill skipped', { key: skill.key, promptName });
      continue;
    }
    projected.push({
      key: skill.key,
      promptName,
      description: skill.description ?? skill.name,
      instructions: skill.instructions,
      tools: skill.tools ?? [],
    });
  }

  assertUniquePromptNames(
    projected.map((skill) => ({ name: skill.promptName, source: skill.key })),
    reservedNames,
  );
  return projected;
};

/**
 * Two skills claiming one prompt name is an authorship error the contract wants surfaced loudly at
 * projection time, not resolved silently. `reservedNames` covers the host's static prompts.
 */
const assertUniquePromptNames = (
  claims: readonly { name: string; source: string }[],
  reservedNames: readonly string[],
): void => {
  const holders = new Map<string, string>(reservedNames.map((name) => [name, '<static prompt>']));
  for (const claim of claims) {
    const holder = holders.get(claim.name);
    if (holder !== undefined) {
      throw new Error(`MCP prompt name collision: '${claim.name}' claimed by both ${holder} and ${claim.source}.`);
    }
    holders.set(claim.name, claim.source);
  }
};
