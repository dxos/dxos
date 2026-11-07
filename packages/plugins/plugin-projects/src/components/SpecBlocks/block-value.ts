//
// Copyright 2026 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { useCallback, useSyncExternalStore } from 'react';

import { type BlockValue, decodeBlock, patchBlock } from '@dxos/deus/schema';

import { focusBlockEffect } from './block-commands.ts';
import { type BlockLocator, type SpecBlocks, blockListeners, findBlock, specBlocksField } from './spec-blocks-state.ts';

/** The spec's blocks in the editor's current state, re-read on each change. */
export const useSpecBlocks = (view: EditorView): SpecBlocks =>
  useSyncExternalStore(
    useCallback(
      (onChange: () => void) => {
        const listeners = view.plugin(blockListeners)?.listeners;
        const listener = () => onChange();
        listeners?.add(listener);
        return () => listeners?.delete(listener);
      },
      [view],
    ),
    () => view.state.field(specBlocksField),
  );

/** Rewrites the block a locator names as `change` returns it, changing only the source of the parts that differ. */
export const updateBlock = (view: EditorView, locator: BlockLocator, change: (value: BlockValue) => BlockValue) => {
  const blocks = view.state.field(specBlocksField);
  const block = findBlock(blocks, locator);
  const schema = block && blocks.schemas.get(block.kind);
  if (!block || !schema) {
    return;
  }
  const text = view.state.doc.toString();
  const changes = patchBlock(text, block, schema, change(decodeBlock(text, block, schema)));
  if (changes.length > 0) {
    view.dispatch({ changes, userEvent: 'input' });
  }
};

/** A name a block's header can carry: one line, with no colon, which would start its title. */
export const isBlockName = (name: string) => /^[^\s:][^\n:]*$/.test(name) && name.trim() === name;

/**
 * Renames the block a locator names, leaving references to it as they are. Its card is drawn anew under its new name,
 * which focuses `target` (a selector in the card) when given.
 */
export const renameBlock = (view: EditorView, locator: BlockLocator, name: string, target?: string) => {
  const block = findBlock(view.state.field(specBlocksField), locator);
  if (!block?.header.id || block.id === name || !isBlockName(name)) {
    return;
  }
  const { from, to } = block.header.id;
  const state = view.state.update({ changes: { from, to, insert: name } }).state;
  const renamed = state.field(specBlocksField).blocks.filter((other) => other.kind === block.kind && other.id === name);
  const index = renamed.findIndex((other) => other.header.from === block.header.from);
  view.dispatch({
    changes: { from, to, insert: name },
    effects: target === undefined ? [] : focusBlockEffect.of({ kind: block.kind, id: name, index, target }),
    userEvent: 'input',
  });
};
