//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { type FieldValue, applyChanges, decodeBlock, fieldOf, mintKey, patchBlock } from '@dxos/deus/schema';

import { ProjectOperation } from '#types';

import {
  SpecBlockError,
  coerceField,
  cutFence,
  findBlock,
  loadDocument,
  placeFence,
  readDocument,
  writeContent,
} from './spec-block.ts';

const handler: Operation.WithHandler<typeof ProjectOperation.SetSpecBlock> = ProjectOperation.SetSpecBlock.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const fail = (message: string) => Effect.fail(new SpecBlockError({ message }));
      const { spec, document } = yield* loadDocument(input.spec);
      const existing = input.block ? findBlock(document, input.block) : undefined;
      const kind = input.kind ?? existing?.kind;
      if (!kind) {
        return yield* fail(input.block ? `No block ${input.block}.` : 'Name a block or a kind.');
      }
      if (existing && existing.kind !== kind) {
        return yield* fail(`${input.block} is a ${existing.kind} block, not ${kind}.`);
      }
      const schema = document.schemas.get(kind);
      if (!schema) {
        return yield* fail(`No block kind ${kind} in this spec's dialects.`);
      }

      // Place the block: a new one as its header alone, a moved one cut and set down again.
      const taken = new Set(document.items.map(({ key }) => key));
      const mint = () => {
        const key = mintKey(taken);
        taken.add(key);
        return key;
      };
      let placed: { content: string; from: number } | string;
      if (!existing) {
        const id = input.block ?? (schema.label ? mint() : '');
        placed = placeFence(document, ['```mdl', `${kind}${id ? ` ${id}` : ''}`, '```'].join('\n'), kind, input.after);
      } else if (input.after !== undefined) {
        if (input.after && findBlock(document, input.after) === existing) {
          return yield* fail(`${input.block} cannot follow itself.`);
        }
        const { fence } = existing.block;
        const rest = readDocument(spec, document.text, cutFence(document.content, fence));
        placed = placeFence(rest, document.content.slice(fence.from, fence.to), kind, input.after);
      } else {
        placed = { content: document.content, from: existing.block.fence.from };
      }
      if (typeof placed === 'string') {
        return yield* fail(placed);
      }

      const { from } = placed;
      const current = readDocument(spec, document.text, placed.content);
      const item = current.items.find((item) => !item.entry && item.block.fence.from === from)!;
      const before = decodeBlock(current.content, item.block, schema);
      const fields: Record<string, FieldValue | undefined> = { ...before.fields };
      for (const [name, value] of Object.entries(input.fields ?? {})) {
        const field = fieldOf(schema, name);
        if (!field) {
          return yield* fail(`${kind} has no field ${name}.`);
        }
        if (value === null) {
          fields[name] = undefined;
          continue;
        }
        const next = coerceField(field, value, before.raw.includes(name), mint);
        if ('problem' in next) {
          return yield* fail(next.problem);
        }
        fields[name] = next.value;
      }
      const changes = patchBlock(current.content, item.block, schema, {
        ...before,
        ...(input.title !== undefined && { title: input.title }),
        ...(input.prose !== undefined && { prose: input.prose }),
        fields,
      });
      const content = applyChanges(current.content, changes);
      if (content !== document.content) {
        writeContent(document.text, content);
      }

      const written = readDocument(spec, document.text, content).items.find(
        (item) => !item.entry && item.block.fence.from === from,
      )!;
      return { key: written.key, ...(written.label && { label: written.label }) };
    }),
  ),
);

export default handler;
