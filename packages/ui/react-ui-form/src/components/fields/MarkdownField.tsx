//
// Copyright 2026 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import { type Database, Obj, Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Typography from '@dxos/react-ui/Typography';
import { Text } from '@dxos/schema';
import { createDataExtensions, createMarkdownExtensions, decorateMarkdown } from '@dxos/ui-editor';

import { translationKey } from '#translations';
import { type FormFieldRendererProps } from '#types';

import { useFormExtensions } from '../../hooks/index.ts';
import { presentationFor } from '../presentation.tsx';
import { InputEditor, type InputEditorProps } from './InputEditor.tsx';

/** The editor's minimum height in lines, as the current field's `min-h-[6lh]`. */
const ROWS = 6;

/** Elsewhere inline code is one clipped line (fixed height, no wrapping), which in a field widens the content instead. */
const fieldTheme = EditorView.theme({
  '& .cm-content .cm-code-inline': { whiteSpace: 'break-spaces', height: 'auto', overflow: 'visible' },
});

/**
 * A markdown value in a multi-line `InputEditor`. The value is either a string (`Format.TypeFormat.Markdown`), edited
 * through the form's values or, when collaborative, through the binding the form's extensions give it, or a
 * `Ref<Text>`, edited in place through its document; an empty ref offers a button that creates the Text.
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

  // A collaborative string is edited through the binding in the form's extensions, never through the form's value.
  return (
    <MarkdownEditor
      placeholder={placeholder}
      readonly={!!readonly}
      variant={variant}
      extensions={extensions}
      testId={jsonPath}
      {...(!collaborative && {
        value: typeof value === 'string' ? value : '',
        onChange: (next: string) => onValueChange(type, next),
      })}
    />
  );
};

/** The markdown editor every markdown field draws, given its value through the form or bound through `extensions`. */
const MarkdownEditor = ({ extensions: formExtensions, ...props }: Omit<InputEditorProps, 'rows'>) => {
  const extensions = useMemo(
    () => [createMarkdownExtensions(), decorateMarkdown(), fieldTheme, ...(formExtensions ?? [])],
    [formExtensions],
  );
  return <InputEditor {...props} rows={ROWS} extensions={extensions} />;
};

/** A `Ref<Text>`'s content, resolved, as read-only text. */
const RefStaticText = ({ reference }: { reference: Ref.Unknown }) => {
  const target = useAtomValue(useMemo(() => reference.atom, [reference]));
  const content = Obj.instanceOf(Text.Text, target) ? target.content : undefined;
  return content ? <Typography.Text>{content}</Typography.Text> : null;
};

type RefMarkdownEditorProps = Omit<InputEditorProps, 'rows' | 'value' | 'initialValue' | 'onChange'> & {
  reference: Ref.Unknown;
};

const RefMarkdownEditor = ({ reference, extensions: formExtensions, ...props }: RefMarkdownEditorProps) => {
  const target = useAtomValue(useMemo(() => reference.atom, [reference]));
  const text = Obj.instanceOf(Text.Text, target) ? target : undefined;
  const extensions = useMemo(
    () =>
      text
        ? [
            createDataExtensions({ id: reference.uri, text: Doc.createAccessor(text, ['content']) }),
            ...(formExtensions ?? []),
          ]
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
