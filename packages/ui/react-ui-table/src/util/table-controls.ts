//
// Copyright 2024 DXOS.org
//

export const tableControlAttributes = {
  checkbox: {
    checkbox: 'data-table-checkbox',
    header: 'data-table-header',
  },
} as const;

export const tableControls = {
  checkbox: {
    attributes: tableControlAttributes.checkbox,
    render: ({
      rowIndex,
      header = false,
      checked = false,
      disabled = false,
    }: {
      rowIndex: number;
      header?: boolean;
      checked?: boolean;
      disabled?: boolean;
    }) => {
      const baseClasses = 'absolute inset-block-[6px] inline-end-[6px]' as const;
      const { attributes } = tableControls.checkbox;
      return `<input type="checkbox" class="${baseClasses}" ${attributes.checkbox}="${rowIndex}" ${header ? attributes.header : ''} ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}/>`;
    },
  } as const,
};
