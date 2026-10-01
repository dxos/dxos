//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useRef } from 'react';

import { Annotation, Ref } from '@dxos/echo';
import { SchemaAST, SchemaEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Next, useTranslation } from '@dxos/react-ui';
import { OrderedList } from '@dxos/react-ui-list';
import { arrayMove } from '@dxos/util';

import { translationKey } from '#translations';
import { type FormFieldStateProps } from '#types';

import { useFormValues } from '../../hooks/index.ts';
import { getFormProperties } from '../../util/index.ts';
import { FormFieldDispatch } from '../FormFieldDispatch.tsx';
import { type FormFieldDispatchProps } from '../resolve-field.ts';
import { getDefaultValue } from './default-value.ts';

type Item = { id: string; index: number };

export type ArrayFieldProps = {
  label: string;
  fieldProps: FormFieldStateProps;
} & FormFieldDispatchProps;

/**
 * An array as a header row (label and an add Button) over a `react-ui-list` OrderedList whose rows hold the item's
 * control and a remove Button; a `FormOrderedAnnotation` array adds a DragHandle (pointer drag and keyboard moves).
 */
export const ArrayField = ({ type, path, label, readonly, layout, fieldProps, ...props }: ArrayFieldProps) => {
  const { t } = useTranslation(translationKey);
  const elementType = SchemaEx.getArrayElementType(type);
  const { onValueChange } = fieldProps;
  const values = useFormValues<unknown[]>('Form.ArrayField', path, () => []);
  const ordered = Annotation.FormOrderedAnnotation.getFromAst(type).pipe(Option.getOrElse(() => false));
  const editable = !readonly && layout !== 'static';

  // Rows need identities that survive a reorder; values have none, so the field keeps a parallel id list.
  const idsRef = useRef<string[]>([]);
  const counterRef = useRef(0);
  const ids = idsRef.current;
  const count = values?.length ?? 0;
  while (ids.length < count) {
    ids.push(`item-${counterRef.current++}`);
  }
  ids.length = count;
  const items: Item[] = ids.map((id, index) => ({ id, index }));

  const handleAdd = useCallback(() => {
    let value: unknown;
    try {
      value =
        elementType && SchemaEx.isNestedType(elementType) ? defaultObject(elementType) : getDefaultValue(elementType);
    } catch (err) {
      log.catch(err);
      return;
    }
    onValueChange(type, [...(values ?? []), value]);
  }, [elementType, onValueChange, type, values]);

  const handleRemove = useCallback(
    (index: number) => {
      idsRef.current.splice(index, 1);
      onValueChange(
        type,
        (values ?? []).filter((_, candidate) => candidate !== index),
      );
    },
    [onValueChange, type, values],
  );

  const handleMove = useCallback(
    (from: number, to: number) => {
      const next = [...(values ?? [])];
      arrayMove(next, from, to);
      arrayMove(idsRef.current, from, to);
      onValueChange(type, next);
    },
    [onValueChange, type, values],
  );

  if (!elementType || (!editable && count === 0)) {
    return null;
  }

  const asObject = SchemaEx.isNestedType(elementType) && !Ref.isRefType(elementType);
  const columns = [ordered && editable && 'var(--nx-block-size)', 'minmax(0, 1fr)', editable && 'var(--nx-block-size)']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <Next.Field.Header>
        <Next.Typography truncate>{label}</Next.Typography>
        {editable && (
          <Next.Button
            iconOnly
            variant='ghost'
            icon='ph--plus--regular'
            label={t('add-item.button')}
            onClick={handleAdd}
            data-testid={`${SchemaEx.createJsonPath(path ?? [])}.add`}
          />
        )}
      </Next.Field.Header>
      <OrderedList.Root
        items={items}
        getId={(item) => item.id}
        getLabel={(item) => `${label} ${item.index + 1}`}
        columns={columns}
        onMove={handleMove}
        readonly={!editable}
      >
        {({ items }) => (
          <OrderedList.Content scroll={false} gutter='inherit' gap='sm' aria-label={label}>
            {items.map((item) => (
              <OrderedList.Item key={item.id} id={item.id} canDrag={ordered && editable}>
                {ordered && editable && <OrderedList.DragHandle />}
                {/* A cell holding a nested group must be a template root, so the group's subgrid finds `content`. */}
                <Next.Container gutter='none'>
                  <FormFieldDispatch
                    {...props}
                    type={elementType}
                    name={null}
                    label={asObject ? undefined : label}
                    path={[...(path ?? []), item.index]}
                    readonly={!editable}
                    layout={asObject ? layout : 'inline'}
                  />
                </Next.Container>
                {editable && (
                  <Next.Button
                    iconOnly
                    variant='ghost'
                    icon='ph--x--regular'
                    label={t('remove-item.button')}
                    onClick={() => handleRemove(item.index)}
                  />
                )}
              </OrderedList.Item>
            ))}
          </OrderedList.Content>
        )}
      </OrderedList.Root>
    </>
  );
};

const defaultObject = (typeNode: SchemaAST.AST): Record<string, unknown> => {
  const baseNode = SchemaEx.findNode(typeNode, SchemaEx.isDiscriminatedUnion);
  const typeLiteral = baseNode
    ? SchemaEx.getDiscriminatedType(baseNode, {})
    : SchemaEx.findNode(typeNode, SchemaAST.isObjects);
  return typeLiteral
    ? Object.fromEntries(
        getFormProperties(typeLiteral).map((prop) => [prop.name, SchemaAST.getDefaultAnnotation(prop.type)]),
      )
    : {};
};
