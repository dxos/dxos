//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';
import React, { type ReactNode, useCallback, useRef } from 'react';

import { Annotation, Ref } from '@dxos/echo';
import { useType as defaultUseType } from '@dxos/echo-react';
import { SchemaEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { useTranslation } from '@dxos/react-ui';
import { OrderedList } from '@dxos/react-ui-list';
import { arrayMove } from '@dxos/util';

import { translationKey } from '#translations';
import { type FormFieldStateProps } from '#types';

import { useFormValues } from '../../../../../hooks';
import { getFormProperties } from '../../../../../util';
import { FieldHeader } from '../../FieldHeader';
import { CompactIconButton, FormField, type FormFieldProps } from '../../FormField';

// Synthetic id assigned to each row when rendering an ordered list. Plain form
// values have no stable identity, so drag-and-drop (which requires a stable key
// surviving the `onValuesChanged` round-trip) is given one here and kept in
// lockstep with the array via the add/delete/move handlers.
const DND_ID = '__dndId';

type OrderedItem = {
  [DND_ID]: string;
  value: unknown;
  index: number;
};

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

  // Owned-ref array (`FormCreateAnnotation`): "add" creates a new target object of the annotation's typename,
  // and each row renders that target inline (no existing-object picker).
  const { db, onCreate, getCreateDefaults, useType = defaultUseType } = props;
  const createTypename = Annotation.FormCreateAnnotation.getFromAst(type).pipe(Option.getOrUndefined);
  const createSchema = useType(db, createTypename ? DXN.make(createTypename) : undefined);
  const createInline =
    !!createTypename && !!elementType && Ref.isRefType(elementType) && !readonly && layout !== 'static';

  // Synthetic identity map (see `DND_ID`). The counter only advances when the
  // array grows; reconciliation here covers the initial mount and any external
  // length change, while the handlers below keep ids aligned on mutation.
  const idsRef = useRef<string[]>([]);
  const counterRef = useRef(0);
  const nextId = useCallback(() => `${DND_ID}-${counterRef.current++}`, []);

  // Create a new owned target object and append its ref (see `createInline`).
  const handleAddCreate = useCallback(async () => {
    if (!createSchema || !onCreate) {
      return;
    }
    // Let the container pre-populate the new object (e.g. a back-reference to the parent).
    const defaults = getCreateDefaults?.({ jsonPath: SchemaEx.createJsonPath(path ?? []), schema: createSchema }) ?? {};
    const created = await onCreate(createSchema, defaults);
    if (!created) {
      return;
    }
    idsRef.current.push(nextId());
    onValueChange(type, [...(values ?? []), Ref.make(created)]);
  }, [createSchema, onCreate, getCreateDefaults, onValueChange, type, path, values, nextId]);

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
  const renderField = (index: number, isLast: boolean): ReactNode => {
    const field = (
      <FormField
        {...props}
        autoFocus={isLast}
        type={elementType}
        // Suppress the per-item header for object items and owned-ref items (both render their own
        // sub-field labels). Scalar items (refs, primitives) take the array's resolved label (e.g. its
        // `title` annotation, `Tags`) so inline-layout children (e.g. RefField) have a real label to use
        // as a fallback placeholder, rather than re-deriving it from the raw array property name (`_tags`).
        {...(renderItemAsObject || createInline ? { name: null } : { label })}
        path={[...(path ?? []), index]}
        readonly={readonly || layout === 'static'}
        layout={renderItemAsObject ? (layout === 'static' ? 'static' : undefined) : 'inline'}
        refInline={createInline || undefined}
      />
    );

    // TODO(burdon): Hacky.
    // An owned inline object form must establish its own column context: otherwise it inherits the parent
    // form's `--dx-col` (center) placement and collapses into the array row's narrow second track.
    return createInline ? (
      <div role='none' className='w-full min-w-0 [--dx-col:auto]'>
        {field}
      </div>
    ) : (
      field
    );
  };

  const header = (layout !== 'static' || (values && values.length > 0)) && (
    <FieldHeader
      label={label}
      path={SchemaEx.createJsonPath(path ?? [])}
      readonly={readonly}
      add={
        layout !== 'static'
          ? { label: t('add-item.button'), onClick: createInline ? () => void handleAddCreate() : handleAdd }
          : undefined
      }
    />
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
        <OrderedList.Root<OrderedItem> items={items} isItem={isOrderedItem} getId={getOrderedId} onMove={handleMove}>
          {({ items }) => (
            <OrderedList.Content>
              {items.map((item) => (
                <OrderedList.Item<OrderedItem>
                  key={getOrderedId(item)}
                  id={getOrderedId(item)}
                  item={item}
                  classNames='grid grid-cols-[min-content_1fr_min-content] items-start gap-1 p-0 pb-1'
                >
                  <OrderedList.DragHandle />
                  {renderField(item.index, item.index === items.length - 1)}
                  <CompactIconButton
                    icon='ph--x--regular'
                    label={t('remove-item.button')}
                    onClick={() => handleDelete(item.index)}
                  />
                </OrderedList.Item>
              ))}
            </OrderedList.Content>
          )}
        </OrderedList.Root>
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
            <div
              key={index}
              className={`grid grid-cols-[1fr_min-content] ${renderItemAsObject || createInline ? 'items-start' : 'items-center'} mb-1 last:mb-form-gap`}
            >
              {renderField(index, isLast)}
              {!readonly && layout !== 'static' && (
                <CompactIconButton
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
    case 'Refinement': {
      // Use minimum from JSON schema annotation (e.g. Schema.between(1, 31)) as the default
      // so new array items start within the valid range.
      const jsonSchema = Option.getOrUndefined(SchemaAST.getJSONSchemaAnnotation(ast));
      if (jsonSchema != null && 'minimum' in jsonSchema && typeof jsonSchema.minimum === 'number') {
        return jsonSchema.minimum;
      }
      return getDefaultValue(ast.from);
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
