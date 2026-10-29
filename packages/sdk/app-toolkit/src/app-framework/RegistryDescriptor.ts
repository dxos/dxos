//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import type * as Skill from '@dxos/compute/Skill';
import { JsonSchema, Obj, Type } from '@dxos/echo';

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
  | { kind: 'type'; uri: string; typename: string; version: string; jsonSchema: unknown }
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

export type Result = { index: IndexEntry[]; files: Record<string, string> };

const DIRECTORY = 'registry';

const hashOf = async (text: string): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest).slice(0, 12), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const opaqueFields = (schema: unknown): string[] => {
  const properties =
    typeof schema === 'object' && schema !== null && 'properties' in schema ? schema.properties : undefined;
  if (typeof properties !== 'object' || properties === null) {
    return [];
  }
  return Object.entries(properties).flatMap(([name, value]) =>
    typeof value === 'object' && value !== null && Object.keys(value).length === 0 ? [name] : [],
  );
};

/** Builds the index and descriptor files for one plugin's registry items. */
export const describe = async ({ schemas = [], operations = [], skills = [] }: Items): Promise<Result> => {
  const entries: { name?: string; descriptor: Descriptor }[] = [
    ...schemas.map((schema) => ({
      descriptor: {
        kind: 'type' as const,
        uri: String(Type.getURI(schema)),
        typename: Type.getTypename(schema),
        version: Type.getVersion(schema),
        jsonSchema: JsonSchema.toJsonSchema(schema),
      },
    })),
    ...Operation.serializable(operations).map((record) => ({
      name: record.name,
      descriptor: {
        kind: 'operation' as const,
        uri: String(Operation.getKey(record)),
        objects: [Obj.toJSON(record)],
        opaqueInputs: opaqueFields(record.inputSchema),
      },
    })),
    ...skills.map((definition) => {
      const skill = definition.make();
      // The instructions live in a separate `Text` object; ship it with the skill so the file stands alone.
      const text = skill.instructions.source.target;
      return {
        name: skill.name,
        descriptor: {
          kind: 'skill' as const,
          uri: String(definition.key),
          objects: [Obj.toJSON(skill), ...(text ? [Obj.toJSON(text)] : [])],
        },
      };
    }),
  ];

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
