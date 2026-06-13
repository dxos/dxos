//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { CompactIconButton } from './FormField';
import { FormFieldLabel } from './FormFieldWrapper';

export type FieldHeaderProps = {
  label: string;
  /** JSON path forwarded to the label as field metadata. */
  path?: string;
  readonly?: boolean;
  /** Trailing inline add affordance; omit to hide it. */
  add?: { icon?: string; label: string; disabled?: boolean; onClick: () => void };
};

/**
 * Header row for an array/list field: a label with an optional inline add button.
 */
export const FieldHeader = ({ label, path, readonly, add }: FieldHeaderProps) => (
  <div className='flex items-center gap-2'>
    <div className='flex-1 min-w-0'>
      <FormFieldLabel readonly={readonly} label={label} path={path} standalone />
    </div>
    {!readonly && add && (
      <CompactIconButton
        disabled={add.disabled}
        icon={add.icon ?? 'ph--plus--regular'}
        label={add.label}
        onClick={add.onClick}
      />
    )}
  </div>
);
