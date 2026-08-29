//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type ThemedClassName, type UseEditableOptions, useEditable } from '@dxos/react-ui';
import { TextEditor } from '@dxos/react-ui-editor';
import { createMarkdownExtensions, decorateMarkdown, inlineEdit } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { MarkdownView, type MarkdownViewProps } from '../MarkdownView';

/**
 * Rendered markdown that becomes a markdown editor in place.
 *
 * The behaviour is `react-ui`'s `useEditable` — the same commit/revert rules the plain `Editable`
 * follows — with the two surfaces markdown needs: `MarkdownView` at rest and a CodeMirror editor
 * while editing. It lives here rather than in `react-ui` because both surfaces depend on packages
 * that depend on `react-ui`.
 *
 * The value is markdown SOURCE either way: what the reader edits is what the preview renders.
 */
export type MarkdownEditableProps = ThemedClassName<
  UseEditableOptions & {
    /** Shown, dimmed, when the value is empty. */
    placeholder?: string;
    /** Renderers for the preview, as `MarkdownView` takes them. */
    components?: MarkdownViewProps['components'];
    /** Renders as plain markdown with no affordance to edit. */
    readonly?: boolean;
  }
>;

export const MarkdownEditable = ({
  classNames,
  placeholder,
  components,
  readonly,
  ...options
}: MarkdownEditableProps) => {
  const { value, draft, editing, setDraft, commit, revert, previewProps } = useEditable({
    ...options,
    disabled: options.disabled || readonly,
  });

  const extensions = useMemo(
    () => [
      createMarkdownExtensions(),
      decorateMarkdown(),
      inlineEdit({
        onCommit: (text) => {
          setDraft(text);
          commit();
        },
        onRevert: revert,
        commitOnBlur: options.blurBehavior !== 'revert',
      }),
    ],
    // The extension closes over the current draft's handlers, so it is rebuilt when they change —
    // which is per commit, not per keystroke.
    [setDraft, commit, revert, options.blurBehavior],
  );

  if (editing) {
    // Wrapped rather than styled directly: `TextEditor` forwards its rest props to the editor's
    // config, not to the DOM, and the preview is a box of the same kind — so the two match.
    return (
      <div data-testid='markdownEditable.editor' className={mx('w-full', classNames)}>
        <TextEditor value={draft} onChange={setDraft} extensions={extensions} autoFocus selectionEnd />
      </div>
    );
  }

  return (
    <div
      {...(readonly ? {} : previewProps)}
      data-testid='markdownEditable.preview'
      className={mx('w-full', !readonly && 'cursor-text', classNames)}
    >
      <MarkdownView content={value || placeholder} components={components} />
    </div>
  );
};

MarkdownEditable.displayName = 'MarkdownEditable';
