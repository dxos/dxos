//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import * as SchemaAST from 'effect/SchemaAST';
import * as String from 'effect/String';
import React, { Fragment, useCallback } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { SimpleType, findNode, getDiscriminatedType, isDiscriminatedUnion } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { getSchemaProperties } from '@dxos/schema';

import { translationKey } from '../../../translations';
import { findArrayElementType } from '../../../util';
import { FormField, type FormFieldProps } from '../FormField';
import { FormFieldLabel, type FormFieldStateProps } from '../FormFieldComponent';
import { useFormValues } from '../FormRoot';

export type ArrayFieldProps<T extends AnyProperties> = {
  fieldProps: FormFieldStateProps;
} & Pick<FormFieldProps<T>, 'property' | 'path' | 'readonly' | 'layout' | 'fieldMap' | 'fieldProvider'>;

export const ArrayField = <T extends AnyProperties>({
  property,
  path,
  readonly,
  layout,
  fieldProps: inputProps,
  ...props
}: ArrayFieldProps<T>) => {
  const { t } = useTranslation(translationKey);
  const { ast, type, name, title } = property;
  const label = title ?? Function.pipe(name, String.capitalize);
  const elementType = findArrayElementType(ast);
  const { onValueChange } = inputProps;

  // TODO(wittjosiah): The fallback to an empty array stops the form from crashing but isn't immediately live.
  //  It doesn't become live until another field is touched, but that's better than the whole form crashing.
  const values = useFormValues(ArrayField.displayName, path) ?? [];
  invariant(Array.isArray(values), `Expected array at: ${path?.join('.')}`);

  const getDefaultObjectValue = (typeNode: SchemaAST.AST): any => {
    const baseNode = findNode(typeNode, isDiscriminatedUnion);
    const typeLiteral = baseNode ? getDiscriminatedType(baseNode, {}) : findNode(typeNode, SchemaAST.isTypeLiteral);
    if (!typeLiteral) {
      return {};
    }

    return Object.fromEntries(
      getSchemaProperties(typeLiteral, {}, { form: true }).map((prop) => [prop.name, prop.defaultValue]),
    );
  };

  const getDefaultValue = () =>
    type === 'object' && elementType ? getDefaultObjectValue(elementType) : SimpleType.getDefaultValue(type);

  const handleAdd = useCallback(() => {
    onValueChange(type, [...values, getDefaultValue()]);
  }, [onValueChange, type, values]);

  const handleDelete = useCallback(
    (idx: number) => {
      onValueChange(
        type,
        values.filter((_, i) => i !== idx),
      );
    },
    [onValueChange, type, values],
  );

  if (!elementType || ((readonly || layout === 'static') && values.length < 1)) {
    return null;
  }

  return (
    <>
      {(layout !== 'static' || values.length > 0) && <FormFieldLabel readonly={readonly} label={label} asChild />}

      <div
        role='none'
        className={
          readonly
            ? 'flex flex-wrap gap-1 mlb-1'
            : values.length > 0
              ? 'grid grid-cols-[1fr_min-content] gap-2 mlb-2'
              : 'hidden'
        }
      >
        {values.map((_, index) => {
          return (
            <Fragment key={index}>
              <FormField
                autoFocus={index === values.length - 1}
                path={[...(path ?? []), index]}
                property={{
                  ...property,
                  array: false, // Cannot nest arrays.
                  ast: elementType,
                }}
                readonly={readonly}
                layout='inline'
                {...props}
              />

              {!readonly && (
                <div role='none' className='flex flex-col bs-full justify-end'>
                  {/* TODO(burdon): Create variable for line-height. */}
                  <div role='none' className='flex items-center bs-[var(--line-height)]'>
                    <IconButton
                      icon='ph--x--regular'
                      iconOnly
                      label={t('button remove')}
                      onClick={() => handleDelete(index)}
                      classNames='self-center'
                    />
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {/* TODO(burdon): Get label from schema. */}
      {!readonly && layout !== 'static' && (
        <IconButton
          classNames='flex is-full mlb-cardSpacingBlock'
          icon='ph--plus--regular'
          label={t('add field')}
          onClick={handleAdd}
        />
      )}
    </>
  );
};

ArrayField.displayName = 'Form.ArrayField';
