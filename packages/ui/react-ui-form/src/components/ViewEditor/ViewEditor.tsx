//
// Copyright 2024 DXOS.org
//

import { Array, Match, Option, Schema } from 'effect';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';

import { EchoSchema, Format, type JsonProp, isMutable, toJsonSchema } from '@dxos/echo/internal';
import { type SchemaRegistry } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import {
  Callout,
  IconButton,
  Input,
  type ThemedClassName,
  useDensityContext,
  useElevationContext,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';
import { Editor, createBasicExtensions, createThemeExtensions } from '@dxos/react-ui-editor';
import { List } from '@dxos/react-ui-list';
import { cardSpacing } from '@dxos/react-ui-stack';
import { inputTheme } from '@dxos/react-ui-theme';
import { inputTextLabel, mx, subtleHover } from '@dxos/react-ui-theme';
import {
  type DataType,
  FieldSchema,
  type FieldType,
  ProjectionModel,
  VIEW_FIELD_LIMIT,
  getTypenameFromQuery,
} from '@dxos/schema';

import { translationKey } from '../../translations';
import { FieldEditor } from '../FieldEditor';
import { Form, type FormProps, type InputComponent, InputHeader, type InputProps } from '../Form';

const listGrid = 'grid grid-cols-[min-content_1fr_min-content_min-content_min-content]';
const listItemGrid = 'grid grid-cols-subgrid col-span-5';

export type ViewEditorProps = ThemedClassName<
  {
    schema: Schema.Schema.AnyNoContext;
    view: DataType.View;
    mode?: 'schema' | 'query';
    registry?: SchemaRegistry;
    readonly?: boolean;
    showHeading?: boolean;
    onQueryChanged?: (query: string, target?: string) => void;
    onDelete?: (fieldId: string) => void;
  } & Pick<FormProps<any>, 'outerSpacing'>
>;

/**
 * Schema-based object form.
 */
export const ViewEditor = forwardRef<ProjectionModel, ViewEditorProps>(
  (
    {
      classNames,
      schema,
      view,
      mode = 'schema',
      registry,
      readonly,
      showHeading = false,
      onQueryChanged,
      onDelete,
      outerSpacing = true,
    },
    forwardedRef,
  ) => {
    const schemaReadonly = !isMutable(schema);
    const { t } = useTranslation(translationKey);
    const projectionModel = useMemo(() => {
      // Use reactive and mutable version of json schema when schema is mutable.
      const jsonSchema = schema instanceof EchoSchema ? schema.jsonSchema : toJsonSchema(schema);
      return new ProjectionModel(jsonSchema, view.projection);
    }, [schema, JSON.stringify(view.projection)]);
    useImperativeHandle(forwardedRef, () => projectionModel, [projectionModel]);
    const [expandedField, setExpandedField] = useState<FieldType['id']>();

    const serializedQuery = Match.value(mode).pipe(
      Match.when('schema', () => getTypenameFromQuery(view.query.ast)),
      Match.when('query', () => {
        if (view.query.string) {
          return view.query.string;
        } else {
          return 'Serializing query AST is not currently supported.';
        }
      }),
      Match.exhaustive,
    );

    const queueTarget = Match.value(view.query.ast).pipe(
      Match.when({ type: 'options' }, ({ options }) => {
        return Option.fromNullable(options.queues).pipe(
          Option.flatMap((queues) => Array.head(queues)),
          Option.getOrUndefined,
        );
      }),
      Match.orElse(() => undefined),
    );

    const viewSchema = useMemo(() => {
      const base = Schema.Struct({
        query:
          mode === 'schema'
            ? Format.URL.annotations({ title: 'Record type' })
            : Schema.String.annotations({ title: 'Query' }),
      });

      if (mode === 'query') {
        return Schema.Struct({
          name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
          ...base.fields,
          target: Schema.optional(Schema.String.annotations({ title: 'Target Queue' })),
        }).pipe(Schema.mutable);
      }

      return base.pipe(Schema.mutable);
    }, [mode]);
    // TODO(burdon): Need to warn user of possible consequences of editing.
    // TODO(burdon): Settings should have domain name owned by user.
    const viewValues = useMemo(
      () => ({ name: view.name, query: serializedQuery, target: queueTarget }),
      [view.name, serializedQuery, queueTarget],
    );

    const handleToggleField = useCallback(
      (field: FieldType) => {
        setExpandedField((prevExpandedFieldId) => (prevExpandedFieldId === field.id ? undefined : field.id));
      },
      [readonly],
    );

    // TODO(burdon): Check if mutable; variant of useCallback that return undefined if readonly?

    const handleAdd = useCallback(() => {
      invariant(!readonly);
      const field = projectionModel.createFieldProjection();
      setExpandedField(field.id);
    }, [schema, projectionModel, readonly]);

    const handleUpdate = useCallback(
      (values: Schema.Schema.Type<typeof viewSchema>) => {
        invariant(!readonly);
        requestAnimationFrame(() => {
          if ('name' in values && view.name !== values.name) {
            view.name = values.name;
          }

          const queryChanged = serializedQuery !== values.query;
          const targetValue = 'target' in values ? values.target : undefined;
          const targetChanged = 'target' in values && values.target && queueTarget !== targetValue;

          if ((queryChanged || targetChanged) && !readonly) {
            onQueryChanged?.(values.query, targetValue);
          }
        });
      },
      [serializedQuery, onQueryChanged, readonly, view, queueTarget],
    );

    const handleDelete = useCallback(
      (fieldId: string) => {
        invariant(!readonly);
        if (fieldId === expandedField) {
          setExpandedField(undefined);
        }

        onDelete?.(fieldId);
      },
      [expandedField, onDelete, readonly],
    );

    const handleMove = useCallback(
      (fromIndex: number, toIndex: number) => {
        invariant(!readonly);
        // NOTE(ZaymonFC): Using arrayMove here causes a race condition with the kanban model.
        const fields = [...view.projection.fields];
        const [moved] = fields.splice(fromIndex, 1);
        fields.splice(toIndex, 0, moved);
        view.projection.fields = fields;
      },
      [view.projection.fields, readonly],
    );

    const handleClose = useCallback(() => setExpandedField(undefined), []);

    const handleHide = useCallback(
      (fieldId: string) => {
        setExpandedField(undefined);
        projectionModel.hideFieldProjection(fieldId);
      },
      [projectionModel],
    );

    const handleShow = useCallback(
      (property: string) => {
        setExpandedField(undefined);
        projectionModel.showFieldProjection(property as JsonProp);
      },
      [projectionModel],
    );

    const custom: Partial<Record<string, InputComponent>> = useMemo(
      () =>
        mode === 'query'
          ? {
              ['query' satisfies keyof Schema.Schema.Type<typeof viewSchema>]: (props: InputProps) => {
                const { themeMode } = useThemeContext();
                const density = useDensityContext();
                const elevation = useElevationContext();

                // TODO(wittjosiah): Including props.onValueChange in deps causes infinite loop.
                const handleChange = useCallback((text: string) => props.onValueChange('string', text), []);

                const extensions = useMemo(
                  () => [
                    createBasicExtensions({ placeholder: t('query placeholder') }),
                    createThemeExtensions({ themeMode }),
                  ],
                  [],
                );

                // TODO(wittjosiah): This is probably not the right way to do these styles.
                return (
                  <Input.Root>
                    <InputHeader label={props.label} />
                    <Editor
                      classNames={mx(
                        inputTheme.input({ density, elevation }),
                        'flex items-center',
                        'focus-within:bg-focusSurface focus-within:border-separator focus-within:hover:bg-focusSurface',
                      )}
                      extensions={extensions}
                      value={props.getValue()}
                      onChange={handleChange}
                    />
                    {/* TODO(wittjosiah): Support query editor.
                    <QueryEditor
                      classNames={mx(
                        inputTheme.input({ density, elevation }),
                        'flex items-center',
                        'focus-within:bg-focusSurface focus-within:border-separator focus-within:hover:bg-focusSurface',
                      )}
                      space={space}
                      value={props.getValue()}
                      onChange={handleChange}
                    /> */}
                  </Input.Root>
                );
              },
            }
          : {},
      [],
    );

    return (
      <div role='none' className={mx(classNames)}>
        {schemaReadonly && mode === 'schema' && (
          <Callout.Root valence='info' classNames={['mlb-cardSpacingBlock', outerSpacing && 'mli-cardSpacingInline']}>
            <Callout.Title>{t('system schema description')}</Callout.Title>
          </Callout.Root>
        )}

        {/* TODO(burdon): Is the form read-only or just the schema? */}
        {/* TODO(burdon): Readonly fields should take up the same space as editable fields (just be ghosted). */}
        <Form<Schema.Schema.Type<typeof viewSchema>>
          autoSave
          schema={viewSchema}
          values={viewValues}
          readonly={readonly ? 'disabled-input' : false}
          onSave={handleUpdate}
          outerSpacing={outerSpacing}
          Custom={custom}
        />

        <div role='none' className={outerSpacing ? cardSpacing : 'mlb-cardSpacingBlock'}>
          <h2 className={mx(inputTextLabel)}>{t('fields label')}</h2>

          <List.Root<FieldType>
            items={view.projection.fields}
            isItem={Schema.is(FieldSchema)}
            getId={(field) => field.id}
            onMove={readonly ? undefined : handleMove}
            readonly={readonly}
          >
            {({ items: fields }) => (
              <>
                {showHeading && <h3 className='text-sm'>{t('field path label')}</h3>}
                <div role='list' className={listGrid}>
                  {fields?.map((field) => {
                    const hidden = field.visible === false;
                    return (
                      <List.Item<FieldType>
                        key={field.id}
                        item={field}
                        classNames={listItemGrid}
                        aria-expanded={expandedField === field.id}
                      >
                        <div
                          role='none'
                          className={mx(subtleHover, listItemGrid, 'rounded-sm cursor-pointer min-bs-10')}
                        >
                          <List.ItemDragHandle disabled={readonly} />
                          <List.ItemTitle
                            classNames={hidden && 'text-subdued'}
                            onClick={() => handleToggleField(field)}
                          >
                            {field.path}
                          </List.ItemTitle>
                          <List.ItemButton
                            label={t(hidden ? 'show field label' : 'hide field label')}
                            data-testid={hidden ? 'show-field-button' : 'hide-field-button'}
                            icon={hidden ? 'ph--eye-closed--regular' : 'ph--eye--regular'}
                            autoHide={false}
                            disabled={readonly || (!hidden && projectionModel.fields.length <= 1)}
                            onClick={() => (hidden ? handleShow(field.path) : handleHide(field.id))}
                          />
                          {mode === 'schema' && (
                            <>
                              <List.ItemDeleteButton
                                label={t('delete field label')}
                                autoHide={false}
                                disabled={readonly || schemaReadonly || view.projection.fields.length <= 1}
                                onClick={() => handleDelete(field.id)}
                                data-testid='field.delete'
                              />
                              <IconButton
                                iconOnly
                                variant='ghost'
                                label={t('toggle expand label', { ns: 'os' })}
                                icon={
                                  expandedField === field.id ? 'ph--caret-down--regular' : 'ph--caret-right--regular'
                                }
                                onClick={() => handleToggleField(field)}
                              />
                            </>
                          )}
                        </div>
                        {expandedField === field.id && mode === 'schema' && (
                          <div role='none' className='col-span-5 mbs-1 mbe-1 border border-separator rounded-md'>
                            <FieldEditor
                              readonly={readonly || schemaReadonly ? 'disabled-input' : false}
                              projection={projectionModel}
                              field={field}
                              registry={registry}
                              onSave={handleClose}
                            />
                          </div>
                        )}
                      </List.Item>
                    );
                  })}
                </div>
              </>
            )}
          </List.Root>
        </div>

        {!readonly && !expandedField && mode === 'schema' && (
          <div role='none' className={outerSpacing ? cardSpacing : 'mlb-cardSpacingBlock'}>
            <IconButton
              icon='ph--plus--regular'
              label={t('button add property')}
              onClick={readonly ? undefined : handleAdd}
              // TODO(burdon): Show field limit in ux (not tooltip).
              disabled={view.projection.fields.length >= VIEW_FIELD_LIMIT}
              classNames='is-full'
            />
          </div>
        )}
      </div>
    );
  },
);
