//
// Copyright 2026 DXOS.org
//

import { decodeBlock } from './codec.ts';
import { keyedFields } from './dialects.ts';
import { parseSourceBlocks } from './source.ts';
import { type BlockSchema, isSpecReference } from './types.ts';

/** One name a block's reference field holds: a block of the spec, or another spec when `spec` is set. */
export type BlockReference = {
  kind: string;
  /** The referring block's id. */
  key: string;
  field: string;
  /** The name as written. */
  target: string;
  spec: boolean;
};

/** Every name the `Ref<…>` fields of a spec's blocks hold, in document order: the edges a map draws and nesting reads. */
export const blockReferences = (text: string, schemas: ReadonlyMap<string, BlockSchema>): BlockReference[] =>
  parseSourceBlocks(text, { keyed: (kind) => keyedFields(schemas.get(kind)) }).flatMap((block) => {
    const schema = schemas.get(block.kind);
    if (!schema) {
      return [];
    }
    const value = decodeBlock(text, block, schema);
    return schema.fields.flatMap((field) => {
      const held = value.fields[field.name];
      if (field.type.kind !== 'ref' || value.raw.includes(field.name) || held === undefined) {
        return [];
      }
      const targets = (typeof held === 'string' ? [held] : (held as readonly string[])).filter(Boolean);
      return targets.map((target) => ({
        kind: block.kind,
        key: block.id,
        field: field.name,
        target,
        spec: isSpecReference(field),
      }));
    });
  });

/** A citation of a spec or one of its items: `echo://<space>/<id>`, `echo:///<id>` or a spec id, with `#<item>`. */
export const parseCitation = (value: string): { spec: string; item?: string } => {
  const [head, item] = value.trim().split('#', 2);
  const spec = head.replace(/^echo:\/\/[^/]*\//, '');
  return { spec, ...(item && { item }) };
};
