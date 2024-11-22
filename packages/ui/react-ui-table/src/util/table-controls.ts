//
// Copyright 2024 DXOS.org
//

export const checkboxAttributes = {
  checkbox: 'data-table-checkbox',
  header: 'data-table-header',
} as const;

export type RenderCheckboxProps = { rowIndex: number; header?: boolean; checked?: boolean; disabled?: boolean };
export const renderCheckbox = ({
  rowIndex,
  header = false,
  checked = false,
  disabled = false,
}: RenderCheckboxProps): string => {
  const baseClasses = 'absolute inset-block-[6px] inline-end-[6px] ch-checkbox' as const;
  const { attributes } = tableControls.checkbox;
  return `<input type="checkbox" class="${baseClasses}" ${attributes.checkbox}="${rowIndex}" ${header ? attributes.header : ''} ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}/>`;
};

export const tableControls = {
  checkbox: {
    attributes: checkboxAttributes,
    render: renderCheckbox,
  },
} as const;
