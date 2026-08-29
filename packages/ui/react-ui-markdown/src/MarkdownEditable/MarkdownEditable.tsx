//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useRef } from 'react';

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
    /**
     * A field that holds paragraphs rather than a line: `Enter` stays a newline, so leaving the
     * field is what commits.
     */
    multiline?: boolean;
    /**
     * Whether opening the editor takes focus. True for click-to-edit, where the reader just asked
     * for it; false for a field held open in a pane, which would otherwise pull focus away from
     * whatever the reader is actually driving.
     */
    autoFocus?: boolean;
  }
>;

export const MarkdownEditable = ({
  classNames,
  placeholder,
  components,
  readonly,
  multiline,
  autoFocus = true,
  ...options
}: MarkdownEditableProps) => {
  const { value, draft, editing, setDraft, commit, revert, previewProps } = useEditable({
    ...options,
    disabled: options.disabled || readonly,
  });

  // Held in a ref, and the extensions built once: `commit` closes over the draft, so it is a new
  // function on every keystroke — and a new extensions array tears the editor down and builds it
  // again, losing focus and the character just typed.
  const handlers = useRef({ setDraft, commit, revert });
  handlers.current = { setDraft, commit, revert };

  const commitOnBlur = options.blurBehavior !== 'revert';
  const extensions = useMemo(
    () => [
      createMarkdownExtensions(),
      decorateMarkdown(),
      inlineEdit({
        onCommit: (text) => {
          handlers.current.setDraft(text);
          handlers.current.commit();
        },
        onRevert: () => handlers.current.revert(),
        commitOnBlur,
        submitOnEnter: !multiline,
      }),
    ],
    [commitOnBlur, multiline],
  );

  if (editing) {
    // Wrapped rather than styled directly: `TextEditor` forwards its rest props to the editor's
    // config, not to the DOM, and the preview is a box of the same kind — so the two match.
    return (
      // CodeMirror insets its own content, which would sit the text further in than the preview it
      // replaced; the field owns its inset, so the editor's is removed.
      <div
        data-testid='markdownEditable.editor'
        className={mx('w-full [&_.cm-content]:!p-0 [&_.cm-line]:!px-0', classNames)}
      >
        {/* `initialValue`, not a controlled value: the editor owns its document once open, and
            feeding `draft` back in on every keystroke would fight the cursor. */}
        <TextEditor
          initialValue={draft}
          onChange={(text) => handlers.current.setDraft(text)}
          extensions={extensions}
          autoFocus={autoFocus}
          selectionEnd
        />
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
