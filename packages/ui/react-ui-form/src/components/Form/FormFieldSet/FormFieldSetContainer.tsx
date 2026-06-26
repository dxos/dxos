//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useState } from 'react';

import { type ThemedClassName, ToggleIconButton, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { FormFieldHeader } from '../FormField/FormFieldHeader';
import { type FormFieldPresentation } from '../FormField/presentation';

export type FormFieldSetContainerProps = ThemedClassName<
  PropsWithChildren<{
    label?: string;
    /** JSON path of the group, forwarded to the label as field metadata. */
    path?: string;
    readonly?: boolean;
    presentation: FormFieldPresentation;
    /**
     * Render a collapse toggle in the header and wrap the body in an indented, bordered box.
     * Used for nested objects (struct fields, object-array items, inline refs).
     */
    collapsible?: boolean;
  }>
>;

/**
 * Shared chrome for a labelled group of sub-fields: an optional header (label + collapse toggle) and,
 * when collapsible, an indented bordered container around the body. Nested structs, object-array items,
 * and inline refs all reach this via `FormFieldSet`, so their visual containment is identical.
 */
export const FormFieldSetContainer = ({
  classNames,
  label,
  path,
  readonly,
  presentation,
  collapsible,
  children,
}: FormFieldSetContainerProps) => {
  const { t } = useTranslation(translationKey);
  // TODO(burdon): Generalize collapse state (cf. useSelection in react-ui-attention, plugin-markdown cursor state).
  const [collapsed, setCollapsed] = useState(false);
  const showBody = !(collapsible && collapsed);

  const content = (
    <>
      {presentation.showLabel && label && (
        <FormFieldHeader
          label={label}
          path={path}
          readonly={readonly}
          classNames='pl-2'
          actions={
            collapsible ? (
              <ToggleIconButton
                active={!collapsed}
                classNames='px-1 mr-0.5'
                variant='ghost'
                density='xs'
                iconOnly
                icon='ph--caret-right--regular'
                label={t(collapsed ? 'expand-fields.label' : 'collapse-fields.label')}
              />
            ) : undefined
          }
          onClick={collapsible ? () => setCollapsed((value) => !value) : undefined}
        />
      )}
      {showBody && (collapsible ? <div className='flex flex-col gap-2 px-2 pb-2'>{children}</div> : children)}
    </>
  );

  // Nested groups render inside an indented, bordered container with a collapse toggle. A non-collapsible
  // group only materializes a wrapper when `classNames` is supplied — otherwise the body flows straight
  // into the parent grid (the default, grid-transparent behavior).
  // TODO(burdon): This should be styled.
  if (collapsible) {
    return (
      <div className='pt-trim-md'>
        <div className={mx('border border-subdued-separator rounded-sm', classNames)}>{content}</div>
      </div>
    );
  }

  return <div className={mx(classNames)}>{content}</div>;
};
