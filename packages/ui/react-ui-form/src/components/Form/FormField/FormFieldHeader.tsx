//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { FormFieldLabel } from './FormField.tsx';
import { CompactIconButton } from './FormFieldDispatch.tsx';

export type FormFieldHeaderProps = {
  label: string;
  /** An id on the label text, for what names itself by it. */
  labelId?: string;
  required?: boolean;
  readonly?: boolean;
  classNames?: string;
  /** Trailing inline add affordance; omit to hide it. */
  add?: { icon?: string; label: string; disabled?: boolean; onClick: () => void };
  /** Extra trailing content placed after the add affordance (e.g. a disclosure). */
  actions?: ReactNode;
  /** Inline content right after the label text (e.g. a hint icon). */
  labelEnd?: ReactNode;
};

/**
 * Header row for a labelled group or list: a label with optional trailing controls (an inline add
 * affordance and/or arbitrary `actions`). Shared by array/list fields ({@link ArrayField}, the view
 * editor) and {@link `Form.FieldSet`'s disclosure header, so all group/list headers render identically.
 */
export const FormFieldHeader = ({
  label,
  labelId,
  required,
  readonly,
  classNames,
  add,
  actions,
  labelEnd,
}: FormFieldHeaderProps) => (
  <FormFieldLabel
    standalone
    classNames={classNames}
    id={labelId}
    label={label}
    labelEnd={labelEnd}
    required={required}
    readonly={readonly}
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
