//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as SchemaGetter from 'effect/SchemaGetter';
import * as SchemaIssue from 'effect/SchemaIssue';

import { JsonSchema } from '@dxos/echo';
import { log } from '@dxos/log';

import type * as Gateway from '../Gateway';

/**
 * Annotation id under which `Operation.mcpTool` persists the projection descriptor.
 *
 * Declared here rather than imported from `@dxos/compute` so a host bundling this package does not
 * also bundle the operation runtime; `Projection.test.ts` fails if the two definitions drift.
 */
export const MCP_TOOL_ANNOTATION_ID = 'org.dxos.operation.mcp-tool';

/**
 * Anthropic tool-name constraint. The 64-char budget is shared with the client's
 * `mcp__<server>__` prefix, which is why fully-qualified operation keys cannot be tool names
 * (they also carry dots) — names default to the key's final segment instead.
 */
const TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/** Same constraint as tool names; prompt names surface as `/mcp__<server>__<name>`. */
const PROMPT_NAME_PATTERN = TOOL_NAME_PATTERN;

/** Wire form of `Operation.McpTool`, with `name` optional (defaults to the key's final segment). */
const McpToolAnnotation = Schema.Struct({
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  safety: Schema.Literals(['read', 'write', 'destructive']),
  aspect: Schema.optional(Schema.String),
  /** Prompt name of the skill whose workflow this tool belongs to; see {@link skillPointer}. */
  skill: Schema.optional(Schema.String),
});

const decodeAnnotation = Schema.decodeUnknownResult(McpToolAnnotation);

export type Safety = 'read' | 'write' | 'destructive';

/**
 * Tool parameter fields. Narrower than `Schema.Struct.Fields`: schemas rebuilt from JSON Schema
 * carry no decoding or encoding services, and saying so keeps the tool handlers' requirement
 * channel empty.
 */
export type Fields = { readonly [key: string]: Schema.Codec<any, any> };

export type ProjectedOperation = {
  /** Operation key without the `dxn:` prefix — the form the gateway dispatches on. */
  key: string;
  toolName: string;
  description?: string;
  safety: Safety;
  /** Tool parameters reconstructed from the operation's serialized input schema. */
  parameters: Fields;
  /**
   * The reconstructed input schema, kept for re-encoding: the tool layer *decodes* arguments
   * (ref envelopes become live `Ref`s), but the gateway needs the wire form back — live refs do
   * not survive an RPC boundary.
   */
  inputSchema?: Schema.Codec<any, any>;
};

export type ProjectedSkill = {
  /** Registry key of the skill definition. */
  key: string;
  promptName: string;
  description?: string;
  instructions: string;
};

/**
 * The load-the-skill-first pointer appended to a governed tool's description.
 *
 * The workflow's rules live in a skill the model has usually not loaded — prompts are
 * user-controlled by specification, so the model cannot fetch one itself — and the tool
 * description is the one piece of server text guaranteed in front of the model at the moment it
 * chooses to call the tool. Anthropic's tool-writing guidance makes descriptions the primary
 * behavioral lever (https://www.anthropic.com/engineering/writing-tools-for-agents), and the
 * `skillLoad` hop this points into is the shape of the MCP Skills-over-MCP extension (SEP-2640).
 */
const skillPointer = (skill: string): string =>
  `Part of the '${skill}' workflow — call skillLoad('${skill}') and follow its instructions before ` +
  'first use, unless they are already in context.';

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
 * `"type": "object"`. Clients deciding which arguments are structured key off that keyword, so a
 * ref argument reaches us JSON-stringified — `"{\"/\":\"echo:///01J…\"}"` — and the tool layer
 * rejects the whole call with a parameter decode failure that names the declaration rather than
 * the string it actually got. Accepting both forms keeps the projection working whatever the
 * client decides, which is the only part of this we control; the object form still decodes
 * directly and is unaffected.
 *
 * TODO(wittjosiah): Handle upstream — see `Wire.widenEchoRefSchemas`. If ECHO's reference
 * serialization declared `type: 'object'`, clients would send the envelope structured and neither
 * this widening nor the narrowing that undoes it on the wire would exist. Deferred: it changes
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

/** An optional field wraps the real schema, which is what the widening above must reach. */
const isOptionalField = (
  field: Schema.Codec<any, any>,
): field is Schema.Codec<any, any> & { readonly schema: Schema.Codec<any, any> } =>
  'schema' in field && Schema.isSchema(field.schema);

const isStruct = (schema: Schema.Codec<any, any>): schema is Schema.Codec<any, any> & { readonly fields: Fields } =>
  'fields' in schema;

/**
 * Projects registry records into tool descriptors.
 *
 * Records arrive in wire form: `PersistentOperation` serializes with meta as a plain `@meta`
 * property carrying `key` and `annotations`, and with input/output as JSON Schema. Only records
 * carrying the MCP annotation project; everything else in the registry stays invisible to MCP
 * clients.
 *
 * Name collisions throw: two operations claiming one tool name is an authorship error the contract
 * wants surfaced loudly at projection time, not resolved silently. `reservedNames` covers the
 * host's statically-defined tools.
 */
export const projectOperations = (
  operations: readonly Gateway.OperationRecord[],
  reservedNames: readonly string[],
): ProjectedOperation[] => {
  const projected: ProjectedOperation[] = [];
  // Records are JSON off the wire; each field is checked below rather than trusted from a type.
  for (const record of operations as Array<Record<string, any>>) {
    const meta = record?.['@meta'];
    const rawKey: unknown = meta?.key;
    const rawAnnotation: unknown = meta?.annotations?.[MCP_TOOL_ANNOTATION_ID];
    if (typeof rawKey !== 'string' || rawKey.length === 0 || rawAnnotation == null) {
      continue;
    }
    const decoded = decodeAnnotation(rawAnnotation);
    if (decoded._tag === 'Failure') {
      log.warn('mcp-tool annotation did not decode; operation skipped', {
        key: rawKey,
        error: String(decoded.failure),
      });
      continue;
    }
    const key = rawKey.replace(/^dxn:/, '');
    const toolName = decoded.success.name ?? key.split('.').at(-1) ?? '';
    if (!TOOL_NAME_PATTERN.test(toolName)) {
      log.warn('projected tool name violates the tool-name constraint; operation skipped', { key, toolName });
      continue;
    }

    let parameters: Fields = {};
    let inputSchema: Schema.Codec<any, any> | undefined;
    if (record.inputSchema != null) {
      const reconstructed = JsonSchema.toEffectSchema(record.inputSchema);
      if (isStruct(reconstructed)) {
        parameters = tolerateStringifiedRefs(reconstructed.fields, record.inputSchema);
        inputSchema = reconstructed;
      } else {
        log.warn('operation input schema is not an object; projected without parameters', { key });
      }
    }

    const baseDescription = decoded.success.description ?? record.description ?? record.name;
    const description =
      decoded.success.skill == null
        ? baseDescription
        : [baseDescription, skillPointer(decoded.success.skill)].filter(Boolean).join(' ');

    projected.push({
      key,
      toolName,
      description,
      safety: decoded.success.safety,
      parameters,
      inputSchema,
    });
  }

  assertUniqueNames(
    projected.map((operation) => ({ name: operation.toolName, source: operation.key })),
    reservedNames,
    'tool',
  );
  return projected;
};

/**
 * Projects skill records into prompt descriptors. The prompt name derives from the skill key's
 * final segment (skills carry no explicit projection name yet); collisions fail loudly, same
 * contract as the tool projection.
 */
export const projectSkills = (
  skills: readonly Gateway.SkillRecord[],
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
    });
  }

  assertUniqueNames(
    projected.map((skill) => ({ name: skill.promptName, source: skill.key })),
    reservedNames,
    'prompt',
  );
  return projected;
};

const assertUniqueNames = (
  claims: readonly { name: string; source: string }[],
  reservedNames: readonly string[],
  kind: 'tool' | 'prompt',
): void => {
  const holders = new Map<string, string>(reservedNames.map((name) => [name, `<static ${kind}>`]));
  for (const claim of claims) {
    const holder = holders.get(claim.name);
    if (holder !== undefined) {
      throw new Error(
        `MCP ${kind} name collision: '${claim.name}' claimed by both ${holder} and ${claim.source}.` +
          (kind === 'tool' ? ' Set an explicit `name` in the mcpTool annotation of one of them.' : ''),
      );
    }
    holders.set(claim.name, claim.source);
  }
};
