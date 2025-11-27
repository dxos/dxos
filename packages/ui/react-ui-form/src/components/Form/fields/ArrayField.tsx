//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import * as SchemaAST from 'effect/SchemaAST';
import * as String from 'effect/String';
import React, { Fragment, useCallback } from 'react';

import { SimpleType, findNode, getDiscriminatedType, isDiscriminatedUnion } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { getSchemaProperties } from '@dxos/schema';

import { translationKey } from '../../../translations';
import { findArrayElementType } from '../../../util';
import { FormField, type FormFieldProps } from '../FormField';
import { FormFieldLabel, type FormFieldStateProps } from '../FormFieldComponent';
import { useFormValues } from '../FormRoot';

export type ArrayFieldProps = {
  fieldProps: FormFieldStateProps;
} & Pick<FormFieldProps, 'property' | 'path' | 'readonly' | 'fieldMap' | 'fieldProvider'>;

export const ArrayField = ({ property, readonly, path, fieldProps: inputProps, ...props }: ArrayFieldProps) => {
  const { t } = useTranslation(translationKey);
  const { ast, name, type, title } = property;
  // TODO(wittjosiah): The fallback to an empty array stops the form from crashing but isn't immediately live.
  //  It doesn't become live until another field is touched, but that's better than the whole form crashing.
  const values = (useFormValues(ArrayField.displayName, path ?? []) ?? []) as any[];
  invariant(Array.isArray(values), `Expected array at: ${path?.join('.')}`);
  const label = title ?? Function.pipe(name, String.capitalize);

  const elementType = findArrayElementType(ast);

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
    inputProps.onValueChange(type, [...values, getDefaultValue()]);
  }, [type, elementType, inputProps, values]);

  const handleRemove = useCallback(
    (index: number) => {
      const newValues = values.filter((_, i) => i !== index);
      inputProps.onValueChange(type, newValues);
    },
    [type, inputProps, values],
  );

  if (!elementType) {
    return null;
  }

  return readonly && values.length < 1 ? null : (
    <>
      <FormFieldLabel readonly={readonly} label={label} />
      <div
        role='none'
        className={
          readonly
            ? 'flex flex-wrap gap-1 mlb-1'
            : values.length > 0
              ? 'grid gap-1 grid-cols-[1fr_min-content] mlb-1'
              : 'hidden'
        }
      >
        {values.map((_value, index) => {
          const field = (
            <FormField
              inline
              property={{
                ...property,
                array: false, // NOTE(ZaymonFC): This breaks arrays of arrays.
                ast: elementType,
              }}
              path={[...(path ?? []), index]}
              readonly={readonly}
              {...props}
            />
          );
          return readonly ? (
            field
          ) : (
            <Fragment key={index}>
              <div role='none'>{field}</div>
              <IconButton
                icon='ph--trash--regular'
                iconOnly
                label={t('button remove')}
                onClick={() => handleRemove(index)}
                classNames='self-center'
              />
            </Fragment>
          );
        })}
      </div>
      {!readonly && (
        <IconButton
          classNames='is-full mlb-cardSpacingBlock flex'
          icon='ph--plus--regular'
          label={t('add field')}
          onClick={handleAdd}
        />
      )}
    </>
  );
};

ArrayField.displayName = 'Form.ArrayField';
