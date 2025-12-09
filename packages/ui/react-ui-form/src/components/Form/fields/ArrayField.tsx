//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';
import React, { Fragment, useCallback } from 'react';

import { findNode, getArrayElementType, getDiscriminatedType, isDiscriminatedUnion, isNestedType } from '@dxos/effect';
import { IconButton, useTranslation } from '@dxos/react-ui';

import { translationKey } from '../../../translations';
import { getFormProperties } from '../../../util';
import { useFormValues } from '../Form';
import { FormField, type FormFieldProps } from '../FormField';
import { FormFieldLabel, type FormFieldStateProps } from '../FormFieldComponent';

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
  const elementType = getArrayElementType(type);
  const { onValueChange } = inputProps;
  const values = useFormValues(ArrayField.displayName, path, () => []);

  const getDefaultObjectValue = (typeNode: SchemaAST.AST): any => {
    const baseNode = findNode(typeNode, isDiscriminatedUnion);
    const typeLiteral = baseNode ? getDiscriminatedType(baseNode, {}) : findNode(typeNode, SchemaAST.isTypeLiteral);
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
      isNestedType(type) && elementType ? getDefaultObjectValue(elementType) : getDefaultValue(elementType);
    values && onValueChange(type, [...values, defaultValue]);
  }, [onValueChange, type, elementType, values]);

  const handleDelete = useCallback(
    (idx: number) => {
      onValueChange(
        type,
        values?.filter((_, i) => i !== idx),
      );
    },
    [onValueChange, type, values],
  );

  if (!elementType || ((readonly || layout === 'static') && values && values.length < 1)) {
    return null;
  }

  return (
    <>
      {(layout !== 'static' || (values && values.length > 0)) && (
        <FormFieldLabel readonly={readonly} label={label} asChild />
      )}

      <div role='none' className='flex flex-col gap-2'>
        {values?.map((_, index) => {
          return (
            <div role='none' key={index} className='grid grid-cols-[1fr_min-content] gap-2 last:mb-3'>
              <FormField
                autoFocus={index === values.length - 1}
                type={elementType}
                path={[...(path ?? []), index]}
                readonly={readonly || layout === 'static'}
                layout='inline'
                {...props}
              />

              {!readonly && layout !== 'static' && (
                <div role='none' className='flex flex-col bs-full justify-end'>
                  {/* NOTE: Aligns with center of last field if multi-field object. */}
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
            </div>
          );
        })}
      </div>

      {/* TODO(burdon): Get label from schema. */}
      {!readonly && layout !== 'static' && (
        <IconButton
          classNames='flex is-full _mlb-cardSpacingBlock'
          icon='ph--plus--regular'
          label={t('add field')}
          onClick={handleAdd}
        />
      )}
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
    default: {
      if (ast && isNestedType(ast)) {
        return {};
      } else {
        throw new Error(`Unsupported type: ${ast?._tag}`);
      }
    }
  }
};
