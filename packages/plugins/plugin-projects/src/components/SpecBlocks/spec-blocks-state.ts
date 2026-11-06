//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, Facet, StateField } from '@codemirror/state';
import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import {
  type BlockSchema,
  type DialectRegistry,
  type SourceBlock,
  type SpecItem,
  parseDialectHeader,
  resolveBlockSchemas,
  scanBlocks,
  specItems,
} from '@dxos/deus/schema';

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
};

export const specBlocksConfig = Facet.define<SpecBlocksConfig, SpecBlocksConfig>({
  combine: (values) => values[0] ?? { dialects: [] },
});

/** The spec's blocks as its current text states them. */
export type SpecBlocks = {
  schemas: ReadonlyMap<string, BlockSchema>;
  blocks: readonly SourceBlock[];
  /** Blocks and their keyed lines, with their positional labels. */
  items: readonly SpecItem[];
  /** What the schemas were resolved from: the front matter and the spec's own `ext` blocks. */
  source: string;
};

/** Which block a card shows: the nth block of a kind and id, so a card follows its block across edits. */
export type BlockLocator = { kind: string; id: string; index: number };

const CORE_DIALECT = 'org.dxos.spec.core';

const schemaSource = (text: string, dialects: readonly string[]) =>
  [
    dialects.join(','),
    text.match(/^---\n[\s\S]*?\n---/)?.[0] ?? '',
    ...scanBlocks(text)
      .map(({ from, to }) => text.slice(from, to))
      .filter((block) => /^\s*ext\b/.test(block)),
  ].join('\0');

const read = (state: EditorState, previous?: SpecBlocks): SpecBlocks => {
  const text = state.doc.toString();
  const { dialects, registry } = state.facet(specBlocksConfig);
  const source = schemaSource(text, dialects);
  const schemas =
    previous?.source === source
      ? previous.schemas
      : resolveBlockSchemas(text, {
          dialects: [...new Set([CORE_DIALECT, ...parseDialectHeader(text).extends, ...dialects])],
          registry,
        });
  const items = specItems(text, schemas);
  return { schemas, items, blocks: [...new Set(items.map(({ block }) => block))], source };
};

export const specBlocksField = StateField.define<SpecBlocks>({
  create: (state) => read(state),
  update: (value, transaction) =>
    transaction.docChanged ||
    transaction.startState.facet(specBlocksConfig) !== transaction.state.facet(specBlocksConfig)
      ? read(transaction.state, value)
      : value,
});

/** The block a locator names. */
export const findBlock = ({ blocks }: SpecBlocks, { kind, id, index }: BlockLocator): SourceBlock | undefined =>
  blocks.filter((block) => block.kind === kind && block.id === id)[index];

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
