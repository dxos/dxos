//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import * as StringEffect from 'effect/String';
import React, { Component, type PropsWithChildren, type ReactNode, forwardRef, useMemo } from 'react';

import { createJsonPath, findNode, getDiscriminatedType, isDiscriminatedUnion } from '@dxos/effect';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type ProjectionModel, type SchemaProperty, getSchemaProperties } from '@dxos/schema';
import { isTruthy } from '@dxos/util';

import { type QueryRefOptions } from '../../hooks';
import { getRefProps } from '../../util';

import { ArrayField } from './ArrayField';
import { SelectInput } from './Defaults';
import { getInputComponent } from './factory';
import { type ComponentLookup } from './Form';
import { useFormValues, useInputProps } from './FormContext';
import { type InputComponent } from './Input';
import { RefField, type RefFieldProps } from './RefField';

export type FormFieldProps = {
  property: SchemaProperty<any>;
  path?: (string | number)[];
  /** Used to indicate if input should be presented inline (e.g. for array items). */
  inline?: boolean;
  projection?: ProjectionModel;
  lookupComponent?: ComponentLookup;
  Custom?: Partial<Record<string, InputComponent>>;
} & Pick<
  RefFieldProps,
  | 'readonly'
  | 'onQueryRefOptions'
  | 'createOptionLabel'
  | 'createOptionIcon'
  | 'onCreate'
  | 'createSchema'
  | 'createInitialValuePath'
>;

export const FormField = ({
  property,
  path,
  readonly,
  inline,
  projection,
  onQueryRefOptions,
  createOptionLabel,
  createOptionIcon,
  onCreate,
  createSchema,
  createInitialValuePath,
  lookupComponent,
  Custom,
}: FormFieldProps) => {
  const { ast, name, type, format, title, description, options, examples, array } = property;
  const inputProps = useInputProps(path);

  const label = useMemo(() => title ?? Function.pipe(name, StringEffect.capitalize), [title, name]);
  const placeholder = useMemo(
    () => (examples?.length ? `Example: "${examples[0]}"` : description),
    [examples, description],
  );

  //
  // Registry and Custom.
  //

  const FoundComponent = lookupComponent?.({
    prop: name,
    schema: Schema.make(ast),
    inputProps: {
      type,
      format,
      label,
      readonly,
      placeholder,
      ...inputProps,
    },
  });

  if (FoundComponent) {
    return FoundComponent;
  }

  const jsonPath = createJsonPath(path ?? []);
  const CustomComponent = Custom?.[jsonPath];
  if (CustomComponent) {
    return (
      <CustomComponent
        type={type}
        format={format}
        label={label}
        inputOnly={inline}
        placeholder={placeholder}
        readonly={readonly}
        {...inputProps}
      />
    );
  }

  //
  // Refs.
  //

  const refProps = getRefProps(property);
  if (refProps) {
    return (
      <RefField
        ast={refProps.ast}
        array={refProps.isArray}
        type={type}
        format={format}
        label={label}
        placeholder={placeholder}
        readonly={readonly}
        inputOnly={inline}
        onQueryRefOptions={onQueryRefOptions}
        createOptionLabel={createOptionLabel}
        createOptionIcon={createOptionIcon}
        onCreate={onCreate}
        createSchema={createSchema}
        createInitialValuePath={createInitialValuePath}
        {...inputProps}
      />
    );
  }

  //
  // Arrays.
  //

  if (array) {
    return <ArrayField property={property} path={path} inputProps={inputProps} readonly={readonly} Custom={Custom} />;
  }

  //
  // Standard Inputs.
  //

  const InputComponent = getInputComponent(type, format);
  if (InputComponent) {
    return (
      <InputComponent
        type={type}
        format={format}
        label={label}
        inputOnly={inline}
        placeholder={placeholder}
        readonly={readonly}
        {...inputProps}
      />
    );
  }

  //
  // Select.
  //

  if (options) {
    return (
      <SelectInput
        type={type}
        format={format}
        readonly={readonly}
        inputOnly={inline}
        label={label}
        options={options.map((option) => ({ value: option, label: String(option) }))}
        placeholder={placeholder}
        {...inputProps}
      />
    );
  }

  //
  // Nested Objects.
  //

  if (type === 'object') {
    const baseNode = findNode(ast, isDiscriminatedUnion);
    const typeLiteral = baseNode
      ? getDiscriminatedType(baseNode, inputProps.getValue() as any)
      : findNode(ast, SchemaAST.isTypeLiteral);

    if (typeLiteral) {
      return (
        <>
          {!inline && <h3 className={mx('text-lg mlb-inputSpacingBlock first:mbs-0')}>{label}</h3>}
          <FormFields
            schema={Schema.make(typeLiteral)}
            path={path}
            readonly={readonly}
            projection={projection}
            onQueryRefOptions={onQueryRefOptions}
            createOptionLabel={createOptionLabel}
            createOptionIcon={createOptionIcon}
            onCreate={onCreate}
            Custom={Custom}
            lookupComponent={lookupComponent}
          />
        </>
      );
    }
  }

  return null;
};

export type FormFieldsProps = ThemedClassName<
  {
    testId?: string;
    schema: Schema.Schema.All;
    /**
     * Path to the current object from the root. Used with nested forms.
     */
    path?: (string | number)[];
    filter?: (props: SchemaProperty<any>[]) => SchemaProperty<any>[];
    sort?: string[];
    /**
     * Optional projection for projection-based field management
     */
    projection?: ProjectionModel;
    lookupComponent?: ComponentLookup;
    /**
     * Map of custom renderers for specific properties.
     * Prefer lookupComponent for plugin specific input surfaces.
     */
    Custom?: Partial<Record<string, InputComponent>>;
    onQueryRefOptions?: QueryRefOptions;
  } & Pick<FormFieldProps, 'readonly'> &
    Pick<
      RefFieldProps,
      | 'onQueryRefOptions'
      | 'createOptionLabel'
      | 'createOptionIcon'
      | 'onCreate'
      | 'createSchema'
      | 'createInitialValuePath'
    >
>;

export const FormFields = forwardRef<HTMLDivElement, FormFieldsProps>(
  (
    {
      classNames,
      schema,
      path,
      filter,
      sort,
      projection,
      readonly,
      lookupComponent,
      Custom,
      onQueryRefOptions,
      ...props
    },
    forwardRef,
  ) => {
    const values = useFormValues(path);
    const properties = useMemo(() => {
      const props = getSchemaProperties(schema.ast, values);

      // Use projection-based field management when view and projection are available
      if (projection) {
        const fieldProjections = projection.getFieldProjections();
        const hiddenProperties = new Set(projection.getHiddenProperties());

        // Filter properties to only include visible ones and order by projection
        const visibleProps = props.filter((prop) => !hiddenProperties.has(prop.name));
        const orderedProps: SchemaProperty<any>[] = [];

        // Add properties in projection field order
        for (const fieldProjection of fieldProjections) {
          const fieldPath = String(fieldProjection.field.path);
          const prop = visibleProps.find((p) => p.name === fieldPath);
          if (prop) {
            orderedProps.push(prop);
          }
        }

        // Add any remaining properties not in projection
        const projectionPaths = new Set(fieldProjections.map((fp) => String(fp.field.path)));
        const remainingProps = visibleProps.filter((prop) => !projectionPaths.has(prop.name));
        orderedProps.push(...remainingProps);

        return orderedProps;
      }

      // Fallback to legacy filter/sort behavior
      const filtered = filter ? filter(props) : props;
      return sort ? filtered.sort((a, b) => sort.indexOf(a.name) - sort.indexOf(b.name)) : filtered;
    }, [schema, values, filter, sort, projection?.fields]);

    return (
      <div role='form' className={mx('is-full', classNames)} ref={forwardRef}>
        {properties
          .map((property) => {
            return (
              <ErrorBoundary key={property.name} path={[...(path ?? []), property.name]}>
                <FormField
                  property={property}
                  path={[...(path ?? []), property.name]}
                  readonly={readonly}
                  projection={projection}
                  onQueryRefOptions={onQueryRefOptions}
                  lookupComponent={lookupComponent}
                  Custom={Custom}
                  {...props}
                />
              </ErrorBoundary>
            );
          })
          .filter(isTruthy)}
      </div>
    );
  },
);

type ErrorState = {
  error: Error | undefined;
};

type ErrorBoundaryProps = PropsWithChildren<{
  path?: (string | number)[];
}>;

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorState> {
  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  override state = { error: undefined };

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (prevProps.path !== this.props.path) {
      this.resetError();
    }
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className='flex gap-2 border border-roseFill font-mono text-sm'>
          <span className='bg-roseFill text-surfaceText pli-1 font-thin'>ERROR</span>
          {String(this.props.path?.join('.'))}
        </div>
      );
    }

    return this.props.children;
  }

  private resetError(): void {
    this.setState({ error: undefined });
  }
}
