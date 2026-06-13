//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';
import React, { type ReactNode, useCallback, useRef } from 'react';

import { Annotation, Ref } from '@dxos/echo';
import { SchemaEx } from '@dxos/effect';
import { useTranslation } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { arrayMove } from '@dxos/util';

import { translationKey } from '#translations';
import { type FormFieldStateProps } from '#types';

import { useFormValues } from '../../../../../hooks';
import { getFormProperties } from '../../../../../util';
import { FormField, IconBlock, type FormFieldProps } from '../../FormField';
import { FormFieldLabel } from '../../FormFieldWrapper';

// Synthetic id assigned to each row when rendering an ordered list. Plain form
// values have no stable identity, so drag-and-drop (which requires a stable key
// surviving the `onValuesChanged` round-trip) is given one here and kept in
// lockstep with the array via the add/delete/move handlers.
const DND_ID = '__dndId';

type OrderedItem = { value: unknown; index: number; [DND_ID]: string };

const isOrderedItem = (item: any): item is OrderedItem =>
  !!item && typeof item === 'object' && typeof item[DND_ID] === 'string';

const getOrderedId = (item: OrderedItem): string => item[DND_ID];

export type ArrayFieldProps = {
  label: string;
  fieldProps: FormFieldStateProps;
} & FormFieldProps;

export const ArrayField = ({
  type,
  path,
  label,
  readonly,
  layout,
  fieldProps: inputProps,
  ...props
}: ArrayFieldProps) => {
  const { t } = useTranslation(translationKey);
  const elementType = SchemaEx.getArrayElementType(type);
  const { onValueChange } = inputProps;
  const values = useFormValues(ArrayField.displayName, path, () => []);

  // Order is meaningful and user-controllable -> render as a drag-to-reorder list.
  const ordered = Annotation.FormOrderedAnnotation.getFromAst(type).pipe(Option.getOrElse(() => false));

  // Synthetic identity map (see `DND_ID`). The counter only advances when the
  // array grows; reconciliation here covers the initial mount and any external
  // length change, while the handlers below keep ids aligned on mutation.
  const idsRef = useRef<string[]>([]);
  const counterRef = useRef(0);
  const nextId = useCallback(() => `${DND_ID}-${counterRef.current++}`, []);

  const getDefaultObjectValue = (typeNode: SchemaAST.AST): any => {
    const baseNode = SchemaEx.findNode(typeNode, SchemaEx.isDiscriminatedUnion);
    const typeLiteral = baseNode
      ? SchemaEx.getDiscriminatedType(baseNode, {})
      : SchemaEx.findNode(typeNode, SchemaAST.isTypeLiteral);
    if (!typeLiteral) {
      return {};
    }

    return Object.fromEntries(
      getFormProperties(typeLiteral).map((prop) => {
        const defaultValue = SchemaAST.getDefaultAnnotation(prop.type).pipe((annotation) =>
          Option.getOrUndefined(annotation),
        );
        return [prop.name, defaultValue];
      }),
    );
  };

  const handleAdd = useCallback(() => {
    const defaultValue =
      elementType && SchemaEx.isNestedType(elementType)
        ? getDefaultObjectValue(elementType)
        : getDefaultValue(elementType);
    idsRef.current.push(nextId());
    // `values` is `undefined` on first render for arrays whose parent path
    // hasn't been materialised in the form values yet (e.g. `package.repos`
    // when the form starts with no `package`). `useFormValues`'s default-
    // value effect would eventually backfill it to `[]`, but until then the
    // old `values && ...` guard silently swallowed the click. Treat a
    // missing array as empty so Add always produces `[defaultValue]`.
    onValueChange(type, [...(values ?? []), defaultValue]);
  }, [onValueChange, type, elementType, values, nextId]);

  const handleDelete = useCallback(
    (idx: number) => {
      idsRef.current.splice(idx, 1);
      onValueChange(
        type,
        values?.filter((_, i) => i !== idx),
      );
    },
    [onValueChange, type, values],
  );

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      const next = [...(values ?? [])];
      arrayMove(next, fromIndex, toIndex);
      arrayMove(idsRef.current, fromIndex, toIndex);
      onValueChange(type, next);
    },
    [onValueChange, type, values],
  );

  if (!elementType || ((readonly || layout === 'static') && values && values.length < 1)) {
    return null;
  }

  const renderItemAsObject = elementType && SchemaEx.isNestedType(elementType) && !Ref.isRefType(elementType);

  // Object items: a recursively-rendered FormField (multiple sub-rows for the
  // object's fields). Scalar items (refs, primitives): a single inline FormField.
  const renderField = (index: number, isLast: boolean): ReactNode => (
    <FormField
      {...props}
      autoFocus={isLast}
      type={elementType}
      // Suppress the per-item header for object items only — the recursive
      // form already renders labels for each sub-field. Scalar items
      // (refs, primitives) keep the parent name so inline-layout children
      // (e.g. RefField) have a real label to use as a fallback placeholder.
      {...(renderItemAsObject && { name: null })}
      path={[...(path ?? []), index]}
      readonly={readonly || layout === 'static'}
      layout={renderItemAsObject ? (layout === 'static' ? 'static' : undefined) : 'inline'}
    />
  );

  const header = (layout !== 'static' || (values && values.length > 0)) && (
    <div className='flex items-center gap-2'>
      <div className='flex-1 min-w-0'>
        <FormFieldLabel readonly={readonly} label={label} path={SchemaEx.createJsonPath(path ?? [])} asChild />
      </div>
      {!readonly && layout !== 'static' && (
        <IconBlock inline icon='ph--plus--regular' label={t('add-item.button')} onClick={handleAdd} />
      )}
    </div>
  );

  //
  // Ordered (drag-to-reorder) list.
  //

  if (ordered && !readonly && layout !== 'static') {
    // Reconcile synthetic ids with the current values (initial mount / external change).
    const ids = idsRef.current;
    const count = values?.length ?? 0;
    while (ids.length < count) {
      ids.push(nextId());
    }
    if (ids.length > count) {
      ids.length = count;
    }
    const items: OrderedItem[] = (values ?? []).map((value, index) => ({ value, index, [DND_ID]: ids[index] }));

    return (
      <>
        {header}
        <List.Root<OrderedItem> items={items} isItem={isOrderedItem} getId={getOrderedId} onMove={handleMove}>
          {({ items }) => (
            <div role='list' className='flex flex-col'>
              {items.map((item) => (
                <List.Item<OrderedItem>
                  key={getOrderedId(item)}
                  item={item}
                  classNames='grid grid-cols-[min-content_1fr_min-content] items-start gap-1 p-0.5'
                >
                  <List.ItemDragHandle />
                  {renderField(item.index, item.index === items.length - 1)}
                  <List.ItemDeleteButton
                    autoHide={false}
                    label={t('remove-item.button')}
                    onClick={() => handleDelete(item.index)}
                  />
                </List.Item>
              ))}
            </div>
          )}
        </List.Root>
      </>
    );
  }

  //
  // Static list.
  //

  return (
    <>
      {header}

      <div className='flex flex-col'>
        {values?.map((_, index) => {
          const isLast = index === values.length - 1;
          return (
            <div key={index} className='grid grid-cols-[1fr_min-content] items-center mb-1 last:mb-form-gap'>
              {renderField(index, isLast)}
              {!readonly && layout !== 'static' && (
                <IconBlock
                  inline={!renderItemAsObject}
                  icon='ph--x--regular'
                  label={t('remove-item.button')}
                  onClick={() => handleDelete(index)}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

ArrayField.displayName = 'Form.ArrayField';

/**
 * Returns the default empty value for a given AST.
 * Used for initializing new array values etc.
 */
// TODO(wittjosiah): Factor out?
export const getDefaultValue = (ast?: SchemaAST.AST): any => {
  switch (ast?._tag) {
    case 'StringKeyword': {
      return '';
    }
    case 'NumberKeyword': {
      return 0;
    }
    case 'BooleanKeyword': {
      return false;
    }
    case 'Suspend': {
      return getDefaultValue(ast.f());
    }
    default: {
      if (ast && SchemaEx.isNestedType(ast)) {
        return {};
      } else {
        throw new Error(`Unsupported type: ${ast?._tag}`);
      }
    }
  }
};
