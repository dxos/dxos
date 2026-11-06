//
// Copyright 2026 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { type ComponentPropsWithoutRef, forwardRef, useMemo } from 'react';

import { type FieldSchema, type FieldValue, type SourceBlock, isSpecReference, parseCitation } from '@dxos/deus/schema';
import { ObjectMultiPicker, ObjectPicker, type RefOption } from '@dxos/react-ui-form';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Tag from '@dxos/react-ui/Tag';

import { ProjectsNamespace } from '../../namespace.ts';
import { setField, updateBlock } from './block-value.ts';
import { type BlockLocator, type SpecBlocks, specBlocksConfig } from './spec-blocks-state.ts';

/** The blocks of the given kinds (any kind for none) a reference may name, by key, labelled as the spec reads them. */
export const blockOptions = (
  { items, schemas }: SpecBlocks,
  kinds: readonly string[],
  self?: SourceBlock,
): RefOption[] =>
  items
    .filter(
      (item) => !item.entry && item.key && item.block !== self && (kinds.length === 0 || kinds.includes(item.kind)),
    )
    .map(({ kind, key, label, block }) => ({
      id: key,
      label: label ?? key,
      description: block.title,
      icon: schemas.get(kind)?.icon,
      iconHue: schemas.get(kind)?.hue,
    }));

/** The built-in type names a type expression may use besides the spec's `type` blocks. */
const PRIMITIVES = ['any', 'boolean', 'Date', 'number', 'ReactNode', 'string', 'unknown', 'void'];

/** What a type expression may name: the built-in types, then the spec's `type` blocks. */
export const typeOptions = (blocks: SpecBlocks): RefOption[] => [
  ...PRIMITIVES.map((name) => ({ id: name, label: name })),
  ...blockOptions(blocks, ['type']),
];

/** A type expression a picker edits: one type's name, or a list of it (`Message[]`); other expressions are text. */
export const parseTypeName = (expr: string): { name: string; list: boolean } | undefined => {
  const match = expr.trim().match(/^([A-Za-z_][\w.]*)?(\[\])?$/);
  return match ? { name: match[1] ?? '', list: !!match[2] } : undefined;
};

/** Whether the card edits a type expression with a picker rather than as text. */
export const isPickedType = (value: FieldValue | undefined) =>
  typeof (value ?? '') === 'string' && !!parseTypeName(String(value ?? ''));

type PickerButtonProps = ComponentPropsWithoutRef<'button'> & { empty?: boolean; unknown?: boolean };

/** A picker's trigger that reads as the value it holds, so a row keeps the room of its source. */
const PickerButton = forwardRef<HTMLButtonElement, PickerButtonProps>(
  ({ empty, unknown, className, children, ...props }, forwardedRef) => (
    <button
      type='button'
      {...props}
      className={[
        'rounded-sm text-start decoration-dotted underline-offset-4 hover:underline focus-visible:underline',
        empty && 'text-description',
        unknown && 'text-error-fg',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      ref={forwardedRef}
    >
      {children}
    </button>
  ),
);

export type TypePickerProps = {
  'value': string;
  /** The spec's `type` blocks. */
  'options': RefOption[];
  'readonly': boolean;
  /** Whether the list toggle shows while off; a list's `[]` always shows. */
  'actions'?: boolean;
  'data-testid'?: string;
  /** Called with the new expression, or `undefined` once no type is picked. */
  'onChange': (value: string | undefined) => void;
};

/** Picks a `type` block of the spec by name, with a toggle for a list of it; a name the spec does not define is flagged. */
export const TypePicker = ({ value, options, readonly, actions, onChange, 'data-testid': testId }: TypePickerProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const { name, list } = parseTypeName(value) ?? { name: '', list: false };
  const unknown = !!name && !options.some((option) => option.id === name);
  const write = (next: string | undefined, nextList: boolean) =>
    onChange(next ? `${next}${nextList ? '[]' : ''}` : undefined);
  const label = name || t('spec-block.type.placeholder');
  const title = unknown ? t('spec-block.unknown-type.message', { name }) : undefined;
  if (readonly) {
    return (
      <span className={unknown ? 'text-error-fg' : undefined} title={title} data-testid={testId}>
        {name && `${name}${list ? '[]' : ''}`}
      </span>
    );
  }
  return (
    <span className='group inline-flex items-baseline' data-testid={testId}>
      <ObjectPicker
        value={name || undefined}
        options={unknown ? [...options, { id: name, label: name, hue: 'red' }] : options}
        trigger={
          <PickerButton empty={!name} unknown={unknown} title={title}>
            {label}
          </PickerButton>
        }
        onSelect={(id) => write(id, list)}
      />
      {name && (list || actions) && (
        <PickerButton
          empty={!list}
          // Off, the toggle shows on hover, so a type that is not a list never reads as one.
          className={list ? undefined : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}
          aria-pressed={list}
          title={t('spec-block.type-list.label')}
          onClick={() => write(name, !list)}
        >
          []
        </PickerButton>
      )}
    </span>
  );
};

/** A block named with its kind, as the app dialect writes references (`op:Sort`, `type:Message`). */
const PREFIXED = /^([a-z][\w-]*):(.+)$/;

/** A name a block of the spec could have; anything else (a path, a `github:` key, a `user:`) is outside the spec. */
const LOCAL = /^[\w.-]+$/;

/** Whether a reference field names blocks of this spec, so a picker can offer them; `ActorRef` names people instead. */
export const isPickedRef = (field: FieldSchema, { schemas }: SpecBlocks) =>
  isSpecReference(field) ||
  (field.type.kind === 'ref' && (field.type.to.length === 0 || field.type.to.some((kind) => schemas.has(kind))));

export type RefFieldProps = {
  view: EditorView;
  locator: BlockLocator;
  blocks: SpecBlocks;
  block: SourceBlock;
  field: FieldSchema;
  held: FieldValue | undefined;
  readonly: boolean;
};

/**
 * A `Ref<kind>` field as a picker over the blocks it may name, or over the space's specs for `Ref<spec>`; a list of
 * references as chips. A block name the spec does not hold is flagged; a name outside the spec shows as written.
 */
export const RefField = ({ view, locator, blocks, block, field, held, readonly }: RefFieldProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const spec = isSpecReference(field);
  const kinds = field.type.kind === 'ref' ? field.type.to : [];
  const many = field.type.kind === 'ref' && field.type.many;
  const specs = view.state.facet(specBlocksConfig).specs;
  const options = useMemo(
    () =>
      spec
        ? (specs?.() ?? []).map(({ id, name }) => ({ id: `echo:///${id}`, label: name || id }))
        : blockOptions(blocks, kinds, block),
    [spec, specs, blocks, kinds.join('|'), block],
  );

  const names = [held ?? []].flat().map(String).filter(Boolean);
  // Written with kinds when the field takes several or the source already writes them.
  const prefixed = kinds.length > 1 || names.some((name) => blocks.schemas.has(name.match(PREFIXED)?.[1] ?? ''));
  // Each name as the option it picks: a block by its key or its positional label (`F-1`), a spec in any form it is cited.
  const parsed = names.map((name) => {
    if (spec) {
      const id = options.find((option) => parseCitation(option.id).spec === parseCitation(name).spec)?.id;
      return { id: id ?? name, name, local: false };
    }
    const match = name.match(PREFIXED);
    const key = match && blocks.schemas.has(match[1]) ? match[2] : name;
    const id = options.find((option) => option.id === key || option.label === key)?.id;
    return { id: id ?? key, name, local: !id && LOCAL.test(key) };
  });
  const ids = parsed.map(({ id }) => id);
  const unknown = parsed.filter(({ id }) => !options.some((option) => option.id === id));
  const all = [
    ...options,
    ...unknown.map(({ id, name, local }) => ({
      id,
      label: name,
      ...(local && { hue: 'red' as const, description: t('spec-block.unknown-ref.message') }),
    })),
  ];
  const kindOf = (id: string) => blocks.items.find((item) => !item.entry && item.key === id)?.kind;
  const nameOf = (id: string) => {
    const kind = kindOf(id);
    return kind && prefixed ? `${kind}:${id}` : (parsed.find((entry) => entry.id === id)?.name ?? id);
  };
  const write = (next: readonly string[]) => {
    const written = next.map(nameOf);
    updateBlock(view, locator, setField(field.name, many ? (written.length > 0 ? written : undefined) : written[0]));
  };
  const labelOf = (id: string) => all.find((option) => option.id === id)?.label ?? id;
  const flagged = (id: string) => unknown.some((entry) => entry.id === id && entry.local);

  if (readonly) {
    return (
      <span className='inline-flex flex-wrap gap-1' data-testid={`spec-block.${field.name}`}>
        {ids.map((id) => (
          <Tag.Tag key={id}>{labelOf(id)}</Tag.Tag>
        ))}
      </span>
    );
  }
  if (many) {
    return (
      <ObjectMultiPicker
        value={ids}
        options={all}
        placeholder={t('spec-block.ref.placeholder')}
        data-testid={`spec-block.${field.name}`}
        onValueChange={write}
      />
    );
  }
  const [id] = ids;
  return (
    <ObjectPicker
      value={id}
      options={all}
      trigger={
        <PickerButton empty={!id} unknown={!!id && flagged(id)} data-testid={`spec-block.${field.name}`}>
          {id ? labelOf(id) : t('spec-block.ref.placeholder')}
        </PickerButton>
      }
      onSelect={(next) => write(next ? [next] : [])}
    />
  );
};
