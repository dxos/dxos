//
// Copyright 2026 DXOS.org
//

import { type EditorState } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import React, { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

import {
  type BlockPart,
  type BlockSchema,
  type BlockValue,
  type Entry,
  type SourceBlock,
  decodeBlock,
  mintKey,
  partSource,
  patchBlock,
  patchPart,
} from '@dxos/deus/schema';
import {
  Form,
  type FormExtensionsField,
  type FormFieldMap,
  type FormFieldOverride,
  type FormFieldRenderer,
  InputEditor,
} from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import { type WidgetProps } from '@dxos/ui-editor';
import { hues } from '@dxos/ui-types';

import { ProjectsNamespace } from '../../namespace.ts';
import { focusBlockEffect, isFocusRequested } from './block-commands.ts';
import { PROSE, TITLE, blockFormSchema, fromFormValues, isBoundField, toFormValues } from './block-form.ts';
import { type PartSource, partBinding } from './part-binding.ts';
import {
  type BlockLocator,
  type SpecBlocks,
  blockListeners,
  findBlock,
  labelOf,
  specBlocksConfig,
  specBlocksField,
} from './spec-blocks-state.ts';

export type SpecBlockCardProps = WidgetProps<{ locator: BlockLocator }>;

/** The spec's blocks in the editor's current state, re-read on each change. */
const useSpecBlocks = (view: EditorView): SpecBlocks =>
  useSyncExternalStore(
    useCallback(
      (onChange: () => void) => {
        const listeners = view.plugin(blockListeners)?.listeners;
        const listener = () => onChange();
        listeners?.add(listener);
        return () => listeners?.delete(listener);
      },
      [view],
    ),
    () => view.state.field(specBlocksField),
  );

/** One block of a spec drawn as a form over its kind's schema, editing the block's text in place. */
export const SpecBlockCard = ({ view, locator }: SpecBlockCardProps) => {
  if (!view) {
    return null;
  }
  return <SpecBlockForm view={view} locator={locator} />;
};

const SpecBlockForm = ({ view, locator }: { view: EditorView; locator: BlockLocator }) => {
  const blocks = useSpecBlocks(view);
  const block = findBlock(blocks, locator);
  const schema = block && blocks.schemas.get(block.kind);
  if (!block || !schema) {
    return null;
  }
  return <BlockForm view={view} locator={locator} blocks={blocks} block={block} schema={schema} />;
};

type BlockFormProps = {
  view: EditorView;
  locator: BlockLocator;
  blocks: SpecBlocks;
  block: SourceBlock;
  schema: BlockSchema;
};

/** The part a locator names in a state, with how to write it; undefined once its block is gone. */
const locatePart =
  (locator: BlockLocator, part: BlockPart) =>
  (state: EditorState): PartSource | undefined => {
    const blocks = state.field(specBlocksField);
    const block = findBlock(blocks, locator);
    const schema = block && blocks.schemas.get(block.kind);
    if (!block || !schema) {
      return undefined;
    }
    const text = state.doc.toString();
    return { ...partSource(text, block, schema, part), patch: (next) => patchPart(text, block, schema, part, next) };
  };

const BlockForm = ({ view, locator, blocks, block, schema }: BlockFormProps) => {
  const readonly = view.state.facet(specBlocksConfig).readonly;
  const value = decodeBlock(view.state.doc.toString(), block, schema);
  const raw = value.raw.join(',');
  // Rebuilt only when a field changes how it is edited, so the bound editors keep their state across edits.
  const formSchema = useMemo(() => blockFormSchema(schema, value), [schema, raw]);
  const values = useMemo(() => toFormValues(schema, value), [schema, JSON.stringify(value)]);

  const { kind, id, index } = locator;
  const extensions = useCallback(
    ({ path }: FormExtensionsField) => {
      const [name] = path;
      const part: BlockPart =
        name === TITLE ? { part: 'title' } : name === PROSE ? { part: 'prose' } : { part: 'field', name: String(name) };
      const field = schema.fields.find((candidate) => candidate.name === name);
      return [
        partBinding({
          parent: view,
          locate: locatePart({ kind, id, index }, part),
          verbatim: field?.type.kind === 'code',
        }),
      ];
    },
    [view, schema, kind, id, index],
  );

  const fieldOverrides = useMemo<Record<string, FormFieldOverride>>(
    () => ({
      [TITLE]: { collaborative: true, presentation: 'title', hideLabel: true, readonly },
      [PROSE]: { collaborative: true, hideLabel: true, readonly },
      ...Object.fromEntries(
        schema.fields
          .filter((field) => isBoundField(field, value))
          .map((field) => [field.name, { collaborative: true, readonly }]),
      ),
    }),
    [schema, raw, readonly],
  );

  const fieldMap = useMemo<FormFieldMap>(
    () =>
      Object.fromEntries(
        schema.fields
          .filter((field) => field.type.kind === 'keyed')
          .map((field) => [field.name, makeEntriesField(view, { kind, id, index }, field.name, !!readonly)]),
      ),
    [view, schema, kind, id, index, readonly],
  );

  const handleValuesChanged = useCallback(
    (next: Record<string, unknown>) => {
      const current = view.state.field(specBlocksField);
      const source = findBlock(current, { kind, id, index });
      if (!source) {
        return;
      }
      const text = view.state.doc.toString();
      const before = decodeBlock(text, source, schema);
      const changes = patchBlock(text, source, schema, fromFormValues(schema, before, next));
      if (changes.length > 0) {
        view.dispatch({ changes, userEvent: 'input' });
      }
    },
    [view, schema, kind, id, index],
  );

  // A block a slash command just wrote opens with its first field focused, once its editor has taken its text.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isFocusRequested(view.state, locator)) {
      view.dispatch({ effects: focusBlockEffect.of(undefined) });
      requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('.cm-content')?.focus());
    }
  }, [view, locator]);

  const label = labelOf(blocks, block);
  const hue = hues.find((candidate) => candidate === schema.hue);
  return (
    <Card.Root classNames='my-2' data-testid='spec-block' data-kind={block.kind} ref={ref}>
      <Card.Header>
        <Icon.Icon icon={schema.icon ?? 'ph--cube--regular'} hue={hue} />
        <Card.Title classNames='text-description'>
          {block.kind}
          {label ? ` ${label}` : ''}
        </Card.Title>
      </Card.Header>
      <Form.Root
        schema={formSchema}
        values={values}
        readonly={readonly}
        extensions={extensions}
        fieldMap={fieldMap}
        fieldOverrides={fieldOverrides}
        onValuesChanged={handleValuesChanged}
      >
        <Form.Viewport gutter='none'>
          <Form.Content>
            <Form.Fields />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Card.Root>
  );
};

/** A keyed field (`req <key>: text`) as one bound editor per line, labelled by position, with adding and removing. */
const makeEntriesField = (
  view: EditorView,
  locator: BlockLocator,
  name: string,
  readonly: boolean,
): FormFieldRenderer => {
  const EntriesField: FormFieldRenderer = ({ label }) => {
    const { t } = Hooks.useTranslation(ProjectsNamespace.key);
    const blocks = useSpecBlocks(view);
    const block = findBlock(blocks, locator);
    const schema = block && blocks.schemas.get(block.kind);
    const value = block && schema ? decodeBlock(view.state.doc.toString(), block, schema) : undefined;
    const entries = (value?.fields[name] ?? []) as readonly Entry[];

    const update = (change: (entries: readonly Entry[], value: BlockValue) => readonly Entry[]) => {
      const current = view.state.field(specBlocksField);
      const source = findBlock(current, locator);
      const kind = source && current.schemas.get(source.kind);
      if (!source || !kind) {
        return;
      }
      const text = view.state.doc.toString();
      const before = decodeBlock(text, source, kind);
      const next = change((before.fields[name] ?? []) as readonly Entry[], before);
      view.dispatch({
        changes: patchBlock(text, source, kind, { ...before, fields: { ...before.fields, [name]: next } }),
        userEvent: 'input',
      });
    };

    return (
      <Form.Field label={label} standalone>
        <div role='list' className='flex flex-col gap-1' data-testid={`spec-block.${name}`}>
          {block &&
            entries.map(({ key }) => (
              <div role='listitem' key={key} className='flex items-start gap-2'>
                <span className='shrink-0 pt-1 text-description text-sm'>{labelOf(blocks, block, key) ?? key}</span>
                <div className='grow'>
                  <EntryEditor view={view} locator={locator} name={name} entryKey={key} readonly={readonly} />
                </div>
                {!readonly && (
                  <Button.Root
                    icon='ph--x--regular'
                    iconOnly
                    variant='ghost'
                    onClick={() => update((current) => current.filter((entry) => entry.key !== key))}
                  >
                    {t('spec-block.remove-entry.label')}
                  </Button.Root>
                )}
              </div>
            ))}
          {!readonly && (
            <Button.Root
              icon='ph--plus--regular'
              variant='ghost'
              data-testid={`spec-block.${name}.add`}
              onClick={() =>
                update((current) => [
                  ...current,
                  { key: mintKey(new Set(blocks.items.map(({ key }) => key))), text: t('spec-block.new-entry.text') },
                ])
              }
            >
              {t('spec-block.add-entry.label', { name })}
            </Button.Root>
          )}
        </div>
      </Form.Field>
    );
  };
  return EntriesField;
};

const EntryEditor = ({
  view,
  locator,
  name,
  entryKey,
  readonly,
}: {
  view: EditorView;
  locator: BlockLocator;
  name: string;
  entryKey: string;
  readonly: boolean;
}) => {
  const extensions = useMemo(
    () => [partBinding({ parent: view, locate: locatePart(locator, { part: 'field', name, key: entryKey }) })],
    [view, locator.kind, locator.id, locator.index, name, entryKey],
  );
  return (
    <InputEditor
      extensions={extensions}
      readonly={readonly}
      variant='plain'
      testId={`spec-block.${name}.${entryKey}`}
    />
  );
};
