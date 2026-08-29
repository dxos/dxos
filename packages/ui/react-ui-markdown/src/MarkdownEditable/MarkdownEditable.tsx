//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { type ThemedClassName, type UseEditableOptions, useEditable, useThemeContext } from '@dxos/react-ui';
import { TextEditor } from '@dxos/react-ui-editor';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  fullWidth,
  inlineEdit,
} from '@dxos/ui-editor';
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

/**
 * Drives a field held open in a pane, where the reader never blurs it — a Save or Cancel button
 * elsewhere on the form has to say what happens to the pending text.
 */
export type MarkdownEditableController = {
  /** Writes the pending text, as leaving the field would. */
  commit: () => void;
  /** Restores the last committed text, as `Escape` would. */
  revert: () => void;
};

/**
 * Rendered markdown that becomes a markdown editor in place. Pair it with `editing` held open to
 * make an editor pane, or leave it uncontrolled for click-to-edit.
 */
export const MarkdownEditable = forwardRef<MarkdownEditableController, MarkdownEditableProps>(
  (
    { classNames, placeholder, components, readonly, multiline, autoFocus = true, ...options }: MarkdownEditableProps,
    forwardedRef,
  ) => {
    const { value, draft, editing, setDraft, commit, revert, previewProps } = useEditable({
      ...options,
      disabled: options.disabled || readonly,
    });

    // Held in a ref, and the extensions built once: `commit` closes over the draft, so it is a new
    // function on every keystroke — and a new extensions array tears the editor down and builds it
    // again, losing focus and the character just typed.
    const handlers = useRef({ setDraft, commit, revert });
    handlers.current = { setDraft, commit, revert };

    // The editor owns its document (see `initialValue` below), so reverting the draft alone would
    // leave the reader's text on screen — the editor is rebuilt around the restored text instead.
    const [epoch, setEpoch] = useState(0);

    // Tearing that editor down fires a blur, and blur commits: without this a revert would write
    // the very text it just discarded. Cleared by the next keystroke, so a field the reader returns
    // to still commits when they leave it.
    const discarded = useRef(false);
    const revertAll = useCallback(() => {
      discarded.current = true;
      handlers.current.revert();
      setEpoch((current) => current + 1);
    }, []);

    useImperativeHandle(forwardedRef, () => ({ commit: () => handlers.current.commit(), revert: revertAll }), [
      revertAll,
    ]);

    const { themeMode } = useThemeContext();
    const commitOnBlur = options.blurBehavior !== 'revert';
    const extensions = useMemo(
      () => [
        // The markdown bundle is only half an editor — without the basic set the content is
        // `white-space: pre`, so a description runs off the side instead of wrapping, and there is no
        // undo. Line numbers and the active-line highlight belong to a document, not a field.
        createBasicExtensions({ lineWrapping: true, highlightActiveLine: false, placeholder, tabbable: true }),
        // Tab moves to the next field rather than indenting: this is a field in a form, and a stop
        // that swallows Tab is a trap.
        createMarkdownExtensions({ indentWithTab: false }),
        // Without the theme the caret keeps CodeMirror's own 1px black, which is invisible against a
        // dark surface. `fullWidth` rather than the default `grow`: this is a field that grows with
        // its content, not a pane filling a height.
        createThemeExtensions({ themeMode, syntaxHighlighting: true, slots: fullWidth }),
        decorateMarkdown(),
        inlineEdit({
          // The text comes with the event: committing the draft instead would write whatever the
          // previous render captured.
          onCommit: (text) => {
            if (!discarded.current) {
              handlers.current.commit(text);
            }
          },
          onRevert: () => revertAll(),
          commitOnBlur,
          submitOnEnter: !multiline,
        }),
      ],
      [commitOnBlur, multiline, placeholder, themeMode, revertAll],
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
            key={epoch}
            // The text itself is the tab stop (`tabbable` above). `TextEditor` otherwise puts a
            // tabindex on its wrapper, so Tab lands on a box that shows nothing and needs Enter to
            // get into — right for a document pane, wrong for a field next to a title.
            focusable={false}
            initialValue={draft}
            onChange={(text) => {
              discarded.current = false;
              handlers.current.setDraft(text);
            }}
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
        className={mx('w-full', !readonly && 'cursor-text', !value && placeholder && 'text-placeholder', classNames)}
      >
        <MarkdownView content={value || placeholder} components={components} />
      </div>
    );
  },
);

MarkdownEditable.displayName = 'MarkdownEditable';
