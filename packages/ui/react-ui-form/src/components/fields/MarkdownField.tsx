//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import { type Database, Obj, Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { Next, useTranslation } from '@dxos/react-ui';
import { Editor, useBasicMarkdownExtensions } from '@dxos/react-ui-editor';
import { Text } from '@dxos/schema';
import { createDataExtensions } from '@dxos/ui-editor';

import { translationKey } from '#translations';
import { type FormFieldRendererProps } from '#types';

import { presentationFor } from '../presentation.tsx';

/** The editor's minimum height in lines, as the current field's `min-h-[6lh]`. */
const ROWS = 6;

/**
 * A markdown value in a CodeMirror editor framed by a multi-line `Next.ControlFrame`. The value is either a string
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
    <Next.Typography>{text}</Next.Typography>
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
  const extensions = useBasicMarkdownExtensions({ placeholder, readonly });
  return (
    <Next.ControlFrame rows={ROWS} disabled={readonly}>
      <Editor.Root>
        <Editor.View extensions={extensions} value={value} onChange={readonly ? undefined : onChange} />
      </Editor.Root>
    </Next.ControlFrame>
  );
};

/** A `Ref<Text>`'s content, resolved, as read-only text. */
const RefStaticText = ({ reference }: { reference: Ref.Unknown }) => {
  const target = useAtomValue(useMemo(() => reference.atom, [reference]));
  const content = Obj.instanceOf(Text.Text, target) ? target.content : undefined;
  return content ? <Next.Typography>{content}</Next.Typography> : null;
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
  const extensions = useBasicMarkdownExtensions({ placeholder, readonly, extensions: dataExtensions });
  if (!text) {
    return null;
  }

  return (
    <Next.ControlFrame rows={ROWS} disabled={readonly}>
      <Editor.Root>
        <Editor.View extensions={extensions} />
      </Editor.Root>
    </Next.ControlFrame>
  );
};

type CreateTextButtonProps = {
  db?: Database.Database;
  onCreate: (ref: Ref.Ref<Text.Text>) => void;
};

const CreateTextButton = ({ db, onCreate }: CreateTextButtonProps) => {
  const { t } = useTranslation(translationKey);
  return (
    <Next.Button icon='ph--plus--regular' disabled={!db} onClick={() => db && onCreate(Ref.make(db.add(Text.make())))}>
      {t('create-text.label')}
    </Next.Button>
  );
};
