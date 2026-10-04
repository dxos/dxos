//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { type KeyboardEvent, type MouseEvent, useMemo } from 'react';

import { Annotation, Entity, Obj, Ref, Type } from '@dxos/echo';
import type * as SchemaAST from '@dxos/effect/SchemaAST';
import { URI } from '@dxos/keys';
import { OrderedList } from '@dxos/react-ui-list';
import * as Field from '@dxos/react-ui/Field';
import * as Group from '@dxos/react-ui/Group';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Tag from '@dxos/react-ui/Tag';
import * as Typography from '@dxos/react-ui/Typography';
import { DxAnchorActivate, hues } from '@dxos/ui-types';
import { arrayMove } from '@dxos/util';

import { translationKey } from '#translations';
import { type CreateOptions, type FormFieldRendererProps, type RefFieldDataProps, type RefOption } from '#types';

import { ObjectMultiPicker, ObjectPicker } from '../ObjectPicker.tsx';
import { presentationFor } from '../presentation.tsx';
import { findRefOption } from './find-ref-option.ts';
import { TAG_TYPENAME, useRefCandidates } from './ref-options.ts';

/**
 * How an array of refs is presented: its `ArrayPresentationAnnotation`, else (and per option) chips for Tag refs and
 * title rows for any other type, unordered unless annotated (`ordered`, or the older `FormOrderedAnnotation`).
 */
export const getArrayPresentation = (type: SchemaAST.AST, typename: string | undefined) => {
  const presentation = Option.getOrUndefined(Annotation.ArrayPresentationAnnotation.getFromAst(type));
  return {
    display: presentation?.display ?? (typename === TAG_TYPENAME ? 'tag' : 'title'),
    ordered:
      presentation?.ordered ?? Annotation.FormOrderedAnnotation.getFromAst(type).pipe(Option.getOrElse(() => false)),
    description: presentation?.description,
  } as const;
};

export type RefArrayFieldProps = FormFieldRendererProps<readonly unknown[] | undefined> &
  RefFieldDataProps &
  CreateOptions & {
    /** The array's element: the ref type. */
    elementType: SchemaAST.AST;
  };

/**
 * An array of references, presented per {@link getArrayPresentation}:
 * - `tag`: one multiple selection of removable chips in the targets' hues (draggable within the row when ordered);
 * - `title`: a row per target (its type's icon, its label, an optional description, a Remove) that opens the object
 *   when activated, with a DragHandle when ordered, and below them a picker that adds one, with inline create.
 */
export const RefArrayField = ({
  type,
  elementType,
  readonly,
  label,
  placeholder,
  presentation,
  jsonPath,
  getValue,
  onValueChange,
  createInitialValuePath,
  createFieldMap,
  createOptionIcon,
  ...props
}: RefArrayFieldProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const { typename, entity, options, createSchema, createLabel, create } = useRefCandidates({
    ...props,
    refType: elementType,
  });
  const { display, ordered, description } = getArrayPresentation(type, typename);
  const refs = (getValue() ?? []).filter(Ref.isRef).flatMap((ref) => {
    const id = findRefOption(ref, options)?.id;
    return id ? [{ id, ref }] : [];
  });
  const ids = refs.map(({ id }) => id);
  const setIds = (next: readonly string[]) =>
    onValueChange(
      type,
      next.map((id) => Ref.fromURI(URI.make(id))),
    );
  const persist =
    create &&
    (async (values: any) => {
      const created = await create(values);
      return created ? Entity.getURI(created, { prefer: 'named' }) : undefined;
    });
  const pickerProps = {
    options,
    createSchema,
    createInitialValuePath,
    createFieldMap,
    createLabel,
    createIcon: createOptionIcon,
  };
  const isStatic = readonly || presentationFor(presentation).isStatic;
  if (!typename) {
    return null;
  }

  if (display === 'title') {
    return (
      <TitleRows
        label={label}
        ids={ids}
        options={options}
        targets={new Map(refs.map(({ id, ref }) => [id, ref.peek()]))}
        icon={entity && Option.getOrUndefined(Annotation.IconAnnotation.get(Type.getSchema(entity)))}
        description={description}
        ordered={ordered}
        readonly={isStatic}
        testId={jsonPath}
        onChange={setIds}
      >
        {!isStatic && (
          <ObjectPicker
            {...pickerProps}
            options={options.filter((option) => !ids.includes(option.id))}
            placeholder={placeholder || t('ref-field.placeholder')}
            onSelect={(id) => id && setIds([...ids, id])}
            onCreate={
              persist &&
              (async (values) => {
                const id = await persist(values);
                if (id) {
                  setIds([...ids, id]);
                }
              })
            }
          />
        )}
      </TitleRows>
    );
  }

  if (isStatic) {
    const selected = ids.flatMap((id) => options.find((option) => option.id === id) ?? []);
    return selected.length === 0 ? (
      <Typography.Text tone='muted'>{t('empty-readonly-ref-field.label')}</Typography.Text>
    ) : (
      <Group.Group>
        {selected.map((option) => (
          <Tag.Tag key={option.id} hue={hues.find((hue) => hue === option.hue)}>
            {option.label}
          </Tag.Tag>
        ))}
      </Group.Group>
    );
  }

  return (
    <ObjectMultiPicker
      {...pickerProps}
      value={ids}
      ordered={ordered}
      placeholder={placeholder || label}
      data-testid={jsonPath}
      onCreate={persist}
      onValueChange={setIds}
    />
  );
};

type TitleRowsProps = {
  label?: string;
  ids: readonly string[];
  options: RefOption[];
  /** The loaded target of each id, for the configured description field. */
  targets: ReadonlyMap<string, unknown>;
  icon?: { icon: string; hue?: string };
  description?: string;
  ordered: boolean;
  readonly: boolean;
  testId?: string;
  onChange: (ids: readonly string[]) => void;
  /** The add picker, in a row below the rows. */
  children?: React.ReactNode;
};

/** Opens a target as its anchor would (the app's preview), from the row standing in for it. */
const activate = (option: RefOption, row: HTMLElement) =>
  row.dispatchEvent(new DxAnchorActivate({ eid: option.id, label: option.label, trigger: row }));

/** The `title` rows: a header with the label, an OrderedList of the targets, then the add picker. */
const TitleRows = ({
  label,
  ids,
  options,
  targets,
  icon,
  description,
  ordered,
  readonly,
  testId,
  onChange,
  children,
}: TitleRowsProps) => {
  const rows = useMemo(
    () =>
      ids.flatMap((id) => {
        const option = options.find((option) => option.id === id);
        if (!option) {
          return [];
        }
        // The configured description field of the target, else the option's own description.
        const target = targets.get(id);
        const field = description && Obj.isObject(target) ? Obj.getValue(target, [description]) : undefined;
        return [{ ...option, description: typeof field === 'string' ? field : option.description }];
      }),
    [ids, options, targets, description],
  );
  const iconHue = hues.find((hue) => hue === icon?.hue);

  const handleMove = (from: number, to: number) => {
    const next = [...ids];
    arrayMove(next, from, to);
    onChange(next);
  };

  // A click on the row (not on one of its buttons) opens the target.
  const handleClick = (option: RefOption) => (event: MouseEvent<HTMLElement>) => {
    if (!(event.target instanceof Element && event.target.closest('button'))) {
      activate(option, event.currentTarget);
    }
  };

  // Enter on the highlighted row (focus is on the list, the row is its active descendant) opens its target.
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' || event.target !== event.currentTarget) {
      return;
    }
    const row = event.currentTarget.querySelector<HTMLElement>('[data-part="item"][data-highlighted]');
    const option = rows.find((option) => option.id === row?.dataset.value);
    if (row && option) {
      event.preventDefault();
      activate(option, row);
    }
  };

  return (
    <>
      <Field.Header>
        <Typography.Text truncate>{label}</Typography.Text>
      </Field.Header>
      {rows.length > 0 && (
        <OrderedList.Root
          items={rows}
          getId={(option) => option.id}
          getLabel={(option) => option.label}
          onMove={handleMove}
          readonly={readonly || !ordered}
        >
          {({ items }) => (
            <OrderedList.Content
              scroll={false}
              gutter='inherit'
              aria-label={label}
              data-testid={testId}
              onKeyDown={handleKeyDown}
            >
              {items.map((option) => (
                <OrderedList.Item
                  key={option.id}
                  id={option.id}
                  canDrag={ordered && !readonly}
                  onClick={handleClick(option)}
                >
                  {ordered && !readonly && <OrderedList.DragHandle />}
                  {icon && <OrderedList.ItemIcon icon={icon.icon} hue={iconHue} />}
                  <OrderedList.ItemText>{option.label}</OrderedList.ItemText>
                  {option.description && (
                    <OrderedList.ItemDescription>{option.description}</OrderedList.ItemDescription>
                  )}
                  {!readonly && (
                    <SystemButton.Remove
                      variant='ghost'
                      onClick={() => onChange(ids.filter((id) => id !== option.id))}
                    />
                  )}
                </OrderedList.Item>
              ))}
            </OrderedList.Content>
          )}
        </OrderedList.Root>
      )}
      {children}
    </>
  );
};
