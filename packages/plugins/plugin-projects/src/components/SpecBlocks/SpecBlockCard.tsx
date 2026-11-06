//
// Copyright 2026 DXOS.org
//

import { type EditorState } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import React, { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type BlockPart,
  type BlockSchema,
  type Entry,
  type SourceBlock,
  decodeBlock,
  partSource,
  patchPart,
} from '@dxos/deus/schema';
import { Form, type FormExtensionsField, type FormFieldOverride } from '@dxos/react-ui-form';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import { type WidgetProps } from '@dxos/ui-editor';
import { hues } from '@dxos/ui-types';

import { ProjectsNamespace } from '../../namespace.ts';
import { focusBlockEffect, isFocusRequested } from './block-commands.ts';
import {
  type BlockFormContext,
  PROSE,
  TITLE,
  blockFormSchema,
  formKey,
  formOptionsKey,
  fromFormValues,
  isBoundField,
  toFormValues,
} from './block-form.ts';
import { updateBlock, useSpecBlocks } from './block-value.ts';
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
  const { readonly, specs } = view.state.facet(specBlocksConfig);
  const value = decodeBlock(view.state.doc.toString(), block, schema);
  const context = useMemo<BlockFormContext>(
    () => ({
      blocks,
      block,
      specs,
      defaults: { item: t('spec-block.new-item.text'), entry: t('spec-block.new-entry.text') },
    }),
    [blocks, block, specs, t],
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
  const active = useActive(ref, view.dom) && !readonly;
  const fieldOverrides = useMemo<Record<string, FormFieldOverride>>(
    () => ({
      [TITLE]: {
        collaborative: true,
        presentation: 'title',
        hideLabel: true,
        readonly,
        placeholder: t('spec-block.title.placeholder'),
      },
      [PROSE]: {
        collaborative: true,
        presentation: 'plain',
        hideLabel: true,
        readonly,
        placeholder: t('spec-block.prose.placeholder'),
        hidden: !active && !value.prose,
      },
      ...Object.fromEntries(
        schema.fields.map((field) => [
          formKey(field.name),
          {
            readonly,
            hidden: !active && isEmpty(values[formKey(field.name)]),
            ...(isBoundField(field, value) && { collaborative: true, presentation: 'plain' }),
          },
        ]),
      ),
      // Each keyed line is its own bound editor, labelled by its position (`F-1.2`); its key is the block's business.
      ...Object.fromEntries(
        keyed.flatMap(({ name }) =>
          entriesOf(name).flatMap(({ key }, at) => [
            [`${formKey(name)}[${at}].key`, { hidden: true }],
            [
              `${formKey(name)}[${at}].text`,
              { collaborative: true, label: labelOf(blocks, block, key) ?? key, readonly },
            ],
          ]),
        ),
      ),
    }),
    [schema, raw, readonly, active, blocks, block, JSON.stringify(values), t],
  );

  const handleValuesChanged = useCallback(
    (next: Record<string, unknown>) =>
      updateBlock(view, { kind, id, index }, (before) => fromFormValues(schema, before, next, context)),
    [view, schema, kind, id, index, context],
  );

  // A block a slash command just wrote opens with its first field focused, once its editor has taken its text.
  useEffect(() => {
    if (isFocusRequested(view.state, locator)) {
      view.dispatch({ effects: focusBlockEffect.of(undefined) });
      requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('.cm-content')?.focus());
    }
  }, [view, locator]);

  const [folded, setFolded] = useState(false);
  const label = labelOf(blocks, block) ?? (block.id || undefined);
  const hue = hues.find((candidate) => candidate === schema.hue);
  // Lines the codec reads as prose only when they come before the first field; the source view shows the rest.
  const stray = block.fields.length > 0 ? block.prose.filter((line) => line.from > block.fields[0].from).length : 0;

  return (
    <Card.Root classNames='my-1' data-testid='spec-block' data-kind={block.kind} ref={ref}>
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
        trailing={<Icon.Icon icon={schema.icon ?? 'ph--cube--regular'} hue={hue} />}
      >
        <Card.Text variant='muted' data-testid='spec-block.label'>
          {label ? `${block.kind} ${label}` : block.kind}
        </Card.Text>
      </Card.Row>
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
            <Form.Fields include={folded ? [TITLE] : undefined} />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
      {!folded && stray > 0 && (
        <Card.Row icon='ph--warning--regular' data-testid='spec-block.stray'>
          <Card.Text variant='muted'>{t('spec-block.stray-prose.message', { count: stray })}</Card.Text>
        </Card.Row>
      )}
    </Card.Root>
  );
};

/**
 * Whether the card holds focus or took the last press. Only focus or a press elsewhere in the spec's editor ends it, so
 * a menu the card opens (portalled outside it) and a button that takes no focus (Safari) leave it active. A press
 * activates the card once it is released: the fields an active card adds move what is under the pointer, which would
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
