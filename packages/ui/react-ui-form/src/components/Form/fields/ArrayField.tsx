//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';
import React, { useCallback } from 'react';

import { Ref } from '@dxos/echo';
import {
  createJsonPath,
  findNode,
  getArrayElementType,
  getDiscriminatedType,
  isDiscriminatedUnion,
  isNestedType,
} from '@dxos/effect';
import { IconButton, IconButtonProps, useTranslation } from '@dxos/react-ui';

import { translationKey } from '#translations';

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
    // `values` is `undefined` on first render for arrays whose parent path
    // hasn't been materialised in the form values yet (e.g. `package.repos`
    // when the form starts with no `package`). `useFormValues`'s default-
    // value effect would eventually backfill it to `[]`, but until then the
    // old `values && ...` guard silently swallowed the click. Treat a
    // missing array as empty so Add always produces `[defaultValue]`.
    onValueChange(type, [...(values ?? []), defaultValue]);
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

  const renderItemAsObject = elementType && isNestedType(elementType) && !Ref.isRefType(elementType);

  return (
    <>
      {(layout !== 'static' || (values && values.length > 0)) && (
        <div className='flex items-center gap-2'>
          <div className='flex-1 min-w-0'>
            <FormFieldLabel readonly={readonly} label={label} path={createJsonPath(path ?? [])} asChild />
          </div>
          {!readonly && layout !== 'static' && (
            <IconBlock icon='ph--plus--regular' label={t('add-item.button')} onClick={handleAdd} />
          )}
        </div>
      )}

      <div className='flex flex-col'>
        {values?.map((_, index) => {
          const isLast = index === values.length - 1;
          // Object items: each row contains a recursively-rendered FormField
          //   (multiple sub-rows for the object's fields) wrapped in a border,
          //   with the delete button bottom-aligned next to it.
          // Scalar items: a single-row inline FormField with a center-aligned
          //   delete button. Refs and primitive arrays use this layout.
          const fieldField = (
            <FormField
              {...props}
              autoFocus={isLast}
              type={elementType}
              // Suppress the per-item header for object items only — the recursive
              // form already renders labels for each sub-field. Scalar items
              // (refs, primitives) keep the parent name so inline-layout
              // children (e.g. RefField) have a real label to use as a
              // fallback placeholder.
              {...(renderItemAsObject && { name: null })}
              path={[...(path ?? []), index]}
              readonly={readonly || layout === 'static'}
              layout={renderItemAsObject ? (layout === 'static' ? 'static' : undefined) : 'inline'}
            />
          );

          return (
            <div key={index} className='grid grid-cols-[1fr_min-content] items-center mb-1 last:mb-form-gap'>
              {renderItemAsObject ? (
                <div className='p-1 border border-subdued-separator'>{fieldField}</div>
              ) : (
                fieldField
              )}

              {!readonly && layout !== 'static' && (
                <IconBlock icon='ph--x--regular' label={t('remove-item.button')} onClick={() => handleDelete(index)} />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

ArrayField.displayName = 'Form.ArrayField';

const IconBlock = (props: IconButtonProps) => {
  return (
    <div className='flex items-center h-full px-1'>
      <IconButton variant='ghost' density='xs' square iconOnly {...props} />
    </div>
  );
};

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
      if (ast && isNestedType(ast)) {
        return {};
      } else {
        throw new Error(`Unsupported type: ${ast?._tag}`);
      }
    }
  }
};
