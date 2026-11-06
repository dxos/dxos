//
// Copyright 2026 DXOS.org
//

import { type EditorState } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import React, { type ReactNode, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type BlockPart,
  type BlockSchema,
  type Entry,
  type FieldSchema,
  type Row,
  type SourceBlock,
  decodeBlock,
  mintKey,
  partSource,
  patchPart,
} from '@dxos/deus/schema';
import {
  Form,
  type FormExtensionsField,
  type FormFieldOverride,
  InputEditor,
  type RefOption,
} from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Tag from '@dxos/react-ui/Tag';
import { type WidgetProps } from '@dxos/ui-editor';
import { hues } from '@dxos/ui-types';

import { ProjectsNamespace } from '../../namespace.ts';
import { focusBlockEffect, isFocusRequested } from './block-commands.ts';
import { PROSE, TITLE, blockFormSchema, fromFormValues, isBoundField, toFormValues } from './block-form.ts';
import { RefField, TypePicker, isPickedRef, isPickedType, parseTypeName, typeOptions } from './block-pickers.tsx';
import { readBlock, setField, updateBlock, useSpecBlocks } from './block-value.ts';
import { type PartSource, partBinding } from './part-binding.ts';
import {
  type BlockLocator,
  type SpecBlocks,
  findBlock,
  labelOf,
  specBlocksConfig,
  specBlocksField,
} from './spec-blocks-state.ts';

export type SpecBlockCardProps = WidgetProps<{ locator: BlockLocator }>;

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
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
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
      [TITLE]: {
        collaborative: true,
        presentation: 'title',
        hideLabel: true,
        readonly,
        placeholder: t('spec-block.title.placeholder'),
      },
      // Prose reads as body text, with a one-line placeholder rather than the schema's guidance.
      [PROSE]: {
        collaborative: true,
        presentation: 'plain',
        hideLabel: true,
        readonly,
        placeholder: t('spec-block.prose.placeholder'),
      },
      ...Object.fromEntries(
        schema.fields
          .filter((field) => isBoundField(field, value))
          .map((field) => [
            field.name,
            field.type.kind === 'prose'
              ? { collaborative: true, presentation: 'plain', hideLabel: true, readonly, placeholder: field.name }
              : { collaborative: true, presentation: 'plain', hideLabel: true, readonly },
          ]),
      ),
      // A one-line value reads as text beside its name, with no well until it is focused.
      ...Object.fromEntries(
        schema.fields
          .filter((field) => !isBoundField(field, value) && isScalar(field))
          .map((field) => [field.name, { presentation: 'plain', hideLabel: true, readonly }]),
      ),
    }),
    [schema, raw, readonly, t],
  );

  const handleValuesChanged = useCallback(
    (next: Record<string, unknown>) =>
      updateBlock(view, { kind, id, index }, (before) => fromFormValues(schema, before, next)),
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

  const active = useActive(ref, view.dom) && !readonly;
  const [folded, setFolded] = useState(false);
  const label = labelOf(blocks, block) ?? (block.id || undefined);
  const hue = hues.find((candidate) => candidate === schema.hue);
  const tags = schema.fields.filter((field) => field.type.kind === 'literal').map(({ name }) => name);
  const keyed = schema.fields.filter((field) => field.type.kind === 'keyed');
  const rows = schema.fields.filter((field) => field.type.kind !== 'literal' && field.type.kind !== 'keyed');
  const types = useMemo(() => typeOptions(blocks), [blocks]);
  const refs = schema.fields.flatMap((field) =>
    field.type.kind === 'ref' ? [value.fields[field.name] ?? []].flat().map(String) : [],
  );
  const refLabel = (name: string) => blocks.items.find((item) => !item.entry && item.key === name)?.label ?? name;
  // An empty inline prose row would sit beside a kind's own prose field (`desc`) and offer a second place to write it.
  const hasProseField = schema.fields.some((field) => field.type.kind === 'prose');
  const entries = keyed.reduce((count, { name }) => count + ((value.fields[name] ?? []) as readonly Entry[]).length, 0);
  // Lines the codec reads as prose only when they come before the first field; the source view shows the rest.
  const stray = block.fields.length > 0 ? block.prose.filter((line) => line.from > block.fields[0].from).length : 0;

  return (
    <Form.Root
      schema={formSchema}
      values={values}
      readonly={readonly}
      extensions={extensions}
      fieldOverrides={fieldOverrides}
      onValuesChanged={handleValuesChanged}
    >
      <Form.Viewport gutter='none'>
        <Form.Content>
          <Card.Root grid classNames='my-1' data-testid='spec-block' data-kind={block.kind} ref={ref}>
            <Card.Row
              leading={
                <SystemButton.Disclosure
                  variant='ghost'
                  label={t('spec-block.fold.label')}
                  expanded={!folded}
                  onExpandedChange={(expanded) => setFolded(!expanded)}
                  data-testid='spec-block.fold'
                />
              }
              trailing={
                <Layout.Flex align='center' gap='sm'>
                  {folded &&
                    refs.map((name) => (
                      <Tag.Tag key={name} data-testid='spec-block.ref'>
                        {refLabel(name)}
                      </Tag.Tag>
                    ))}
                  {folded && entries > 0 && (
                    <Card.Text variant='muted' data-testid='spec-block.entry-count'>
                      {t('spec-block.entry-count.label', { count: entries })}
                    </Card.Text>
                  )}
                  {tags.length > 0 && <Form.Fields include={tags} layout='tag' />}
                </Layout.Flex>
              }
            >
              <Layout.Flex align='center' gap='sm'>
                <Icon.Icon icon={schema.icon ?? 'ph--cube--regular'} hue={hue} />
                <FieldName data-testid='spec-block.label'>{label ? `${block.kind} ${label}` : block.kind}</FieldName>
                <Layout.Flex column grow>
                  <Form.Fields include={[TITLE]} />
                </Layout.Flex>
              </Layout.Flex>
            </Card.Row>
            {!folded && (
              <>
                {schema.inlineProse && (value.prose || (active && !hasProseField)) && (
                  <Card.Row>
                    <Form.Fields include={[PROSE]} />
                  </Card.Row>
                )}
                {rows
                  .filter((field) => active || !isEmpty(value.fields[field.name]))
                  .map((field) =>
                    isBoundField(field, value) && field.type.kind !== 'prose' ? (
                      <FieldRow key={field.name} name={field.name}>
                        <Form.Fields include={[field.name]} layout='inline' />
                      </FieldRow>
                    ) : field.type.kind === 'map' ? (
                      <Rows
                        key={field.name}
                        view={view}
                        locator={locator}
                        name={field.name}
                        // An `ext` block's field types are the language's (`Prose`, `Identifier`), not the spec's.
                        typeOptions={field.type.value === 'type' && block.kind !== 'ext' ? types : undefined}
                        actions={active}
                        readonly={!!readonly}
                      />
                    ) : field.type.kind === 'list' ||
                      (field.type.kind === 'ref' && field.type.many && !isPickedRef(field, blocks)) ? (
                      <Items
                        key={field.name}
                        view={view}
                        locator={locator}
                        name={field.name}
                        actions={active}
                        readonly={!!readonly}
                      />
                    ) : field.type.kind === 'ref' && !isPickedRef(field, blocks) ? (
                      <FieldRow key={field.name} name={field.name}>
                        <RowInput
                          value={String(value.fields[field.name] ?? '')}
                          placeholder={field.name}
                          readonly={!!readonly}
                          classNames='w-full'
                          onCommit={(next) => updateBlock(view, locator, setField(field.name, next || undefined))}
                        />
                      </FieldRow>
                    ) : field.type.kind === 'ref' ? (
                      <FieldRow key={field.name} name={field.name}>
                        <RefField
                          view={view}
                          locator={locator}
                          blocks={blocks}
                          block={block}
                          field={field}
                          held={value.fields[field.name]}
                          readonly={!!readonly}
                        />
                      </FieldRow>
                    ) : field.type.kind === 'typeExpr' ? (
                      <FieldRow key={field.name} name={field.name}>
                        <TypeValue
                          value={String(value.fields[field.name] ?? '')}
                          options={types}
                          readonly={!!readonly}
                          actions={active}
                          testId={`spec-block.${field.name}`}
                          onChange={(next) => updateBlock(view, locator, setField(field.name, next))}
                        />
                      </FieldRow>
                    ) : field.type.kind === 'prose' && field.name === 'desc' ? (
                      <Card.Row key={field.name}>
                        <Form.Fields include={[field.name]} />
                      </Card.Row>
                    ) : field.type.kind === 'prose' ? (
                      <FieldRow key={field.name} name={field.name}>
                        <Form.Fields include={[field.name]} />
                      </FieldRow>
                    ) : (
                      <FieldRow key={field.name} name={field.name}>
                        <Form.Fields include={[field.name]} layout='inline' />
                      </FieldRow>
                    ),
                  )}
                {keyed.map(({ name }) => (
                  <Entries
                    key={name}
                    view={view}
                    locator={locator}
                    name={name}
                    actions={active}
                    readonly={!!readonly}
                  />
                ))}
                {stray > 0 && (
                  <Card.Row icon='ph--warning--regular' data-testid='spec-block.stray'>
                    <Card.Text variant='muted'>{t('spec-block.stray-prose.message', { count: stray })}</Card.Text>
                  </Card.Row>
                )}
              </>
            )}
          </Card.Root>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

/** Whether a field's form value is one string or number, rather than a choice, a switch or a list. */
const isScalar = ({ type }: FieldSchema) =>
  !['boolean', 'keyed', 'list', 'literal', 'map'].includes(type.kind) && !(type.kind === 'ref' && type.many);

const isEmpty = (value: unknown) => value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

/** A field's name or a block's label, small and on one line, before what it names. */
const FieldName = ({ children, ...props }: { 'children': string; 'data-testid'?: string }) => (
  <span className='shrink-0 text-xs text-description tabular-nums whitespace-nowrap' {...props}>
    {children}
  </span>
);

/** One field as a line: its name small, then its value. */
const FieldRow = ({ name, children }: { name: string; children: ReactNode }) => (
  <Card.Row align='start'>
    <Layout.Flex gap='sm' classNames='items-baseline min-w-0'>
      <FieldName>{name}</FieldName>
      <div className='grow min-w-0'>{children}</div>
    </Layout.Flex>
  </Card.Row>
);

/** A type expression: picked when it names one type (or a list of it), otherwise edited as its text. */
const TypeValue = ({
  value,
  options,
  readonly,
  actions,
  testId,
  onChange,
}: {
  value: string;
  options: RefOption[];
  readonly: boolean;
  actions: boolean;
  testId: string;
  onChange: (value: string | undefined) => void;
}) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  return isPickedType(value) ? (
    <TypePicker
      value={value}
      options={options}
      readonly={readonly}
      actions={actions}
      data-testid={testId}
      onChange={onChange}
    />
  ) : (
    <RowInput
      value={value}
      placeholder={t('spec-block.type.placeholder')}
      readonly={readonly}
      classNames='w-full'
      onCommit={(next) => onChange(next || undefined)}
    />
  );
};

/**
 * Whether the card holds focus or took the last press. Only focus or a press elsewhere in the spec's editor ends it, so
 * a menu the card opens (portalled outside it) and a button that takes no focus (Safari) leave it active. A press
 * activates the card once it is released: the actions an active card adds move what is under the pointer, which would
 * otherwise take the click.
 */
const useActive = (ref: RefObject<HTMLElement | null>, scope: HTMLElement): boolean => {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const inside = (target: EventTarget | null) => target instanceof Node && element.contains(target);
    const elsewhere = (target: EventTarget | null) =>
      target instanceof Node && scope.contains(target) && !inside(target);
    let pressed = false;
    const handle = ({ type, target }: Event) => {
      if (type === 'pointerdown') {
        pressed = inside(target);
      }
      if (inside(target)) {
        if (!pressed) {
          setActive(true);
        }
      } else if (elsewhere(target)) {
        setActive(false);
      }
    };
    // The click a release makes is dispatched before the next frame.
    const release = () => {
      if (pressed) {
        pressed = false;
        requestAnimationFrame(() => setActive(true));
      }
    };
    document.addEventListener('focusin', handle);
    document.addEventListener('pointerdown', handle, true);
    document.addEventListener('pointerup', release, true);
    return () => {
      document.removeEventListener('focusin', handle);
      document.removeEventListener('pointerdown', handle, true);
      document.removeEventListener('pointerup', release, true);
    };
  }, [ref, scope]);
  return active;
};

type EntriesProps = {
  view: EditorView;
  locator: BlockLocator;
  name: string;
  /** Whether the remove and add actions show; the lines stay editable either way. */
  actions: boolean;
  readonly: boolean;
};

/** A keyed field (`req <key>: text`) as one bound line per entry, led by its positional label. */
const Entries = ({ view, locator, name, actions, readonly }: EntriesProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const blocks = useSpecBlocks(view);
  const block = findBlock(blocks, locator);
  const entries = (readBlock(view, locator)?.fields[name] ?? []) as readonly Entry[];
  const update = (change: (entries: readonly Entry[]) => readonly Entry[]) =>
    updateBlock(view, locator, (value) =>
      setField(name, change((value.fields[name] ?? []) as readonly Entry[]))(value),
    );

  if (!block) {
    return null;
  }
  return (
    <Card.Section role='list' data-testid={`spec-block.${name}`}>
      {entries.map(({ key }) => (
        <Card.Row
          key={key}
          role='listitem'
          align='start'
          // The content clips overflow (for truncation), which would cut off the editor's focus ring.
          classNames='[&_.dx-card-row-content]:overflow-visible'
          trailing={
            actions && (
              <Card.Action
                icon='ph--x--regular'
                label={t('spec-block.remove-entry.label')}
                onClick={() => update((current) => current.filter((entry) => entry.key !== key))}
              />
            )
          }
        >
          <Layout.Flex gap='sm' classNames='items-baseline min-w-0'>
            <FieldName>{labelOf(blocks, block, key) ?? key}</FieldName>
            <div className='grow min-w-0'>
              <EntryEditor view={view} locator={locator} name={name} entryKey={key} readonly={readonly} />
            </div>
          </Layout.Flex>
        </Card.Row>
      ))}
      {actions && (
        <Card.Row
          icon='ph--plus--regular'
          data-testid={`spec-block.${name}.add`}
          onClick={() =>
            update((current) => [
              ...current,
              { key: mintKey(new Set(blocks.items.map(({ key }) => key))), text: t('spec-block.new-entry.text') },
            ])
          }
        >
          <Card.Text variant='muted'>{t('spec-block.add-entry.label', { name })}</Card.Text>
        </Card.Row>
      )}
    </Card.Section>
  );
};

type RowsProps = EntriesProps & {
  /** The spec's `type` blocks, for a map whose values are type expressions. */
  typeOptions?: RefOption[];
};

/** A map field (`name?: Type  # note`) as one line per row: its name, its type picked or its text, then its note. */
const Rows = ({ view, locator, name, typeOptions, actions, readonly }: RowsProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  useSpecBlocks(view);
  const rows = (readBlock(view, locator)?.fields[name] ?? []) as readonly Row[];
  const update = (change: (rows: readonly Row[]) => readonly Row[]) =>
    updateBlock(view, locator, (value) => setField(name, change((value.fields[name] ?? []) as readonly Row[]))(value));
  const set = (index: number, row: Partial<Row>) =>
    update((current) => current.map((candidate, at) => (at === index ? { ...candidate, ...row } : candidate)));

  return (
    <Card.Row align='start' data-testid={`spec-block.${name}`}>
      <Layout.Flex gap='sm' classNames='items-baseline min-w-0'>
        <FieldName>{name}</FieldName>
        <Layout.Flex column grow classNames='min-w-0'>
          {rows.map((row, index) => (
            <Layout.Flex key={index} gap='xs' classNames='items-baseline' role='listitem'>
              <RowInput
                value={row.name}
                placeholder={t('spec-block.row-name.placeholder')}
                readonly={readonly}
                classNames='w-auto shrink-0 [field-sizing:content]'
                onCommit={(next) => set(index, { name: next })}
              />
              <button
                type='button'
                className='text-description'
                disabled={readonly}
                aria-pressed={row.optional}
                title={t('spec-block.row-optional.label')}
                onClick={() => set(index, { optional: !row.optional })}
              >
                {row.optional ? '?:' : ':'}
              </button>
              {typeOptions && parseTypeName(row.value) ? (
                <TypePicker
                  value={row.value}
                  options={typeOptions}
                  readonly={readonly}
                  actions={actions}
                  data-testid={`spec-block.${name}.${index}.type`}
                  onChange={(next) => set(index, { value: next ?? '' })}
                />
              ) : (
                <RowInput
                  value={row.value}
                  placeholder={t(typeOptions ? 'spec-block.type.placeholder' : 'spec-block.row-value.placeholder')}
                  readonly={readonly}
                  classNames='w-auto shrink-0 [field-sizing:content]'
                  onCommit={(next) => set(index, { value: next })}
                />
              )}
              {(row.note || actions) && (
                <RowInput
                  value={row.note ?? ''}
                  placeholder={t('spec-block.row-note.placeholder')}
                  readonly={readonly}
                  classNames='grow ms-2 text-description'
                  onCommit={(next) => set(index, { note: next || undefined })}
                />
              )}
              {actions && (
                <Card.Action
                  icon='ph--x--regular'
                  label={t('spec-block.remove-entry.label')}
                  onClick={() => update((current) => current.filter((_, at) => at !== index))}
                />
              )}
            </Layout.Flex>
          ))}
          {actions && (
            <Button.Root
              icon='ph--plus--regular'
              variant='ghost'
              classNames='self-start'
              data-testid={`spec-block.${name}.add`}
              onClick={() => update((current) => [...current, { name: '', optional: false, value: '' }])}
            >
              {t('spec-block.add-entry.label', { name })}
            </Button.Root>
          )}
        </Layout.Flex>
      </Layout.Flex>
    </Card.Row>
  );
};

/** A list field (`[a, b]` or bullets) as one line per item. */
const Items = ({ view, locator, name, actions, readonly }: EntriesProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  useSpecBlocks(view);
  const items = [readBlock(view, locator)?.fields[name] ?? []].flat() as readonly string[];
  const update = (change: (items: readonly string[]) => readonly string[]) =>
    updateBlock(view, locator, (value) => {
      const next = change([value.fields[name] ?? []].flat() as readonly string[]);
      return setField(name, next.length > 0 ? next : undefined)(value);
    });

  return (
    <Card.Row align='start' data-testid={`spec-block.${name}`}>
      <Layout.Flex gap='sm' classNames='items-baseline min-w-0'>
        <FieldName>{name}</FieldName>
        <Layout.Flex column grow classNames='min-w-0'>
          {items.map((item, index) => (
            <Layout.Flex key={index} gap='xs' classNames='items-baseline' role='listitem'>
              <RowInput
                value={item}
                placeholder={t('spec-block.item.placeholder')}
                readonly={readonly}
                classNames='grow'
                onCommit={(next) =>
                  update((current) =>
                    next
                      ? current.map((candidate, at) => (at === index ? next : candidate))
                      : current.filter((_, at) => at !== index),
                  )
                }
              />
              {actions && (
                <Card.Action
                  icon='ph--x--regular'
                  label={t('spec-block.remove-entry.label')}
                  onClick={() => update((current) => current.filter((_, at) => at !== index))}
                />
              )}
            </Layout.Flex>
          ))}
          {actions && (
            <Button.Root
              icon='ph--plus--regular'
              variant='ghost'
              classNames='self-start'
              data-testid={`spec-block.${name}.add`}
              onClick={() => update((current) => [...current, t('spec-block.new-item.text')])}
            >
              {t('spec-block.add-entry.label', { name })}
            </Button.Root>
          )}
        </Layout.Flex>
      </Layout.Flex>
    </Card.Row>
  );
};

/** One part of a row, committed on blur or Enter; it shows the source's value again whenever that changes. */
const RowInput = ({
  value,
  onCommit,
  readonly,
  ...props
}: {
  value: string;
  onCommit: (value: string) => void;
  readonly: boolean;
  placeholder: string;
  classNames: string;
}) => (
  <Input.Root
    key={value}
    variant='plain'
    // Sized to its text, so the row reads as the line it writes; `size` stands in where `field-sizing` is unsupported.
    size={Math.max(value.length, props.placeholder.length) + 2}
    defaultValue={value}
    readOnly={readonly}
    onBlur={(event) => event.target.value !== value && onCommit(event.target.value)}
    onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
    {...props}
  />
);

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
