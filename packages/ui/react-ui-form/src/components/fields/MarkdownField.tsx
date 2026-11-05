//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import { type Database, Obj, Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { Editor, type TextEditorProps, useBasicMarkdownExtensions } from '@dxos/react-ui-editor';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Typography from '@dxos/react-ui/Typography';
import { Text } from '@dxos/schema';
import { createDataExtensions } from '@dxos/ui-editor';

import { translationKey } from '#translations';
import { type FormFieldRendererProps } from '#types';

import { useCollaborativeText, useFormContext, useFormExtensions } from '../../hooks/index.ts';
import { presentationFor } from '../presentation.tsx';

/** The editor's minimum height in lines, as the current field's `min-h-[6lh]`. */
const ROWS = 6;

/**
 * Fits the editor to the field: a long unbroken token (an inline-code URL) breaks anywhere rather than widening the
 * content, and the editor fills the frame's height, so its scroller ends at the frame's foot instead of mid-field.
 */
const fieldTheme = EditorView.theme({
  '&': { minHeight: '100%' },
  '.cm-content': { overflowWrap: 'anywhere' },
  // Elsewhere inline code is one clipped line (fixed height, no wrapping), which in a field widens the content instead.
  '& .cm-content .cm-code-inline': { whiteSpace: 'break-spaces', height: 'auto', overflow: 'visible' },
});

/**
 * A markdown value in a CodeMirror editor framed by a multi-line `ControlFrame`. The value is either a string
 * (`Format.TypeFormat.Markdown`), edited through the form's values or, when collaborative, in place in the form's
 * object, or a `Ref<Text>`, edited in place through its document; an empty ref offers a button that creates the Text.
 */
export const MarkdownField = ({
  type,
  readonly,
  placeholder,
  presentation,
  db,
  jsonPath,
  path,
  collaborative,
  getValue,
  onValueChange,
}: FormFieldRendererProps) => {
  const { object } = useFormContext('MarkdownField');
  const extensions = useFormExtensions(path && jsonPath !== undefined ? { path, jsonPath } : undefined);
  const value: unknown = getValue();
  const isStatic = presentationFor(presentation).isStatic;
  // Edited in place, as a TextField's title and plain text are: no well, and one line until the text grows.
  const variant = presentation === 'title' || presentation === 'plain' ? presentation : undefined;
  if (Ref.isRefType(type)) {
    const reference = Ref.isRef(value) ? value : undefined;
    if (reference) {
      return isStatic ? (
        <RefStaticText reference={reference} />
      ) : (
        <RefMarkdownEditor
          reference={reference}
          placeholder={placeholder}
          readonly={!!readonly}
          variant={variant}
          extensions={extensions}
          testId={jsonPath}
        />
      );
    }

    return isStatic || readonly ? null : (
      <CreateTextButton db={db} onCreate={(created) => onValueChange(type, created)} />
    );
  }

  if (isStatic) {
    return <Typography.Text>{typeof value === 'string' ? value : ''}</Typography.Text>;
  }

  return collaborative && object && path ? (
    <CollaborativeMarkdownEditor
      object={object}
      path={path}
      placeholder={placeholder}
      readonly={!!readonly}
      variant={variant}
      extensions={extensions}
      testId={jsonPath}
    />
  ) : (
    <MarkdownEditor
      value={typeof value === 'string' ? value : ''}
      placeholder={placeholder}
      readonly={!!readonly}
      variant={variant}
      extensions={extensions}
      testId={jsonPath}
      onChange={(next) => onValueChange(type, next)}
    />
  );
};

type InPlaceVariant = 'title' | 'plain';

type MarkdownEditorProps = {
  placeholder?: string;
  readonly?: boolean;
  variant?: InPlaceVariant;
  /** The field's extensions: the form's, and the binding of an editor edited in place. */
  extensions: Extension[];
  testId?: string;
} & Pick<TextEditorProps, 'value' | 'initialValue' | 'autoFocus' | 'onChange'>;

/** The markdown editor every markdown field draws, given its value through the form or bound through `extensions`. */
const MarkdownEditor = ({
  placeholder,
  readonly,
  variant,
  extensions: formExtensions,
  testId,
  onChange,
  ...props
}: MarkdownEditorProps) => {
  // Memoised: a new list each render would reconfigure the editor on every keystroke and drop its focus.
  const fieldExtensions = useMemo(() => [fieldTheme, ...formExtensions], [formExtensions]);
  const extensions = useBasicMarkdownExtensions({ placeholder, readonly, extensions: fieldExtensions });
  return (
    <Input.Frame rows={variant ? 1 : ROWS} variant={variant} disabled={readonly} data-testid={testId}>
      <Editor.Root>
        <Editor.View {...props} extensions={extensions} onChange={readonly ? undefined : onChange} />
      </Editor.Root>
    </Input.Frame>
  );
};

type CollaborativeMarkdownEditorProps = Omit<MarkdownEditorProps, 'value' | 'initialValue' | 'onChange'> & {
  object: Obj.Unknown;
  path: Doc.KeyPath;
};

/** A markdown string of the form's object, edited in place (see `useCollaborativeText`). */
const CollaborativeMarkdownEditor = ({
  object,
  path,
  extensions,
  readonly,
  ...props
}: CollaborativeMarkdownEditorProps) => {
  const binding = useCollaborativeText({ object, path, extensions, readonly });
  return (
    <MarkdownEditor
      {...props}
      readonly={readonly}
      extensions={binding.extensions}
      initialValue={binding.initialValue}
      autoFocus={binding.autoFocus}
    />
  );
};

/** A `Ref<Text>`'s content, resolved, as read-only text. */
const RefStaticText = ({ reference }: { reference: Ref.Unknown }) => {
  const target = useAtomValue(useMemo(() => reference.atom, [reference]));
  const content = Obj.instanceOf(Text.Text, target) ? target.content : undefined;
  return content ? <Typography.Text>{content}</Typography.Text> : null;
};

type RefMarkdownEditorProps = Omit<MarkdownEditorProps, 'value' | 'initialValue' | 'onChange'> & {
  reference: Ref.Unknown;
};

const RefMarkdownEditor = ({ reference, extensions: formExtensions, ...props }: RefMarkdownEditorProps) => {
  const target = useAtomValue(useMemo(() => reference.atom, [reference]));
  const text = Obj.instanceOf(Text.Text, target) ? target : undefined;
  const extensions = useMemo(
    () =>
      text
        ? [createDataExtensions({ id: reference.uri, text: Doc.createAccessor(text, ['content']) }), ...formExtensions]
        : formExtensions,
    [text, reference, formExtensions],
  );
  return text ? <MarkdownEditor {...props} extensions={extensions} /> : null;
};

type CreateTextButtonProps = {
  db?: Database.Database;
  onCreate: (ref: Ref.Ref<Text.Text>) => void;
};

const CreateTextButton = ({ db, onCreate }: CreateTextButtonProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  return (
    <Button.Root icon='ph--plus--regular' disabled={!db} onClick={() => db && onCreate(Ref.make(db.add(Text.make())))}>
      {t('create-text.label')}
    </Button.Root>
  );
};
