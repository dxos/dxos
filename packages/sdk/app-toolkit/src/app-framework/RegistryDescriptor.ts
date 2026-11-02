//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import type * as Skill from '@dxos/compute/Skill';
import { JsonSchema, Obj, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';

import * as AppCapabilities from './AppCapabilities.ts';

/**
 * Spike: describes a plugin's registry items as a thin index plus one content-addressed JSON file per
 * item, so a reader that cannot run plugin code (the registry UI, an EDGE router, MCP discovery) can list
 * and describe them. See `agents/superpowers/specs/2026-10-29-registry-items-in-manifest.md`.
 */

export type Kind = 'type' | 'operation' | 'skill';

/** One row of the manifest's inline index: enough to list and route, never the definition itself. */
export type IndexEntry = {
  uri: string;
  kind: Kind;
  name?: string;
  /** Content hash of the descriptor; also its file name, so the file is immutable and cacheable forever. */
  hash: string;
  /** Path of the descriptor, relative to the manifest. */
  path: string;
};

/** The per-item file. Objects are ECHO JSON, root first, so `Obj.fromJSON` rehydrates them into a registry. */
export type Descriptor =
  | {
      kind: 'type';
      uri: string;
      typename: string;
      version: string;
      jsonSchema: unknown;
      /** JSON paths that change when the schema is decoded from this file and encoded again. */
      lossy: readonly string[];
    }
  | {
      kind: 'operation';
      uri: string;
      objects: readonly unknown[];
      /** Input fields whose schema serialized as `{}`: described, but not validatable from this file. */
      opaqueInputs: readonly string[];
    }
  | { kind: 'skill'; uri: string; objects: readonly unknown[] };

export type Items = {
  schemas?: readonly Type.AnyEntity[];
  operations?: readonly Operation.Definition.Any[];
  skills?: readonly Skill.Definition[];
};

/** A module a build has loaded: the capability identifiers it provides and the raw export of its body. */
export type LoadedModule = { id: string; provides: readonly string[]; body: unknown };

export type Result = {
  index: IndexEntry[];
  files: Record<string, string>;
  /** Modules whose items could not be read, with the reason; the build warns rather than fails. */
  skipped: { id: string; reason: string }[];
};

const DIRECTORY = 'registry';

/** The capabilities whose contributions are registry items: a build loads only these modules' bodies. */
export const identifiers: readonly string[] = [
  AppCapabilities.Schema.identifier,
  AppCapabilities.SkillDefinition.identifier,
  Capabilities.OperationHandler.identifier,
];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const digestOf = async (text: string): Promise<Uint8Array> =>
  new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

const hashOf = async (text: string): Promise<string> =>
  Array.from((await digestOf(text)).slice(0, 12), (byte) => byte.toString(16).padStart(2, '0')).join('');

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// A ULID-shaped object id derived from `seed`; the leading `0` keeps it inside the ULID range.
const stableId = async (seed: string): Promise<string> =>
  '0' + Array.from((await digestOf(seed)).slice(0, 25), (byte) => CROCKFORD[byte % 32]).join('');

/**
 * `Obj.make` mints a random id per object, so the same item would hash differently on every build.
 * Rewrites each object's id, and every reference to it, to one derived from the item's URI.
 */
const stabilize = async (uri: string, objects: readonly unknown[]): Promise<unknown[]> => {
  let source = JSON.stringify(objects);
  for (const [position, object] of objects.entries()) {
    if (isRecord(object) && typeof object.id === 'string') {
      source = source.replaceAll(object.id, await stableId(`${uri}#${position}`));
    }
  }
  return JSON.parse(source);
};

const opaqueFields = (schema: unknown): string[] => {
  const properties = isRecord(schema) && isRecord(schema.properties) ? schema.properties : {};
  return Object.entries(properties).flatMap(([name, value]) =>
    isRecord(value) && Object.keys(value).length === 0 ? [name] : [],
  );
};

// Paths where two JSON documents differ, so a reader knows which parts of a type do not survive decoding.
const differences = (left: unknown, right: unknown, path = ''): string[] => {
  if (JSON.stringify(left) === JSON.stringify(right)) {
    return [];
  }
  if (!isRecord(left) || !isRecord(right)) {
    return [path || '/'];
  }
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].flatMap((key) => differences(left[key], right[key], `${path}/${key}`));
};

// A one-member `anyOf` is its member: decoding re-wraps a tag literal that way without changing its meaning.
const normalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if (!isRecord(value)) {
    return value;
  }
  const { anyOf, ...rest } = value;
  if (Array.isArray(anyOf) && anyOf.length === 1 && isRecord(anyOf[0])) {
    return normalize({ ...rest, ...anyOf[0] });
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalize(child)]));
};

const lossOf = (jsonSchema: JsonSchema.JsonSchema): string[] => {
  try {
    const encoded = JSON.parse(JSON.stringify(jsonSchema));
    const decoded = JsonSchema.toEffectSchema(JsonSchema.JsonSchema.make(encoded));
    return differences(normalize(encoded), normalize(JSON.parse(JSON.stringify(JsonSchema.toJsonSchema(decoded)))));
  } catch (error) {
    return [`/ (decode failed: ${String(error)})`];
  }
};

const isSkillDefinition = (value: unknown): value is Skill.Definition =>
  isRecord(value) && typeof value.key === 'string' && typeof value.make === 'function';

// A body built with `Capability.makeModule`: its activate returns one contribution or an array of them.
const activate = (body: unknown): Promise<unknown[]> => {
  if (typeof body !== 'function') {
    return Promise.reject(new Error('module body is neither data nor a module function'));
  }
  return EffectEx.runPromise(Effect.scoped(Effect.suspend(() => body(undefined)))).then((result: unknown) =>
    Array.isArray(result) ? result : [result],
  );
};

const valuesOf = (contributions: readonly unknown[], identifier: string): unknown[] =>
  contributions.flatMap((contribution) =>
    isRecord(contribution) &&
    // A capability tag is a function, not a plain object.
    (typeof contribution.capability === 'function' || isRecord(contribution.capability)) &&
    'identifier' in contribution.capability &&
    contribution.capability.identifier === identifier &&
    Array.isArray(contribution.values)
      ? contribution.values
      : [],
  );

/**
 * Reads registry items from module bodies a build has loaded. Operations come from the contributed
 * {@link OperationHandlerSet}'s `definitions()`, which enumerates without loading a handler, so the
 * handler map stays the only place a plugin declares its operations.
 */
export const fromModules = async (modules: readonly LoadedModule[]): Promise<Result> => {
  const schemas: Type.AnyEntity[] = [];
  const operations: Operation.Definition.Any[] = [];
  const skills: Skill.Definition[] = [];
  const skipped: Result['skipped'] = [];
  for (const { id, provides, body } of modules) {
    try {
      const contributions =
        provides.includes(AppCapabilities.Schema.identifier) && Array.isArray(body)
          ? [{ capability: AppCapabilities.Schema, values: [body] }]
          : await activate(body);
      schemas.push(...valuesOf(contributions, AppCapabilities.Schema.identifier).flat().filter(Type.isType));
      skills.push(...valuesOf(contributions, AppCapabilities.SkillDefinition.identifier).filter(isSkillDefinition));
      operations.push(
        ...valuesOf(contributions, Capabilities.OperationHandler.identifier)
          .filter(OperationHandlerSet.isOperationHandlerSet)
          .flatMap((set) => set.definitions()),
      );
    } catch (error) {
      skipped.push({ id, reason: String(error) });
    }
  }
  const result = await describe({ schemas, operations, skills });
  const described = new Set(result.index.map(({ uri }) => uri));
  for (const operation of operations) {
    if (!described.has(String(operation.meta.key))) {
      skipped.push({ id: String(operation.meta.key), reason: 'operation schema cannot render as JSON Schema' });
    }
  }
  return { ...result, skipped };
};

/** Builds the index and descriptor files for one plugin's registry items. */
export const describe = async ({
  schemas = [],
  operations = [],
  skills = [],
}: Items): Promise<Omit<Result, 'skipped'>> => {
  const entries: { name?: string; descriptor: Descriptor }[] = await Promise.all([
    ...schemas.map((schema) => {
      const jsonSchema = JsonSchema.toJsonSchema(schema);
      return {
        descriptor: {
          kind: 'type' as const,
          uri: String(Type.getURI(schema)),
          typename: Type.getTypename(schema),
          version: Type.getVersion(schema),
          jsonSchema,
          lossy: lossOf(jsonSchema),
        },
      };
    }),
    ...Operation.serializable(operations).map(async (record) => {
      const uri = String(Operation.getKey(record));
      return {
        name: record.name,
        descriptor: {
          kind: 'operation' as const,
          uri,
          objects: await stabilize(uri, [Obj.toJSON(record)]),
          opaqueInputs: opaqueFields(record.inputSchema),
        },
      };
    }),
    ...skills.map(async (definition) => {
      const skill = definition.make();
      const uri = String(definition.key);
      // The instructions live in a separate `Text` object; ship it with the skill so the file stands alone.
      const text = skill.instructions.source.target;
      return {
        name: skill.name,
        descriptor: {
          kind: 'skill' as const,
          uri,
          objects: await stabilize(uri, [Obj.toJSON(skill), ...(text ? [Obj.toJSON(text)] : [])]),
        },
      };
    }),
  ]);

  const index: IndexEntry[] = [];
  const files: Record<string, string> = {};
  for (const { name, descriptor } of entries) {
    const source = JSON.stringify(descriptor);
    const hash = await hashOf(source);
    const path = `${DIRECTORY}/${hash}.json`;
    files[path] = source;
    index.push({ uri: descriptor.uri, kind: descriptor.kind, ...(name ? { name } : {}), hash, path });
  }
  return { index, files };
};
