//
// Copyright 2024 DXOS.org
//

// Core types.
export type TableControl = 'checkbox' | 'switch';

export type ControlData =
  | { type: 'checkbox'; rowIndex: number; header?: boolean }
  | { type: 'switch'; colIndex: number; rowIndex: number };

type CommonRenderProps = {
  checked?: boolean;
  disabled?: boolean;
};

export type RenderCheckboxProps = CommonRenderProps & Omit<Extract<ControlData, { type: 'checkbox' }>, 'type'>;
export type RenderSwitchProps = CommonRenderProps & Omit<Extract<ControlData, { type: 'switch' }>, 'type'>;

export const CONTROL_IDENTIFIERS = {
  checkbox: 'data-table-checkbox',
  switch: 'data-table-switch',
} as const;

const BASE_CLASSES = {
  checkbox: 'absolute inset-block-[6px] inline-end-[6px] ch-checkbox',
  switch: 'absolute inset-block-[6px] inline-end-[6px] ch-checkbox--switch',
} as const;

const renderAttributes = (data: Record<string, string>) => {
  return Object.entries(data)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
};

const renderInput = (baseClass: string, attrs: Record<string, string>, checked = false, disabled = false) => {
  return `<input type="checkbox" class="${baseClass}" ${renderAttributes(attrs)} ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} data-testid="table-selection"/>`;
};

export const renderCheckbox = ({
  rowIndex,
  header = false,
  checked = false,
  disabled = false,
}: RenderCheckboxProps): string => {
  const attrs = {
    [CONTROL_IDENTIFIERS.checkbox]: '',
    'data-row-index': rowIndex.toString(),
    ...(header && { 'data-header': '' }),
  };

  return renderInput(BASE_CLASSES.checkbox, attrs, checked, disabled);
};

export const renderSwitch = ({ colIndex, rowIndex, checked = false, disabled = false }: RenderSwitchProps): string => {
  const attrs = {
    [CONTROL_IDENTIFIERS.switch]: '',
    'data-row-index': rowIndex.toString(),
    'data-col-index': colIndex.toString(),
  };

  return renderInput(BASE_CLASSES.switch, attrs, checked, disabled);
};

export const tableControls = {
  checkbox: {
    attr: CONTROL_IDENTIFIERS.checkbox,
    render: renderCheckbox,
    getData: (el: HTMLElement): Extract<ControlData, { type: 'checkbox' }> => ({
      type: 'checkbox',
      rowIndex: Number(el.getAttribute('data-row-index')),
      header: el.hasAttribute('data-header'),
    }),
  },
  switch: {
    attr: CONTROL_IDENTIFIERS.switch,
    render: renderSwitch,
    getData: (el: HTMLElement): Extract<ControlData, { type: 'switch' }> => ({
      type: 'switch',
      rowIndex: Number(el.getAttribute('data-row-index')),
      colIndex: Number(el.getAttribute('data-col-index')),
    }),
  },
} as const;
