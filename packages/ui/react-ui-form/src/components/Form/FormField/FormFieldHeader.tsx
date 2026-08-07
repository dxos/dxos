//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { CompactIconButton } from './FormField';
import { FormFieldLabel } from './FormRow';

export type FormFieldHeaderProps = {
  label: string;
  /** Schema description, surfaced as a tooltip on an info affordance beside the label. */
  description?: string;
  /** JSON path forwarded to the label as field metadata. */
  path?: string;
  required?: boolean;
  readonly?: boolean;
  classNames?: string;
  /** Trailing inline add affordance; omit to hide it. */
  add?: { icon?: string; label: string; disabled?: boolean; onClick: () => void };
  /** Extra trailing controls placed after the add affordance (e.g. a collapse toggle). */
  actions?: ReactNode;
  /** Header row click (e.g. toggle collapse). The add affordance stops propagation so it doesn't trigger this. */
  onClick?: () => void;
};

/**
 * Header row for a labelled group or list: a label with optional trailing controls (an inline add
 * affordance and/or arbitrary `actions`). Shared by array/list fields ({@link ArrayField}, the view
 * editor) and {@link FormFieldSetContainer}'s collapse header, so all group/list headers render identically.
 */
export const FormFieldHeader = ({
  label,
  description,
  path,
  required,
  readonly,
  classNames,
  add,
  actions,
  onClick,
}: FormFieldHeaderProps) => (
  <FormFieldLabel
    standalone
    classNames={classNames}
    label={label}
    description={description}
    required={required}
    readonly={readonly}
    path={path}
    button={
      (!readonly && add) || actions ? (
        <>
          {!readonly && add && (
            <CompactIconButton
              disabled={add.disabled}
              icon={add.icon ?? 'ph--plus--regular'}
              label={add.label}
              onClick={(event) => {
                // Don't let the add click bubble to the header's onClick (e.g. collapse toggle).
                event.stopPropagation();
                add.onClick();
              }}
            />
          )}
          {actions}
        </>
      ) : undefined
    }
    onClick={onClick}
  />
);
