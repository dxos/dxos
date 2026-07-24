//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useMemo } from 'react';

import { type Database, Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Editor, useBasicMarkdownExtensions } from '@dxos/react-ui-editor';
import { Text } from '@dxos/schema';
import { createDataExtensions } from '@dxos/ui-editor';

import { translationKey } from '#translations';
import { type FormFieldRendererProps } from '#types';

import { FormRow } from '../../FormRow';

// Mirror the focus treatment of `Input` (default variant): a `focus-ring-subtle` ring of `dx-focus-line`
// width rather than a recolored 1px border, and suppress the editor wrapper's `accent-bg` border so a
// second click never turns the outline blue. Keyed on `focus-within` because focus lands on the inner
// CodeMirror contenteditable, not this wrapper.
const editorClassNames = [
  'dx-input min-h-[6lh] p-1 px-2',
  'focus-within:ring-2 focus-within:ring-offset-0 focus-within:ring-focus-ring-subtle focus-within:z-[1]',
];

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
        return <RefMarkdownEditor reference={reference} placeholder={placeholder} readonly={!!readonly} />;
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
    <FormRow readonly={readonly} getValue={getValue} renderStatic={renderStatic} {...props}>
      {({ value }) => renderEditor(value)}
    </FormRow>
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
  readonly?: boolean;
};

const RefMarkdownEditor = ({ reference, placeholder, readonly }: RefMarkdownEditorProps) => {
  const text = useAtomValue(useMemo(() => reference.atom, [reference]));
  const dataExtensions = useMemo(
    () => (text ? [createDataExtensions({ id: reference.uri, text: Doc.createAccessor(text, ['content']) })] : []),
    [text, reference],
  );
  const extensions = useBasicMarkdownExtensions({ placeholder, readonly, extensions: dataExtensions });
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
  const extensions = useBasicMarkdownExtensions({ placeholder, readonly });
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

    onCreate(Ref.make(db.add(Text.make())));
  }, [db, onCreate]);

  return (
    <IconButton icon='ph--plus--regular' label={t('create-text.label')} onClick={handleClick} disabled={disabled} />
  );
};
