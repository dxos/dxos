//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useState } from 'react';

import { ToggleIconButton, useTranslation } from '@dxos/react-ui';

import { translationKey } from '#translations';

import { FieldHeader } from './FieldHeader';
import { type FieldPresentation } from './presentation';

export type FieldContainerProps = PropsWithChildren<{
  label?: string;
  /** JSON path of the group, forwarded to the label as field metadata. */
  path?: string;
  readonly?: boolean;
  presentation: FieldPresentation;
  /**
   * Render a collapse toggle in the header and wrap the body in an indented, bordered box.
   * Used for nested objects (struct fields, object-array items, inline refs).
   */
  collapsible?: boolean;
}>;

/**
 * Shared chrome for a labelled group of sub-fields: an optional header (label + collapse toggle) and,
 * when collapsible, an indented bordered container around the body. Nested structs, object-array items,
 * and inline refs all reach this via `FormFieldSet`, so their visual containment is identical.
 */
export const FieldContainer = ({ label, path, readonly, presentation, collapsible, children }: FieldContainerProps) => {
  const { t } = useTranslation(translationKey);
  // TODO(burdon): Generalize collapse state (cf. useSelection in react-ui-attention, plugin-markdown cursor state).
  const [collapsed, setCollapsed] = useState(false);
  const showBody = !(collapsible && collapsed);

  const content = (
    <>
      {presentation.showLabel && label && (
        <FieldHeader
          label={label}
          path={path}
          readonly={readonly}
          classNames='pl-2'
          onClick={collapsible ? () => setCollapsed((value) => !value) : undefined}
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
        />
      )}
      {showBody && (collapsible ? <div className='px-2 pb-2'>{children}</div> : children)}
    </>
  );

  // Nested groups render inside an indented, bordered container with a collapse toggle.
  return collapsible ? <div className='border border-subdued-separator rounded-sm my-1.5'>{content}</div> : content;
};
