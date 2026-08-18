//
// Copyright 2026 DXOS.org
//

import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React, { useLayoutEffect, useRef } from 'react';

import { type Message } from '@dxos/types';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';

import { MarkdownBlock } from '../components';

/**
 * Controls for attributing what a row costs to mount.
 *
 * `baseline/mount` measures a whole feed with its fixtures already built and finds ~2ms for a row
 * with no editor against ~15ms for a row with one — while the same editor constructed into an
 * offscreen container costs 0.4ms (`baseline/construction`). These render the *same* rows through
 * the same chrome, differing only in what is inside them, so the gap can be attributed rather than
 * argued about.
 */
export type ControlContent = { data?: unknown };

/** The floor: the row's text, and no editor at all. */
export const TextItem = ({ content }: { content: ControlContent; message: Message.Message }) => (
  <p className='py-1 text-sm'>{String(content.data ?? '')}</p>
);

/** An editor with nothing but wrapping: no theme, no keymap, no markdown, no decoration. */
const BARE: Extension[] = [EditorView.editable.of(false), EditorState.readOnly.of(true), EditorView.lineWrapping];

/** Wrapping plus the theme — the extension the isolated profile shows to be nearly free. */
const THEMED: Extension[] = [
  createBasicExtensions({ readOnly: true, editable: false, lineWrapping: true }),
  createThemeExtensions({ themeMode: 'light' }),
];

/** The theme plus the markdown language: parsing, but nothing rendered from what it parsed. */
const MARKDOWN: Extension[] = [...THEMED, createMarkdownExtensions()];

/** Everything the item has bar its highlight layer — headings, lists and links drawn as themselves. */
const DECORATED: Extension[] = [...MARKDOWN, decorateMarkdown()];

export const BareEditorItem = ({ content }: { content: ControlContent; message: Message.Message }) => (
  <ProbeEditor text={String(content.data ?? '')} extensions={BARE} />
);

export const ThemedEditorItem = ({ content }: { content: ControlContent; message: Message.Message }) => (
  <ProbeEditor text={String(content.data ?? '')} extensions={THEMED} />
);

export const MarkdownEditorItem = ({ content }: { content: ControlContent; message: Message.Message }) => (
  <ProbeEditor text={String(content.data ?? '')} extensions={MARKDOWN} />
);

export const DecoratedEditorItem = ({ content }: { content: ControlContent; message: Message.Message }) => (
  <ProbeEditor text={String(content.data ?? '')} extensions={DECORATED} />
);

/**
 * The real item, reached the same way the probes are.
 *
 * The rung that separates *what the editor is configured with* from *what the component does around
 * it*: everything outside this component is identical to `uniform-decorated`.
 */
export const MarkdownProbeItem = ({ content }: { content: ControlContent; message: Message.Message }) => (
  <MarkdownBlock text={String(content.data ?? '')} />
);

/**
 * A deliberate copy of `MarkdownBlock`'s construction, reduced to the part being measured.
 *
 * Copied rather than shared: the point of a control is that it does not change when the thing it is
 * a control for does.
 */
const ProbeEditor = ({ text, extensions }: { text: string; extensions: Extension[] }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const parent = rootRef.current;
    if (!parent) {
      return;
    }

    const view = new EditorView({ parent, state: EditorState.create({ doc: text, extensions }) });
    return () => view.destroy();
  }, [text, extensions]);

  return <div ref={rootRef} />;
};
