//
// Copyright 2026 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { useCallback, useSyncExternalStore } from 'react';

import { type BlockValue, type FieldValue, decodeBlock, patchBlock } from '@dxos/deus/schema';

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

/** The block a locator names, decoded from the editor's current text; undefined once it is gone. */
export const readBlock = (view: EditorView, locator: BlockLocator): BlockValue | undefined => {
  const blocks = view.state.field(specBlocksField);
  const block = findBlock(blocks, locator);
  const schema = block && blocks.schemas.get(block.kind);
  return block && schema ? decodeBlock(view.state.doc.toString(), block, schema) : undefined;
};

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

/** A change that sets one field; `undefined` removes it. */
export const setField =
  (name: string, next: FieldValue | undefined) =>
  (value: BlockValue): BlockValue => ({ ...value, fields: { ...value.fields, [name]: next } });
