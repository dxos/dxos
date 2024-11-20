//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type SchemaResolver } from '@dxos/echo-db';
import { AST, type MutableSchema, S } from '@dxos/echo-schema';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/react-ui-theme';
import { FieldSchema, type FieldType, type ViewType, ViewProjection, VIEW_FIELD_LIMIT } from '@dxos/schema';
import { arrayMove } from '@dxos/util';

import { translationKey } from '../../translations';
import { FieldEditor } from '../FieldEditor';
import { Form } from '../Form';

const grid = 'grid grid-cols-[32px_1fr_32px] min-bs-[2.5rem]';

// TODO(burdon): Pick from ViewType.
const ViewMetaSchema = S.Struct({
  // name: S.String.annotations({
  //   [AST.TitleAnnotationId]: 'View',
  //   [AST.DescriptionAnnotationId]: 'Enter view name',
  // }),
  // TODO(burdon): Define pattern.
  type: S.NonEmptyString.annotations({
    [AST.TitleAnnotationId]: 'Typename',
    [AST.DescriptionAnnotationId]: 'Ex. example.com/type/MyType',
  }),
}).pipe(S.mutable);

type ViewMetaType = S.Schema.Type<typeof ViewMetaSchema>;

export type ViewEditorProps = ThemedClassName<{
  schema: MutableSchema;
  view: ViewType;
  registry?: SchemaResolver;
  readonly?: boolean;
  showHeading?: boolean;
  onDelete: (fieldId: string) => void;
}>;

/**
 * Schema-based object form.
 */
export const ViewEditor = ({
  classNames,
  schema,
  view,
  registry,
  readonly,
  showHeading = false,
  onDelete,
}: ViewEditorProps) => {
  const { t } = useTranslation(translationKey);
  const projection = useMemo(() => new ViewProjection(schema, view), [schema, view]);
  const [field, setField] = useState<FieldType>();

  // TODO(burdon): Should be reactive.
  const viewValues = useMemo(() => {
    return {
      name: view.name,
      // TODO(burdon): Should change schema's typename.
      // TODO(burdon): Need to warn user of possible consequences of editing.
      // TODO(burdon): Settings should have domain name owned by user.
      type: view.query.type,
    };
  }, [view]);

  const handleViewUpdate = useCallback(
    ({ type }: ViewMetaType) => {
      requestAnimationFrame(() => {
        view.query.type = type;
        schema.updateTypename(type);
      });
    },
    [view, schema],
  );

  const handleSelect = useCallback((field: FieldType) => {
    setField((f) => (f === field ? undefined : field));
  }, []);

  const handleAdd = useCallback(() => {
    const field = projection.createFieldProjection();
    setField(field);
  }, [view]);

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      arrayMove(view.fields, fromIndex, toIndex);
    },
    [view.fields],
  );

  const handleClose = useCallback(() => setField(undefined), []);

  return (
    <div role='none' className={mx('flex flex-col w-full divide-y divide-separator', classNames)}>
      <Form<ViewMetaType> autoFocus autosave schema={ViewMetaSchema} values={viewValues} onSubmit={handleViewUpdate} />

      <div>
        {/* TODO(burdon): Clean up common form ux. */}
        <div role='none' className='p-2'>
          <label>{t('fields label')}</label>
        </div>

        <List.Root<FieldType>
          items={view.fields}
          isItem={S.is(FieldSchema)}
          getId={(field) => field.id}
          onMove={handleMove}
        >
          {({ items: fields }) => (
            <>
              {showHeading && (
                <div role='heading' className={grid}>
                  <div />
                  <div className='flex items-center text-sm'>{t('field path label')}</div>
                </div>
              )}

              <div role='list' className='flex flex-col w-full'>
                {fields?.map((field) => (
                  <List.Item<FieldType> key={field.id} item={field} classNames={mx(grid, ghostHover, 'cursor-pointer')}>
                    <List.ItemDragHandle />
                    <List.ItemTitle onClick={() => handleSelect(field)}>{field.path}</List.ItemTitle>
                    <List.ItemDeleteButton disabled={view.fields.length <= 1} onClick={() => onDelete(field.id)} />
                  </List.Item>
                ))}
              </div>
            </>
          )}
        </List.Root>
      </div>

      {field && (
        <FieldEditor
          key={field.id}
          view={view}
          projection={projection}
          field={field}
          registry={registry}
          onClose={handleClose}
        />
      )}
      {!readonly && !field && (
        <div className='flex p-2 justify-center'>
          <IconButton
            icon='ph--plus--regular'
            label={t('button add property')}
            onClick={handleAdd}
            // TODO(burdon): Show field limit in ux (not tooltip).
            disabled={view.fields.length >= VIEW_FIELD_LIMIT}
          />
        </div>
      )}
    </div>
  );
};
