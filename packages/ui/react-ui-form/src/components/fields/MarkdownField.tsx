//
// Copyright 2026 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import { type Database, Obj, Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { Button, ControlFrame, Typography, useTranslation } from '@dxos/react-ui';
import { Editor, useBasicMarkdownExtensions } from '@dxos/react-ui-editor';
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
});

/** The view stretches to the frame's height; the frame aligns its content to the first line for its adornments. */
const VIEW_CLASSNAMES = 'self-stretch min-w-0';

/**
 * A markdown value in a CodeMirror editor framed by a multi-line `ControlFrame`. The value is either a string
 * (`Format.TypeFormat.Markdown`), edited as plain text, or a `Ref<Text>`, edited in place through its document; an empty
 * ref offers a button that creates the Text.
 */
export const MarkdownField = ({
  type,
  readonly,
  placeholder,
  presentation,
  db,
  getValue,
  onValueChange,
}: FormFieldRendererProps) => {
  const value: unknown = getValue();
  const isStatic = presentationFor(presentation).isStatic;
  if (Ref.isRefType(type)) {
    const reference = Ref.isRef(value) ? value : undefined;
    if (reference) {
      return isStatic ? (
        <RefStaticText reference={reference} />
      ) : (
        <RefMarkdownEditor reference={reference} placeholder={placeholder} readonly={!!readonly} />
      );
    }

    return isStatic || readonly ? null : (
      <CreateTextButton db={db} onCreate={(created) => onValueChange(type, created)} />
    );
  }

  const text = typeof value === 'string' ? value : '';
  return isStatic ? (
    <Typography>{text}</Typography>
  ) : (
    <StringMarkdownEditor
      value={text}
      placeholder={placeholder}
      readonly={!!readonly}
      onChange={(next) => onValueChange(type, next)}
    />
  );
};

type StringMarkdownEditorProps = {
  value: string;
  placeholder?: string;
  readonly?: boolean;
  onChange: (value: string) => void;
};

const StringMarkdownEditor = ({ value, placeholder, readonly, onChange }: StringMarkdownEditorProps) => {
  const { markdownExtensions } = useFormContext('MarkdownField');
  const extensions = useBasicMarkdownExtensions({
    placeholder,
    readonly,
    extensions: [fieldTheme, ...(markdownExtensions ?? [])],
  });
  return (
    <ControlFrame rows={ROWS} disabled={readonly}>
      <Editor.Root>
        <Editor.View
          classNames={VIEW_CLASSNAMES}
          extensions={extensions}
          value={value}
          onChange={readonly ? undefined : onChange}
        />
      </Editor.Root>
    </ControlFrame>
  );
};

/** A `Ref<Text>`'s content, resolved, as read-only text. */
const RefStaticText = ({ reference }: { reference: Ref.Unknown }) => {
  const target = useAtomValue(useMemo(() => reference.atom, [reference]));
  const content = Obj.instanceOf(Text.Text, target) ? target.content : undefined;
  return content ? <Typography>{content}</Typography> : null;
};

type RefMarkdownEditorProps = {
  reference: Ref.Unknown;
  placeholder?: string;
  readonly?: boolean;
};

const RefMarkdownEditor = ({ reference, placeholder, readonly }: RefMarkdownEditorProps) => {
  const target = useAtomValue(useMemo(() => reference.atom, [reference]));
  const text = Obj.instanceOf(Text.Text, target) ? target : undefined;
  const dataExtensions = useMemo(
    () => (text ? [createDataExtensions({ id: reference.uri, text: Doc.createAccessor(text, ['content']) })] : []),
    [text, reference],
  );
  const { markdownExtensions } = useFormContext('MarkdownField');
  const extensions = useBasicMarkdownExtensions({
    placeholder,
    readonly,
    extensions: [fieldTheme, ...dataExtensions, ...(markdownExtensions ?? [])],
  });
  if (!text) {
    return null;
  }

  return (
    <ControlFrame rows={ROWS} disabled={readonly}>
      <Editor.Root>
        <Editor.View classNames={VIEW_CLASSNAMES} extensions={extensions} />
      </Editor.Root>
    </ControlFrame>
  );
};

type CreateTextButtonProps = {
  db?: Database.Database;
  onCreate: (ref: Ref.Ref<Text.Text>) => void;
};

const CreateTextButton = ({ db, onCreate }: CreateTextButtonProps) => {
  const { t } = useTranslation(translationKey);
  return (
    <Button icon='ph--plus--regular' disabled={!db} onClick={() => db && onCreate(Ref.make(db.add(Text.make())))}>
      {t('create-text.label')}
    </Button>
  );
};
