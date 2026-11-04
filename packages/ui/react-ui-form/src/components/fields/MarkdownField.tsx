//
// Copyright 2026 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import { type Database, Obj, Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import { Editor, useBasicMarkdownExtensions } from '@dxos/react-ui-editor';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Typography from '@dxos/react-ui/Typography';
import { Text } from '@dxos/schema';
import { createDataExtensions } from '@dxos/ui-editor';

import { translationKey } from '#translations';
import { type FormFieldRendererProps } from '#types';

import { useFormContext } from '../../hooks/index.ts';
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
 * (`Format.TypeFormat.Markdown`), edited as plain text, or a `Ref<Text>`, edited in place through its document; an empty
 * ref offers a button that creates the Text. With the form's `collaboration` subject, a string is edited in place too.
 */
export const MarkdownField = ({
  type,
  readonly,
  placeholder,
  presentation,
  jsonPath,
  db,
  getValue,
  onValueChange,
}: FormFieldRendererProps) => {
  const { collaboration } = useFormContext('MarkdownField');
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
        <RefMarkdownEditor reference={reference} placeholder={placeholder} readonly={!!readonly} variant={variant} />
      );
    }

    return isStatic || readonly ? null : (
      <CreateTextButton db={db} onCreate={(created) => onValueChange(type, created)} />
    );
  }

  const text = typeof value === 'string' ? value : '';
  if (isStatic) {
    return <Typography.Text>{text}</Typography.Text>;
  }

  return collaboration?.subject && jsonPath && SchemaEx.isJsonPath(jsonPath) ? (
    <LiveStringMarkdownEditor
      subject={collaboration.subject}
      jsonPath={jsonPath}
      placeholder={placeholder}
      readonly={!!readonly}
      variant={variant}
    />
  ) : (
    <StringMarkdownEditor
      value={text}
      placeholder={placeholder}
      readonly={!!readonly}
      variant={variant}
      onChange={(next) => onValueChange(type, next)}
    />
  );
};

type InPlaceVariant = 'title' | 'plain';

type StringMarkdownEditorProps = {
  value: string;
  placeholder?: string;
  readonly?: boolean;
  variant?: InPlaceVariant;
  onChange: (value: string) => void;
};

const StringMarkdownEditor = ({ value, placeholder, readonly, variant, onChange }: StringMarkdownEditorProps) => {
  const { markdownExtensions } = useFormContext('MarkdownField');
  // Memoised: a new list each render would reconfigure the editor on every keystroke and drop its focus.
  const fieldExtensions = useMemo(() => [fieldTheme, ...(markdownExtensions ?? [])], [markdownExtensions]);
  const extensions = useBasicMarkdownExtensions({ placeholder, readonly, extensions: fieldExtensions });
  return (
    <Input.Frame rows={variant ? 1 : ROWS} variant={variant} disabled={readonly}>
      <Editor.Root>
        <Editor.View extensions={extensions} value={value} onChange={readonly ? undefined : onChange} />
      </Editor.Root>
    </Input.Frame>
  );
};

type LiveStringMarkdownEditorProps = {
  subject: Obj.Unknown;
  jsonPath: SchemaEx.JsonPath;
  placeholder?: string;
  readonly?: boolean;
  variant?: InPlaceVariant;
};

/** A string the editor writes straight into the object's document, so peers editing it see each other's carets. */
const LiveStringMarkdownEditor = ({
  subject,
  jsonPath,
  placeholder,
  readonly,
  variant,
}: LiveStringMarkdownEditorProps) => {
  const text = useMemo(() => Doc.createAccessor(subject, SchemaEx.splitJsonPath(jsonPath)), [subject, jsonPath]);
  return (
    <BoundMarkdownEditor
      id={`${subject.id}.${jsonPath}`}
      text={text}
      placeholder={placeholder}
      readonly={readonly}
      variant={variant}
    />
  );
};

/** A `Ref<Text>`'s content, resolved, as read-only text. */
const RefStaticText = ({ reference }: { reference: Ref.Unknown }) => {
  const target = useAtomValue(useMemo(() => reference.atom, [reference]));
  const content = Obj.instanceOf(Text.Text, target) ? target.content : undefined;
  return content ? <Typography.Text>{content}</Typography.Text> : null;
};

type RefMarkdownEditorProps = {
  reference: Ref.Unknown;
  placeholder?: string;
  readonly?: boolean;
  variant?: InPlaceVariant;
};

const RefMarkdownEditor = ({ reference, placeholder, readonly, variant }: RefMarkdownEditorProps) => {
  const target = useAtomValue(useMemo(() => reference.atom, [reference]));
  const text = useMemo(
    () => (Obj.instanceOf(Text.Text, target) ? Doc.createAccessor(target, ['content']) : undefined),
    [target],
  );
  return text ? (
    <BoundMarkdownEditor
      id={reference.uri}
      text={text}
      placeholder={placeholder}
      readonly={readonly}
      variant={variant}
    />
  ) : null;
};

type BoundMarkdownEditorProps = {
  /** Names the awareness channel, so every editor of the same text shares one. */
  id: string;
  text: Doc.Accessor;
  placeholder?: string;
  readonly?: boolean;
  variant?: InPlaceVariant;
};

/** An editor synced with an Automerge string, showing the carets of peers in the form's `collaboration`. */
const BoundMarkdownEditor = ({ id, text, placeholder, readonly, variant }: BoundMarkdownEditorProps) => {
  const { markdownExtensions, collaboration } = useFormContext('MarkdownField');
  const messenger = collaboration?.messenger;
  const identity = collaboration?.identity;
  const fieldExtensions = useMemo(
    () => [fieldTheme, createDataExtensions({ id, text, messenger, identity }), ...(markdownExtensions ?? [])],
    [id, text, messenger, identity, markdownExtensions],
  );
  const extensions = useBasicMarkdownExtensions({ placeholder, readonly, extensions: fieldExtensions });
  return (
    <Input.Frame rows={variant ? 1 : ROWS} variant={variant} disabled={readonly}>
      <Editor.Root>
        <Editor.View extensions={extensions} />
      </Editor.Root>
    </Input.Frame>
  );
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
