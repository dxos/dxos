//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import React, { useCallback, useRef } from 'react';

import { Annotation, Ref } from '@dxos/echo';
import { useType as defaultUseType } from '@dxos/echo-react';
import { type AnyProperties } from '@dxos/echo/internal';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { OrderedList } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';
import { arrayMove } from '@dxos/util';

import { translationKey } from '#translations';
import { type FormFieldStateProps } from '#types';

import { useFormValues } from '../../hooks/index.ts';
import { getFormProperties } from '../../util/index.ts';
import { FormFieldDispatch } from '../FormFieldDispatch.tsx';
import { FormFieldSet } from '../FormFieldSet.tsx';
import { CELL, LayoutHeader, rowLayout } from '../FormLayout.tsx';
import { gridTracks } from '../layout/parser.ts';
import { resolveLayoutField } from '../layout/resolve-layout-field.ts';
import { type FormFieldDispatchProps } from '../resolve-field.ts';
import { getDefaultValue } from './default-value.ts';

type Item = { id: string; index: number };

export type ArrayFieldProps = {
  label: string;
  /** Drop the header for a host whose heading already names the list (which keeps `label` as its name); the add button follows the rows. */
  hideLabel?: boolean;
  section?: boolean;
  /** Shown in place of the rows while there are none; only a field override sets it. */
  placeholder?: string;
  /** The row the add button creates, in place of the element type's empty value; only a field override sets it. */
  newItem?: (values: readonly unknown[]) => unknown;
  /** Tops a row's parts on its first line; only a field override sets it. */
  rowAlign?: 'start';
  /** Keeps the handle and remove columns while read-only; only a field override sets it. */
  keepColumns?: boolean;
  fieldProps: FormFieldStateProps;
} & FormFieldDispatchProps;

/**
 * An array as a header row (label and an add Button) over a `react-ui-list` OrderedList whose rows hold the item's
 * control and a remove Button; a `FormOrderedAnnotation` array adds a DragHandle (pointer drag and keyboard moves).
 * An owned-ref array (`FormCreateAnnotation`) adds by creating the target, and each row is the target's fields inline.
 * An item struct laid out by a grid of fields is a row of cells in the grid's tracks, which become the list's; a header
 * grid makes a table, its titles a row above the rows and none on the cells.
 */
export const ArrayField = ({
  type,
  path,
  label,
  hideLabel,
  section,
  placeholder,
  newItem,
  rowAlign,
  keepColumns,
  readonly,
  layout,
  fieldProps,
  ...props
}: ArrayFieldProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  // A suspended element (a recursive or circular schema) renders as the type it resolves to.
  const element = SchemaEx.getArrayElementType(type);
  const elementType = element && SchemaAST.isSuspend(element) ? element.thunk() : element;
  const { onValueChange } = fieldProps;
  const values = useFormValues<unknown[]>('Form.ArrayField', path, () => []);
  const ordered = Annotation.FormOrderedAnnotation.getFromAst(type).pipe(Option.getOrElse(() => false));
  const editable = !readonly && layout !== 'static';
  const { db, onCreate, getCreateDefaults, useType = defaultUseType } = props;
  const createTypename = Annotation.FormCreateAnnotation.getFromAst(type).pipe(Option.getOrUndefined);
  const createType = useType(db, createTypename ? DXN.make(createTypename) : undefined);
  const owned = !!createTypename && !!elementType && Ref.isRefType(elementType);

  // Rows need identities that survive a reorder; values have none, so the field keeps a parallel id list.
  const idsRef = useRef<string[]>([]);
  const counterRef = useRef(0);
  // Rows created here start open, so the new target's fields are ready to fill in.
  const createdRef = useRef(new Set<string>());
  const ids = idsRef.current;
  const count = values?.length ?? 0;
  while (ids.length < count) {
    ids.push(`item-${counterRef.current++}`);
  }
  ids.length = count;
  const items: Item[] = ids.map((id, index) => ({ id, index }));

  const handleCreate = useCallback(async () => {
    if (!createType || !onCreate) {
      return;
    }
    const defaults = getCreateDefaults?.({ jsonPath: SchemaEx.createJsonPath(path ?? []), schema: createType });
    const created = await onCreate(createType, defaults ?? {});
    if (!created) {
      return;
    }
    const id = `item-${counterRef.current++}`;
    idsRef.current.push(id);
    createdRef.current.add(id);
    onValueChange(type, [...(values ?? []), Ref.make(created)]);
  }, [createType, onCreate, getCreateDefaults, path, onValueChange, type, values]);

  const handleAdd = useCallback(() => {
    let value: unknown;
    try {
      value = newItem
        ? newItem(values ?? [])
        : elementType && SchemaEx.isNestedType(elementType)
          ? defaultObject(elementType)
          : getDefaultValue(elementType);
    } catch (err) {
      log.catch(err);
      return;
    }
    onValueChange(type, [...(values ?? []), value]);
  }, [elementType, newItem, onValueChange, type, values]);

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
  const rowGrid = asObject ? rowLayout(elementType) : undefined;
  const itemSchema = rowGrid && Schema.make<Schema.Codec<AnyProperties, any>>(elementType);
  // Kept columns hold empty cells while read-only, so the rows sit where they do once editable.
  const handled = ordered && (editable || keepColumns);
  const removable = editable || keepColumns;
  const columns = [
    handled && 'var(--dx-block-size)',
    rowGrid ? gridTracks(rowGrid) : 'minmax(0, 1fr)',
    removable && 'var(--dx-block-size)',
  ]
    .filter(Boolean)
    .join(' ');

  const addButton = editable && (
    <Button.Root
      iconOnly
      variant='ghost'
      icon='ph--plus--regular'
      label={t('add-item.button')}
      disabled={owned && (!createType || !onCreate)}
      onClick={owned ? () => void handleCreate() : handleAdd}
      data-testid={`${SchemaEx.createJsonPath(path ?? [])}.add`}
    />
  );
  const list =
    count === 0 && placeholder ? (
      <Typography.Text tone='muted'>{placeholder}</Typography.Text>
    ) : (
      <OrderedList.Root
        items={items}
        getId={(item) => item.id}
        getLabel={(item) => `${label} ${item.index + 1}`}
        columns={columns}
        onMove={handleMove}
        readonly={!editable}
      >
        {({ items }) => (
          <OrderedList.Content gutter='inherit' gap='sm' align={rowAlign} aria-label={label}>
            {/* Each cell's control is named by its title, so the header row is for the eye alone. */}
            {rowGrid?.header && itemSchema && count > 0 && (
              <Layout.Container gutter='inherit' layout='row' aria-hidden>
                {handled && <span />}
                <LayoutHeader grid={rowGrid} schema={itemSchema} />
                {removable && <span />}
              </Layout.Container>
            )}
            {items.map((item) => (
              <OrderedList.Item key={item.id} id={item.id} canDrag={ordered && editable}>
                {handled && (editable ? <OrderedList.DragHandle /> : <span />)}
                {rowGrid && itemSchema ? (
                  rowGrid.children.map((child, index) => {
                    const resolved = child.kind === 'field' ? resolveLayoutField(itemSchema, child.name) : undefined;
                    return (
                      <Layout.Container
                        key={index}
                        gutter='none'
                        columns={CELL}
                        span={child.kind === 'field' ? child.span : undefined}
                      >
                        {resolved && (
                          <FormFieldDispatch
                            {...props}
                            type={resolved.type}
                            name={resolved.leafName}
                            label={resolved.title}
                            path={[...(path ?? []), item.index, ...resolved.segments]}
                            required={resolved.required}
                            readonly={!editable}
                            layout={rowGrid.header ? 'inline' : layout}
                          />
                        )}
                      </Layout.Container>
                    );
                  })
                ) : (
                  // A cell holding a nested group must be a template root, so the group's subgrid finds `content`.
                  <Layout.Container gutter='none'>
                    <FormFieldDispatch
                      {...props}
                      type={elementType}
                      name={null}
                      label={asObject || owned ? undefined : label}
                      path={[...(path ?? []), item.index]}
                      readonly={!editable}
                      layout={asObject ? layout : 'inline'}
                      refInline={owned || undefined}
                      defaultOpen={owned ? createdRef.current.has(item.id) : undefined}
                    />
                  </Layout.Container>
                )}
                {removable && !editable && <span />}
                {editable && (
                  <Button.Root
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
    );

  // A section with no name has no heading to carry its add button, so it keeps the plain header.
  if (section && label) {
    return (
      <FormFieldSet label={label} actions={addButton} presentation='section'>
        {list}
      </FormFieldSet>
    );
  }

  // The host's heading names the list, so the add button follows the rows: they stay where they were before it showed.
  if (hideLabel) {
    return (
      <>
        {list}
        {addButton && (
          <Field.Header>
            <span />
            {addButton}
          </Field.Header>
        )}
      </>
    );
  }

  // Kept columns are the header's too: its label over the cells, its add button over the remove buttons.
  if (keepColumns) {
    return (
      <>
        <Layout.Container
          gutter='none'
          layout='row'
          columns={[handled && 'var(--dx-block-size)', 'minmax(0, 1fr)', 'var(--dx-block-size)']
            .filter(Boolean)
            .join(' ')}
        >
          {handled && <span />}
          <Field.Header>
            <Typography.Text truncate>{label}</Typography.Text>
          </Field.Header>
          {addButton || <span />}
        </Layout.Container>
        {list}
      </>
    );
  }

  return (
    <>
      {(!hideLabel || addButton) && (
        <Field.Header>
          <Typography.Text truncate>{hideLabel ? '' : label}</Typography.Text>
          {addButton}
        </Field.Header>
      )}
      {list}
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
