//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Spec from '@dxos/compute/Spec';
import {
  type FieldValue,
  SOFTWARE_DIALECT,
  applyChanges,
  decodeBlock,
  patchBlock,
  printBlock,
  resolveBlockSchemas,
  specItems,
} from '@dxos/deus/schema';
import { DXN, Obj, Relation, Type } from '@dxos/echo';
import { Task } from '@dxos/types';

/** A task that delivers one item of a spec: a block, or one keyed line of one, named by its key. */
export class Implements extends Type.makeRelation<Implements>(DXN.make('org.dxos.relation.implementsItem', '0.1.0'))({
  source: Task.Task,
  target: Spec.Spec,
})(Schema.Struct({ id: Obj.ID, item: Schema.String })) {}

export const makeImplements = (props: Relation.MakeProps<typeof Implements>) => Relation.make(Implements, props);

/** A spec item link: `echo:///<spec>#<key>`. */
export const citation = (spec: Spec.Spec, key: string): string => `echo:///${spec.id}#${key}`;

/** A `feat` block as a seed writes it; `key` is its block id. */
export type FeatureBlock = {
  key: string;
  title: string;
  prose?: string;
  fields?: Record<string, FieldValue>;
};

/**
 * `content` with each feature's `feat` block set: a block the text states is patched in place, its other fields kept;
 * any other is appended.
 */
export const writeFeatures = (content: string, features: readonly FeatureBlock[]): string => {
  const schemas = resolveBlockSchemas(content, { dialects: ['org.dxos.spec.core', SOFTWARE_DIALECT] });
  const schema = schemas.get('feat')!;
  let text = content;
  for (const { key, title, prose, fields = {} } of features) {
    const item = specItems(text, schemas).find((item) => !item.entry && item.kind === 'feat' && item.key === key);
    if (item) {
      const value = decodeBlock(text, item.block, schema);
      text = applyChanges(
        text,
        patchBlock(text, item.block, schema, { ...value, title, fields: { ...value.fields, ...fields } }),
      );
    } else {
      const head = text.replace(/\n*$/, '');
      text = `${head ? `${head}\n\n` : ''}${printBlock(schema, key, { title, ...(prose && { prose }), fields })}\n`;
    }
  }
  return text;
};
