//
// Copyright 2026 DXOS.org
//

import { type EditorState } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import React, {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  type BlockPart,
  type BlockRole,
  type BlockSchema,
  type BlockValue,
  type Entry,
  type FieldSchema,
  type Row,
  type SourceBlock,
  decodeBlock,
  partSource,
  patchPart,
} from '@dxos/deus/schema';
import { Editor } from '@dxos/react-ui-editor';
import { Form, type FormExtensionsField, type FormFieldOverride, type FormFieldProvider } from '@dxos/react-ui-form';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Util from '@dxos/react-ui/Util';
import { type WidgetProps } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { hues } from '@dxos/ui-types';

import { ProjectsNamespace } from '../../namespace.ts';
import { focusBlockEffect, focusRequested } from './block-commands.ts';
import {
  type BlockFormContext,
  PROSE,
  TITLE,
  blockFormSchema,
  fieldTitle,
  formKey,
  formOptionsKey,
  fromFormValues,
  isBoundField,
  isOrderedField,
  newFormItem,
  toFormValues,
} from './block-form.ts';
import { renameBlock, updateBlock, useSpecBlocks } from './block-value.ts';
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

const isEmpty = (value: unknown) => value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

const BlockForm = ({ view, locator, blocks, block, schema }: BlockFormProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const { readonly, specs, facts } = view.state.facet(specBlocksConfig);
  const value = decodeBlock(view.state.doc.toString(), block, schema);
  const context = useMemo<BlockFormContext>(
    () => ({
      blocks,
      block,
      specs,
      facts,
      defaults: { item: t('spec-block.new-item.text'), entry: t('spec-block.new-entry.text') },
    }),
    [blocks, block, specs, facts, t],
  );
  const raw = value.raw.join(',');
  const optionsKey = formOptionsKey(schema, context);
  // Rebuilt only when the options or how a field is edited change, so the bound editors keep their state across edits.
  const formSchema = useMemo(() => blockFormSchema(schema, value, context), [schema, raw, optionsKey]);
  const values = useMemo(() => toFormValues(schema, value, context), [schema, JSON.stringify(value), optionsKey]);
  const keyed = schema.fields.filter((field) => field.type.kind === 'keyed');
  const entriesOf = (name: string) => (value.fields[name] ?? []) as readonly Entry[];

  const { kind, id, index } = locator;
  const extensions = useCallback(
    ({ path }: FormExtensionsField) => {
      const [name, at] = path;
      const field = schema.fields.find((candidate) => formKey(candidate.name) === name);
      const entry = field && typeof at === 'number' ? entriesOf(field.name)[at] : undefined;
      const part: BlockPart =
        name === TITLE
          ? { part: 'title' }
          : name === PROSE
            ? { part: 'prose' }
            : { part: 'field', name: field?.name ?? String(name), ...(entry && { key: entry.key }) };
      return [
        partBinding({
          parent: view,
          locate: locatePart({ kind, id, index }, part),
          verbatim: field?.type.kind === 'code',
        }),
      ];
    },
    // Keyed on the entries' keys, not their text, so typing into a line leaves its editor mounted.
    [view, schema, kind, id, index, JSON.stringify(keyed.map(({ name }) => entriesOf(name).map(({ key }) => key)))],
  );

  // A focused or pressed card shows its empty fields, where a value is added; at rest it shows only what the block holds.
  const ref = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const active = useActive(ref, view.dom) && !readonly;
  useSmoothHeight(ref, cardRef);

  // A pressed card puts the spec's cursor in its block, so what follows the cursor follows the card.
  useEffect(() => {
    const { head } = view.state.selection.main;
    if (active && (head < block.fence.from || head > block.fence.to)) {
      view.dispatch({ selection: { anchor: block.header.from } });
    }
  }, [active]);

  // A structure or context block (a type, an op, a plugin) is known by its name, which heads the card, and its header's
  // text describes it; an anchor or a check is known by its title.
  const named = !schema.label && !!block.id && NAMED_ROLES.includes(schema.role);
  // What describes the block, in order; at rest each shows when it holds text, and an active card with none of them
  // offers the first, so a block has one place to describe it.
  const describing = [
    ...(named ? [TITLE] : []),
    ...(schema.inlineProse ? [PROSE] : []),
    ...schema.fields.filter(({ name }) => name === DESCRIPTION).map(({ name }) => formKey(name)),
  ];
  const described = describing.some((key) => !isEmpty(values[key]));
  const isShown = (key: string) => !isEmpty(values[key]) || (active && !described && key === describing[0]);
  const describe = (key: string): FormFieldOverride => ({
    collaborative: true,
    presentation: 'plain',
    hideLabel: true,
    readonly,
    placeholder: t('spec-block.prose.placeholder'),
    hidden: !isShown(key),
  });
  const fieldOverrides = useMemo<Record<string, FormFieldOverride>>(
    () => ({
      [TITLE]: named
        ? describe(TITLE)
        : {
            collaborative: true,
            presentation: 'title',
            hideLabel: true,
            readonly,
            placeholder: active ? t('spec-block.title.placeholder') : undefined,
          },
      [PROSE]: describe(PROSE),
      ...Object.fromEntries(
        schema.fields.map((field) => [
          formKey(field.name),
          {
            // At rest a card reads as text: its lists and pickers edit once it is active, as its tags always do.
            readonly: readonly || (!active && !isTagField(field, value)),
            hidden: !active && isEmpty(values[formKey(field.name)]),
            newItem: newFormItem(field, context),
            // The card labels the rows itself.
            ...(!isTagField(field, value) && { hideLabel: true }),
            ...(isBoundField(field, value) && {
              collaborative: true,
              presentation: 'plain',
              hideLabel: true,
              placeholder: fieldTitle(field.name),
            }),
            ...(describing.includes(formKey(field.name)) && describe(formKey(field.name))),
          },
        ]),
      ),
      // A list's items are lines of text, with no well until focused.
      ...Object.fromEntries(
        schema.fields
          .filter((field) => field.type.kind === 'list' && !isBoundField(field, value))
          .flatMap((field) =>
            [values[formKey(field.name)] ?? []]
              .flat()
              .map((_, at) => [`${formKey(field.name)}[${at}]`, { presentation: 'plain' }]),
          ),
      ),
      // Each keyed line is its own bound editor, labelled by its position (`F-1.2`).
      ...Object.fromEntries(
        keyed.flatMap(({ name }) =>
          entriesOf(name).flatMap(({ key }, at) => [
            [
              `${formKey(name)}[${at}].text`,
              { collaborative: true, label: labelOf(blocks, block, key) ?? key, hideLabel: true, readonly },
            ],
          ]),
        ),
      ),
    }),
    [schema, raw, readonly, active, named, blocks, block, context, JSON.stringify(values), t],
  );

  // A list element of a keyed field or a table is one line, rather than a group of its parts: a keyed line's text
  // beside the label the spec cites it by, and a table row as the source writes it until the card is pressed.
  const line = useCallback<FormFieldProvider>(
    ({ fieldProps: { path = [], type, getValue, onValueChange, onBlur, readonly: fixed } }) => {
      const [name, at] = path;
      const field =
        path.length === 2 && typeof at === 'number'
          ? schema.fields.find((candidate) => formKey(candidate.name) === name)
          : undefined;
      if (field?.type.kind === 'keyed') {
        const key = (getValue() as Partial<Entry> | undefined)?.key ?? '';
        return (
          <Layout.Flex align='baseline' gap='sm'>
            <span className={LABEL} style={hueText(schema.hue)}>
              {labelOf(blocks, block, key) ?? key}
            </span>
            <Layout.Container gutter='none' classNames='grow basis-0 min-w-0'>
              <Form.Fields path={[name, at]} include={['text']} layout='plain' />
            </Layout.Container>
          </Layout.Flex>
        );
      }
      if (field?.type.kind === 'map') {
        // A row reads as its source writes it, `name?: value`, in the same columns at rest and pressed: the names in a
        // column as wide as the longest, then the `?` that marks an optional row (its switch once pressed), then the value.
        const row = (getValue() ?? {}) as Partial<Row>;
        const typed = field.type.value === 'type';
        const names = ((values[name] ?? []) as readonly Partial<Row>[]).map((other) => other.name?.length ?? 0);
        const width = `${Math.max(MIN_NAME, ...names) + 1}ch`;
        return (
          <Layout.Flex align='center' data-testid={`${name}[${at}]`}>
            <div className='shrink-0' style={{ width }}>
              {fixed ? (
                <span className='block truncate'>{row.name}</span>
              ) : (
                <Form.Fields path={[name, at]} include={['name']} layout='plain' />
              )}
            </div>
            <span className='shrink-0 w-[2ch] text-description'>
              {typed && !fixed ? (
                <button
                  type='button'
                  className={mx('rounded-sm', !row.optional && 'opacity-30 hover:opacity-100')}
                  aria-pressed={!!row.optional}
                  aria-label={t('spec-block.optional.label')}
                  title={t('spec-block.optional.label')}
                  data-testid={`${name}[${at}].optional`}
                  onClick={() => {
                    onValueChange(type, { ...row, optional: !row.optional });
                    onBlur();
                  }}
                >
                  ?
                </button>
              ) : (
                <span className={row.optional ? undefined : 'invisible'}>?</span>
              )}
              :
            </span>
            <div
              className={mx('grow basis-0 min-w-0', !typed && 'text-description')}
              style={typed ? hueText(blocks.schemas.get('type')?.hue) : undefined}
            >
              {fixed ? (
                <span className='block truncate'>{row.value}</span>
              ) : (
                <Form.Fields path={[name, at]} include={['value']} layout='plain' />
              )}
            </div>
          </Layout.Flex>
        );
      }
      return undefined;
    },
    [blocks, block, schema, values, t],
  );

  const handleValuesChanged = useCallback(
    (next: Record<string, unknown>) =>
      updateBlock(view, { kind, id, index }, (before) => fromFormValues(schema, before, next, context)),
    [view, schema, kind, id, index, context],
  );

  // A block a slash command just wrote opens with its first field focused, once its editor has taken its text; a renamed
  // one, drawn anew, takes back the focus it had.
  useEffect(() => {
    const request = focusRequested(view.state, locator);
    if (request) {
      view.dispatch({ effects: focusBlockEffect.of(undefined) });
      requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>(request.target ?? '.cm-content')?.focus());
    }
  }, [view, locator]);

  const [folded, setFolded] = useState(false);
  const label = labelOf(blocks, block) ?? (block.id || undefined);
  const hue = hues.find((candidate) => candidate === schema.hue);
  // Lines the codec reads as prose only when they come before the first field; the source view shows the rest.
  const stray = block.fields.length > 0 ? block.prose.filter((line) => line.from > block.fields[0].from).length : 0;
  const tags = schema.fields.filter((field) => isTagField(field, value)).map(({ name }) => formKey(name));
  const rows = bodyRows(schema, value, named);

  return (
    // The frame takes focus for the card as an embed's does: the arrows stop on it, Enter goes in, Escape comes back out.
    <Editor.BlockFrame view={view} attended classNames='my-1' ref={ref}>
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
            <Card.Root grid data-testid='spec-block' data-kind={block.kind} ref={cardRef}>
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
                    <Form.Fields include={tags} layout='tag' />
                    <Icon.Icon icon={schema.icon ?? 'ph--cube--regular'} hue={hue} label={block.kind} />
                  </Layout.Flex>
                }
              >
                {named ? (
                  <BlockName view={view} locator={locator} name={block.id} kind={block.kind} readonly={readonly} />
                ) : (
                  <Layout.Flex align='center' gap='sm'>
                    <span
                      className={LABEL}
                      style={hueText(schema.hue)}
                      title={block.kind}
                      data-testid='spec-block.label'
                    >
                      {label ?? block.kind}
                    </span>
                    <Layout.Flex column grow>
                      <Form.Fields include={[TITLE]} />
                    </Layout.Flex>
                  </Layout.Flex>
                )}
              </Card.Row>
              {!folded &&
                rows.map(({ key, field }) => {
                  if (describing.includes(key) ? !isShown(key) : !active && isEmpty(values[key])) {
                    return null;
                  }
                  // Each row is a template root of its own, so its fields lay out in the row rather than the form's tracks.
                  // Every field but what describes the block is labelled. A row an active card adds fades in.
                  return (
                    <Card.Row key={key} span='end' classNames={isEmpty(values[key]) && REVEAL}>
                      {field && !describing.includes(key) ? (
                        <Layout.Flex align='baseline' gap='sm'>
                          <span className={FIELD_LABEL}>{fieldTitle(field.name)}</span>
                          <Layout.Container
                            gutter='none'
                            classNames={mx(
                              'grow basis-0 min-w-0',
                              !active && isOrderedField(field, value, blocks) && AT_REST_LIST,
                            )}
                          >
                            <Form.Fields include={[key]} fieldProvider={line} />
                          </Layout.Container>
                        </Layout.Flex>
                      ) : (
                        <Layout.Container gutter='none'>
                          <Form.Fields include={[key]} />
                        </Layout.Container>
                      )}
                    </Card.Row>
                  );
                })}
              {!folded && stray > 0 && (
                <Card.Row icon='ph--warning--regular' data-testid='spec-block.stray'>
                  <Card.Text variant='muted'>{t('spec-block.stray-prose.message', { count: stray })}</Card.Text>
                </Card.Row>
              )}
            </Card.Root>
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Editor.BlockFrame>
  );
};

const NAMED_ROLES: readonly BlockRole[] = ['context', 'structure'];

/** How long a card takes to grow or shrink, and a row it adds to fade in. */
const MOTION_MS = 160;

/** A list at rest keeps the gutter its drag handles take and the height of its controls once pressed, so no row moves. */
const AT_REST_LIST =
  '[&_.dx-listbox-content]:ps-(--dx-block-size) [&_.dx-listbox-item]:min-h-(--dx-block-size) [&_.dx-listbox-item]:items-center';

const REVEAL = 'transition-opacity duration-[160ms] ease-out starting:opacity-0 motion-reduce:transition-none';

/**
 * Slides `outer` between the heights `inner` takes, so a card that grows or shrinks moves the text after it rather than
 * jumping it; the content it is growing to show is clipped until it has room.
 */
const useSmoothHeight = (outer: RefObject<HTMLElement | null>, inner: RefObject<HTMLElement | null>) => {
  const reducedMotion = Util.useReducedMotion();
  useLayoutEffect(() => {
    const frame = outer.current;
    const content = inner.current;
    if (!frame || !content || reducedMotion) {
      return;
    }
    let height = content.offsetHeight;
    let animation: Animation | undefined;
    const observer = new ResizeObserver(() => {
      const next = content.offsetHeight;
      if (next === height) {
        return;
      }
      // A change mid-slide starts from where the slide has got to.
      const from = animation?.playState === 'running' ? frame.offsetHeight : height;
      height = next;
      animation?.cancel();
      animation = frame.animate(
        [
          { height: `${from}px`, overflow: 'clip' },
          { height: `${next}px`, overflow: 'clip' },
        ],
        { duration: MOTION_MS, easing: 'ease-out' },
      );
    });
    observer.observe(content);
    return () => {
      observer.disconnect();
      animation?.cancel();
    };
  }, [outer, inner, reducedMotion]);
};

const NAME_TESTID = 'spec-block.label';

/** The selector that finds the field `target` is in again in a card drawn anew, or undefined outside `card`. */
const focusTarget = (target: EventTarget | null, card: Element | null): string | undefined => {
  const field = target instanceof Element && card?.contains(target) ? target.closest('[data-testid]') : null;
  return field
    ? `[data-testid="${field.getAttribute('data-testid')}"] :is(input, [contenteditable="true"])`
    : undefined;
};

type BlockNameProps = Pick<BlockFormProps, 'view' | 'locator'> & { name: string; kind: string; readonly?: boolean };

/**
 * A block's name heading its card, edited in place and renamed on Enter or on leaving it; Escape keeps the name. A name
 * the header cannot carry is dropped.
 */
const BlockName = ({ view, locator, name, kind, readonly }: BlockNameProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  return (
    <Input.Root
      key={name}
      variant='title'
      classNames={NAME}
      defaultValue={name}
      disabled={readonly}
      title={kind}
      aria-label={t('spec-block.name.label')}
      spellCheck={false}
      data-testid={NAME_TESTID}
      onBlur={(event) => {
        const card = event.currentTarget.closest('[data-testid="spec-block"]');
        renameBlock(view, locator, event.currentTarget.value.trim(), focusTarget(event.relatedTarget, card));
        event.currentTarget.value = name;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault();
          renameBlock(view, locator, event.currentTarget.value.trim(), `[data-testid="${NAME_TESTID}"]`);
        }
        if (event.key === 'Escape') {
          event.currentTarget.value = name;
        }
      }}
    />
  );
};

/** Text in a kind's hue, as the source view colours ids, so a label reads as its kind's; plain for no hue. */
const hueText = (hue: string | undefined): CSSProperties | undefined =>
  hues.some((candidate) => candidate === hue) ? { color: `var(--color-${hue}-text)` } : undefined;

/** The field a kind describes a block in besides its prose, as the language's kinds name it. */
const DESCRIPTION = 'desc';

/** The fewest characters a map's name column holds, so a short name leaves room to type. */
const MIN_NAME = 4;

/** A block's name heading its card, at a title's size. */
const NAME = 'text-xl font-medium';

/** A label or key, small and on one line, as the spec cites it (`F-4`, `F-4.1`). */
const LABEL = 'shrink-0 text-xs text-description tabular-nums whitespace-nowrap';

/** A choice from a fixed set reads as a tag in the header, as a status does. */
const isTagField = (field: FieldSchema, value: BlockValue) =>
  field.type.kind === 'literal' && !isBoundField(field, value);

/** A label beside its field's value, in a column wide enough to line the values up. */
const FIELD_LABEL = 'shrink-0 w-20 truncate text-sm text-description';

/**
 * The rows under the header in the block's order: the header's text when the name heads the card, its prose, then each
 * field that is not a tag in the header.
 */
const bodyRows = (schema: BlockSchema, value: BlockValue, named: boolean): { key: string; field?: FieldSchema }[] => [
  ...(named ? [{ key: TITLE }] : []),
  ...(schema.inlineProse ? [{ key: PROSE }] : []),
  ...schema.fields.filter((field) => !isTagField(field, value)).map((field) => ({ key: formKey(field.name), field })),
];

/**
 * Whether the card holds focus or took the last press. Only focus or a press elsewhere in the spec's editor ends it, so
 * a menu the card opens (portalled outside it) and a button that takes no focus (Safari) leave it active; the frame
 * taking focus, as the arrows give it, leaves it as it was. A press activates the card once it is released: the fields
 * an active card adds move what is under the pointer, which would otherwise take the click.
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
        if (!pressed && target !== element) {
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
