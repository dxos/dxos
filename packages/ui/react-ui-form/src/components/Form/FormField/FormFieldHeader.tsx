//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { FormFieldLabel } from './FormField';
import { CompactIconButton } from './FormFieldDispatch';

export type FormFieldHeaderProps = {
  label: string;
  required?: boolean;
  readonly?: boolean;
  classNames?: string;
  /** Trailing inline add affordance; omit to hide it. */
  add?: { icon?: string; label: string; disabled?: boolean; onClick: () => void };
  /** Extra trailing content placed after the add affordance (e.g. a disclosure caret). */
  actions?: ReactNode;
  /** Render the row as the enclosing `Collapsible`'s trigger; incompatible with `add`, a button inside a button. */
  trigger?: boolean;
};

/**
 * Header row for a labelled group or list: a label with optional trailing controls (an inline add
 * affordance and/or arbitrary `actions`). Shared by array/list fields ({@link ArrayField}, the view
 * editor) and {@link `Form.FieldSet`'s disclosure header, so all group/list headers render identically.
 */
export const FormFieldHeader = ({
  label,
  required,
  readonly,
  classNames,
  add,
  actions,
  trigger,
}: FormFieldHeaderProps) => (
  <FormFieldLabel
    standalone
    classNames={classNames}
    label={label}
    required={required}
    readonly={readonly}
    trigger={trigger}
    button={
      (!readonly && add) || actions ? (
        <>
          {!readonly && add && (
            <CompactIconButton
              disabled={add.disabled}
              icon={add.icon ?? 'ph--plus--regular'}
              label={add.label}
              onClick={add.onClick}
            />
          )}
          {actions}
        </>
      ) : undefined
    }
  />
);
