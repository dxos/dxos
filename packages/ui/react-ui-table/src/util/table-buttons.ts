//
// Copyright 2024 DXOS.org
//

export type TableButton = 'columnSettings' | 'rowMenu' | 'newColumn' | 'referencedCell';

export const BUTTON_IDENTIFIERS: { [K in TableButton]: string } = {
  columnSettings: 'data-table-column-settings-button',
  newColumn: 'data-table-new-column-button',
  referencedCell: 'data-table-ref-cell-button',
  rowMenu: 'data-table-row-menu-button',
} as const;

type ButtonData =
  | { type: 'columnSettings'; fieldId: string }
  | { type: 'newColumn'; disabled?: boolean }
  | { type: 'referencedCell'; schemaId: string; targetId: string }
  | { type: 'rowMenu'; rowIndex: number };

const createButton = ({
  attr,
  data,
  disabled = false,
  icon,
}: {
  attr: string;
  data: Record<string, string>;
  disabled?: boolean;
  icon: string;
}) => {
  const dataAttrs = Object.entries(data)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

  return `<button ${attr} class="ch-button is-6 pli-0.5 min-bs-0 absolute inset-block-1 inline-end-2" ${dataAttrs} ${disabled ? 'disabled' : ''}><svg><use href="/icons.svg#${icon}"/></svg></button>`;
};

const addColumnButton = {
  attr: BUTTON_IDENTIFIERS.newColumn,
  icon: 'ph--plus--regular',
  render: ({ disabled }: Omit<Extract<ButtonData, { type: 'newColumn' }>, 'type'>) => {
    return createButton({
      attr: BUTTON_IDENTIFIERS.newColumn,
      icon: addColumnButton.icon,
      disabled,
      data: {},
    });
  },
  getData: (_el: HTMLElement): Extract<ButtonData, { type: 'newColumn' }> => ({ type: 'newColumn' }),
} as const;

const columnSettingsButton = {
  attr: BUTTON_IDENTIFIERS.columnSettings,
  icon: 'ph--caret-down--regular',
  render: ({ fieldId }: Omit<Extract<ButtonData, { type: 'columnSettings' }>, 'type'>) => {
    return createButton({
      attr: BUTTON_IDENTIFIERS.columnSettings,
      icon: columnSettingsButton.icon,
      data: {
        'data-field-id': fieldId,
      },
    });
  },
  getData: (el: HTMLElement): Extract<ButtonData, { type: 'columnSettings' }> => ({
    type: 'columnSettings',
    fieldId: el.getAttribute('data-field-id')!,
  }),
} as const;

const referencedCellButton = {
  attr: BUTTON_IDENTIFIERS.referencedCell,
  icon: 'ph--link-simple-horizontal--regular',
  render: ({ targetId, schemaId }: Omit<Extract<ButtonData, { type: 'referencedCell' }>, 'type'>) => {
    return createButton({
      attr: BUTTON_IDENTIFIERS.referencedCell,
      icon: referencedCellButton.icon,
      data: {
        'data-target-id': targetId,
        'data-schema-id': schemaId,
      },
    });
  },
  getData: (el: HTMLElement): Extract<ButtonData, { type: 'referencedCell' }> => ({
    type: 'referencedCell',
    targetId: el.getAttribute('data-target-id')!,
    schemaId: el.getAttribute('data-schema-id')!,
  }),
} as const;

const rowMenuButton = {
  attr: BUTTON_IDENTIFIERS.rowMenu,
  icon: 'ph--dots-three--regular',
  render: ({ rowIndex }: Omit<Extract<ButtonData, { type: 'rowMenu' }>, 'type'>) => {
    return createButton({
      attr: BUTTON_IDENTIFIERS.rowMenu,
      icon: rowMenuButton.icon,
      data: {
        'data-row-index': rowIndex.toString(),
      },
    });
  },
  getData: (el: HTMLElement): Extract<ButtonData, { type: 'rowMenu' }> => ({
    type: 'rowMenu',
    rowIndex: Number(el.getAttribute('data-row-index')!),
  }),
} as const;

export const tableButtons = {
  addColumn: addColumnButton,
  columnSettings: columnSettingsButton,
  referencedCell: referencedCellButton,
  rowMenu: rowMenuButton,
} as const;
