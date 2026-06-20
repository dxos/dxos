//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useMemo } from 'react';

import { type Database, Obj, Ref } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-client';
import { Button, Icon, useTranslation } from '@dxos/react-ui';
import { Editor, useBasicMarkdownExtensions } from '@dxos/react-ui-editor';
import { Text } from '@dxos/schema';
import { createDataExtensions } from '@dxos/ui-editor';

import { translationKey } from '#translations';
import { type FormFieldRendererProps } from '#types';

import { FormFieldWrapper } from '../../FormFieldWrapper';

const editorClassNames =
  'min-h-[6lh] transition-colors bg-input-surface focus-within:bg-focus-surface border border-separator rounded-xs p-1 px-2';

/**
 * Form field that edits a markdown value in a CodeMirror editor.
 * Supports two backings:
 * - `Schema.String` annotated with `Format.TypeFormat.Markdown`: edited as plain text via `getValue`/`onValueChange`.
 * - `Ref<Text>` annotated with `Format.TypeFormat.Markdown`: edited in-place via an Automerge doc accessor.
 *   When the ref is empty and a database is available, a create button is shown to allocate a new Text.
 */
export const MarkdownField = ({
  type,
  readonly,
  placeholder,
  db,
  getValue,
  onValueChange,
  ...props
}: FormFieldRendererProps) => {
  const isRef = Ref.isRefType(type);

  // The field value is a runtime union the form's value type can't express: a `Ref<Text>` when the
  // property is a markdown ref, or a plain string when it is annotated markdown text. `isRef`
  // selects the branch, so the casts below narrow the opaque value accordingly.
  const renderStatic = (value: unknown) => {
    if (isRef) {
      const reference = value as Ref.Ref<any> | undefined;
      return reference ? <RefStaticText reference={reference} /> : null;
    }
    return <p className='whitespace-pre-wrap'>{(value as string | undefined) ?? ''}</p>;
  };

  const renderEditor = (value: unknown) => {
    if (isRef) {
      const reference = value as Ref.Ref<any> | undefined;
      if (reference) {
        return <RefMarkdownEditor reference={reference} placeholder={placeholder} />;
      }

      if (readonly) {
        return null;
      }

      return <CreateTextButton db={db} disabled={!db} onCreate={(ref) => onValueChange(type, ref)} />;
    }

    return (
      <StringMarkdownEditor
        value={(value as string | undefined) ?? ''}
        placeholder={placeholder}
        readonly={!!readonly}
        onChange={(next) => onValueChange(type, next)}
      />
    );
  };

  return (
    <FormFieldWrapper readonly={readonly} getValue={getValue} renderStatic={renderStatic} {...props}>
      {({ value }) => renderEditor(value)}
    </FormFieldWrapper>
  );
};

/** Read-only static rendering for a `Ref<Text>` value: resolve the ref and print its content. */
const RefStaticText = ({ reference }: { reference: Ref.Ref<any> }) => {
  const text = useAtomValue(useMemo(() => reference.atom, [reference]));
  if (!text?.content) {
    return null;
  }

  return <p className='whitespace-pre-wrap'>{text.content}</p>;
};

type RefMarkdownEditorProps = {
  reference: Ref.Ref<any>;
  placeholder?: string;
};

const RefMarkdownEditor = ({ reference, placeholder }: RefMarkdownEditorProps) => {
  const text = useAtomValue(useMemo(() => reference.atom, [reference]));
  const dataExtensions = useMemo(
    () => (text ? [createDataExtensions({ id: reference.uri, text: createDocAccessor(text, ['content']) })] : []),
    [text, reference],
  );
  const extensions = useBasicMarkdownExtensions({ placeholder, extensions: dataExtensions });
  if (!text) {
    return null;
  }

  return (
    <Editor.Root>
      <Editor.View classNames={editorClassNames} extensions={extensions} />
    </Editor.Root>
  );
};

type StringMarkdownEditorProps = {
  value: string;
  placeholder?: string;
  readonly?: boolean;
  onChange: (value: string) => void;
};

const StringMarkdownEditor = ({ value, placeholder, readonly, onChange }: StringMarkdownEditorProps) => {
  const extensions = useBasicMarkdownExtensions({ placeholder });
  const handleChange = useCallback((next: string) => onChange(next), [onChange]);

  return (
    <Editor.Root>
      <Editor.View
        classNames={editorClassNames}
        extensions={extensions}
        value={value}
        onChange={readonly ? undefined : handleChange}
      />
    </Editor.Root>
  );
};

type CreateTextButtonProps = {
  db?: Database.Database;
  disabled?: boolean;
  onCreate: (ref: Ref.Ref<Text.Text>) => void;
};

const CreateTextButton = ({ db, disabled, onCreate }: CreateTextButtonProps) => {
  const { t } = useTranslation(translationKey);
  const handleClick = useCallback(() => {
    if (!db) {
      return;
    }
    const text = db.add(Obj.make(Text.Text, { content: '' }));
    onCreate(Ref.make(text));
  }, [db, onCreate]);

  return (
    <Button onClick={handleClick} disabled={disabled}>
      <Icon icon='ph--plus--regular' size={4} />
      <span>{t('create-text.label')}</span>
    </Button>
  );
};
