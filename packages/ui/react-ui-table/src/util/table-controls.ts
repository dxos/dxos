//
// Copyright 2024 DXOS.org
//

import { type DxGridPlane, accessoryHandlesPointerdownAttrs } from '@dxos/lit-grid';

export type TableControl = 'checkbox' | 'switch';

export type ControlData =
  | { type: 'checkbox'; rowIndex: number; header?: boolean }
  | { type: 'switch'; colIndex: number; rowIndex: number; plane: DxGridPlane };

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
  checkbox: 'dx-checkbox',
  switch: 'dx-checkbox--switch',
} as const;

const renderAttributes = (data: Record<string, string>) => {
  return Object.entries(data)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
};

const renderInput = (
  baseClass: string,
  attrs: Record<string, string>,
  checked = false,
  disabled = false,
  preventToggle = false,
  testId: string,
) => {
  return `<div role="none" class="dx-grid__cell__block"><input type="checkbox" class="${baseClass}" ${renderAttributes(attrs)} ${checked ? 'checked' : ''} ${preventToggle ? 'onclick="return false"' : ''} ${disabled ? 'disabled' : ''} data-testid="${testId}" data-dx-grid-action="accessory"/></div>`;
};

export const CheckboxComponent = ({
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

  return renderInput(BASE_CLASSES.checkbox, attrs, checked, disabled, true, 'table-selection');
};

export const SwitchComponent = ({
  colIndex,
  rowIndex,
  plane,
  checked = false,
  disabled = false,
}: RenderSwitchProps): string => {
  const attrs = {
    [CONTROL_IDENTIFIERS.switch]: '',
    'data-row-index': rowIndex.toString(),
    'data-col-index': colIndex.toString(),
    'data-plane': plane,
    ...accessoryHandlesPointerdownAttrs,
  };

  return renderInput(BASE_CLASSES.switch, attrs, checked, disabled, true, 'table-switch');
};

export const tableControls = {
  checkbox: {
    attr: CONTROL_IDENTIFIERS.checkbox,
    render: CheckboxComponent,
    getData: (el: HTMLElement): Extract<ControlData, { type: 'checkbox' }> => ({
      type: 'checkbox',
      rowIndex: Number(el.getAttribute('data-row-index')),
      header: el.hasAttribute('data-header'),
    }),
  },
  switch: {
    attr: CONTROL_IDENTIFIERS.switch,
    render: SwitchComponent,
    getData: (el: HTMLElement): Extract<ControlData, { type: 'switch' }> => ({
      type: 'switch',
      rowIndex: Number(el.getAttribute('data-row-index')),
      colIndex: Number(el.getAttribute('data-col-index')),
      // The plane round-trips through a DOM attribute string written by the switch renderer.
      plane: (el.getAttribute('data-plane') as DxGridPlane | null) ?? 'grid',
    }),
  },
} as const;
