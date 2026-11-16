//
// Copyright 2026 DXOS.org
//

import { type ChangeSet, type EditorState, type Extension, Facet, MapMode, StateField } from '@codemirror/state';
import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { type BlockSchema, type DialectRegistry, type SourceBlock, type SpecItem, specItems } from '@dxos/deus/schema';

import type * as ProjectCapabilities from '../../types/ProjectCapabilities.ts';
import { specSchemas } from '../../util/spec-schemas.ts';
import { type SharedAwareness } from './shared-awareness.ts';

export type SpecBlocksConfig = {
  /** The dialects the spec uses besides those its front matter extends. */
  dialects: readonly string[];
  /** Where dialect ids resolve; the language's own dialects without it. */
  registry?: DialectRegistry;
  /** Draws each block as its card; without it the blocks stay text, and only their commands are offered. */
  cards?: boolean;
  readonly?: boolean;
  /** The spec editor's presence channel, which the field editors publish on. */
  awareness?: SharedAwareness;
  /** Added to each field editor, bound to the spec's text through the field: comments on the part, for one. */
  fieldExtensions?: Extension[];
  /** The specs a `Ref<spec>` field may cite, read when its picker draws. */
  specs?: () => readonly SpecOption[];
  /** A style per value of a choice field, by field name, from the spec's packages: a feature's status, for one. */
  facts?: ProjectCapabilities.SpecFacts;
};

/** A spec a `Ref<spec>` field may cite, by object id. */
export type SpecOption = { id: string; name: string };

export const specBlocksConfig = Facet.define<SpecBlocksConfig, SpecBlocksConfig>({
  combine: (values) => values[0] ?? { dialects: [] },
});

/** The spec's blocks as its current text states them. */
export type SpecBlocks = {
  schemas: ReadonlyMap<string, BlockSchema>;
  blocks: readonly SourceBlock[];
  /** Blocks and their keyed lines, with their positional labels. */
  items: readonly SpecItem[];
  /** Each block's handle, by its index in `blocks`. */
  handles: readonly string[];
  /** The count of handles given out, so a new one is never one given before. */
  minted: number;
};

/**
 * Which block a card shows: a handle the editor gives the block, kept while edits move it or rewrite its header, so a card
 * follows its block through a rename. It is never written to the text.
 */
export type BlockLocator = { handle: string };

const read = (state: EditorState): Omit<SpecBlocks, 'handles' | 'minted'> => {
  const text = state.doc.toString();
  const { dialects, registry } = state.facet(specBlocksConfig);
  const schemas = specSchemas(text, dialects, registry);
  const items = specItems(text, schemas);
  return { schemas, items, blocks: [...new Set(items.map(({ block }) => block))] };
};

/**
 * Gives each block the handle of the block whose opening fence the changes moved to its own, and a new one otherwise. A
 * fence whose first character was deleted is a block gone.
 */
const keep = (before: SpecBlocks, changes: ChangeSet | undefined, next: Omit<SpecBlocks, 'handles' | 'minted'>) => {
  const moved = new Map<number, string>();
  before.blocks.forEach((block, index) => {
    const at = changes ? changes.mapPos(block.fence.from, 1, MapMode.TrackAfter) : block.fence.from;
    if (at !== null && !moved.has(at)) {
      moved.set(at, before.handles[index]);
    }
  });
  let minted = before.minted;
  const handles = next.blocks.map((block) => moved.get(block.fence.from) ?? `block-${minted++}`);
  return { ...next, handles, minted };
};

export const specBlocksField = StateField.define<SpecBlocks>({
  create: (state) =>
    keep({ schemas: new Map(), blocks: [], items: [], handles: [], minted: 0 }, undefined, read(state)),
  update: (value, transaction) =>
    transaction.docChanged ||
    transaction.startState.facet(specBlocksConfig) !== transaction.state.facet(specBlocksConfig)
      ? keep(value, transaction.changes, read(transaction.state))
      : value,
});

/** The block a locator names. */
export const findBlock = ({ blocks, handles }: SpecBlocks, { handle }: BlockLocator): SourceBlock | undefined =>
  blocks[handles.indexOf(handle)];

/** The handle the editor gives a block. */
export const handleOf = ({ blocks, handles }: SpecBlocks, block: SourceBlock): string | undefined =>
  handles[blocks.indexOf(block)];

/** The positional label of a block or of one of its keyed lines. */
export const labelOf = ({ items }: SpecBlocks, block: SourceBlock, key?: string): string | undefined =>
  items.find((item) => item.block === block && (key === undefined ? !item.entry : item.entry?.key === key))?.label;

/** Calls its listeners on each update of the spec editor, for the cards and field editors drawn in it. */
export const blockListeners = ViewPlugin.fromClass(
  class {
    readonly listeners = new Set<(update: ViewUpdate) => void>();

    constructor(view: EditorView) {
      const { awareness } = view.state.facet(specBlocksConfig);
      if (awareness) {
        awareness.view = view;
      }
    }

    update(update: ViewUpdate) {
      this.listeners.forEach((listener) => listener(update));
    }
  },
);
