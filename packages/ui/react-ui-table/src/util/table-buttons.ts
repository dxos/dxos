//
// Copyright 2024 DXOS.org
//

export type TableButton = 'columnSettings' | 'rowMenu' | 'newColumn' | 'referencedCell' | 'sort' | 'saveDraftRow';

export const BUTTON_IDENTIFIERS: { [K in TableButton]: string } = {
  columnSettings: 'data-table-column-settings-button',
  newColumn: 'data-table-new-column-button',
  referencedCell: 'data-table-ref-cell-button',
  rowMenu: 'data-table-row-menu-button',
  saveDraftRow: 'data-table-save-draft-row-button',
  sort: 'data-table-sort-button',
} as const;

type ButtonData =
  | { type: 'columnSettings'; fieldId: string }
  | { type: 'newColumn'; disabled?: boolean }
  | { type: 'rowMenu'; rowIndex: number }
  | { type: 'saveDraftRow'; rowIndex: number; disabled?: boolean }
  | { type: 'sort'; fieldId: string; direction?: 'asc' | 'desc' };

const createButton = ({
  attr,
  data,
  disabled = false,
  icon,
  testId,
  type: _type = 'primary',
}: {
  attr: string;
  data: Record<string, string>;
  disabled?: boolean;
  icon: string;
  testId: string;
  type?: 'primary' | 'secondary';
}) => {
  const dataAttrs = Object.entries(data)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

  return `<button ${attr} data-testid="${testId}" class="dx-button is-6 aspect-square pli-0.5 min-bs-0" ${dataAttrs} ${disabled ? 'disabled' : ''} data-dx-grid-action="accessory"><svg data-size="4"><use href="/icons.svg#${icon}"/></svg></button>`;
};

const addColumnButton = {
  attr: BUTTON_IDENTIFIERS.newColumn,
  icon: 'ph--plus--regular',
  render: ({ disabled }: Omit<Extract<ButtonData, { type: 'newColumn' }>, 'type'>) =>
    createButton({
      attr: BUTTON_IDENTIFIERS.newColumn,
      icon: addColumnButton.icon,
      disabled,
      data: {},
      testId: 'table-new-column-button',
    }),
  getData: (_el: HTMLElement): Extract<ButtonData, { type: 'newColumn' }> => ({ type: 'newColumn' }),
} as const;

const columnSettingsButton = {
  attr: BUTTON_IDENTIFIERS.columnSettings,
  icon: 'ph--caret-down--regular',
  render: ({ fieldId }: Omit<Extract<ButtonData, { type: 'columnSettings' }>, 'type'>) =>
    createButton({
      attr: BUTTON_IDENTIFIERS.columnSettings,
      icon: columnSettingsButton.icon,
      data: {
        'data-field-id': fieldId,
        'data-variant': 'ghost',
      },
      testId: 'table-column-settings-button',
    }),
  getData: (el: HTMLElement): Extract<ButtonData, { type: 'columnSettings' }> => ({
    type: 'columnSettings',
    fieldId: el.getAttribute('data-field-id')!,
  }),
} as const;

const rowMenuButton = {
  attr: BUTTON_IDENTIFIERS.rowMenu,
  icon: 'ph--dots-three--regular',
  render: ({ rowIndex }: Omit<Extract<ButtonData, { type: 'rowMenu' }>, 'type'>) =>
    createButton({
      attr: BUTTON_IDENTIFIERS.rowMenu,
      icon: rowMenuButton.icon,
      data: {
        'data-row-index': rowIndex.toString(),
      },
      testId: 'table-row-menu-button',
    }),
  getData: (el: HTMLElement): Extract<ButtonData, { type: 'rowMenu' }> => ({
    type: 'rowMenu',
    rowIndex: Number(el.getAttribute('data-row-index')!),
  }),
} as const;

const sortButton = {
  attr: BUTTON_IDENTIFIERS.sort,
  icon: 'ph--sort-ascending--regular',
  render: ({ fieldId, direction }: Omit<Extract<ButtonData, { type: 'sort' }>, 'type'>) =>
    createButton({
      attr: BUTTON_IDENTIFIERS.sort,
      icon: direction === 'desc' ? 'ph--sort-descending--regular' : 'ph--sort-ascending--regular',
      data: {
        'data-field-id': fieldId,
        'data-direction': direction ?? '',
      },
      testId: 'table-sort-button',
      // TODO(ZaymonFC): All buttons should be rendered into an absolutely positioned flex container.
      // This is a bit hacky.
      type: 'secondary',
    }),
  getData: (el: HTMLElement): Extract<ButtonData, { type: 'sort' }> => ({
    type: 'sort',
    fieldId: el.getAttribute('data-field-id')!,
    direction: el.getAttribute('data-direction') as 'asc' | 'desc' | undefined,
  }),
} as const;

const saveDraftRowButton = {
  attr: BUTTON_IDENTIFIERS.saveDraftRow,
  icon: 'ph--floppy-disk--regular',
  render: ({ rowIndex, disabled }: Omit<Extract<ButtonData, { type: 'saveDraftRow' }>, 'type'>) =>
    createButton({
      attr: BUTTON_IDENTIFIERS.saveDraftRow,
      icon: saveDraftRowButton.icon,
      disabled,
      data: {
        'data-row-index': rowIndex.toString(),
        'data-variant': 'primary',
      },
      testId: 'table-save-draft-row-button',
    }),
  getData: (el: HTMLElement): Extract<ButtonData, { type: 'saveDraftRow' }> => ({
    type: 'saveDraftRow',
    rowIndex: Number(el.getAttribute('data-row-index')!),
  }),
} as const;

export const tableButtons = {
  addColumn: addColumnButton,
  columnSettings: columnSettingsButton,
  rowMenu: rowMenuButton,
  saveDraftRow: saveDraftRowButton,
  sort: sortButton,
} as const;
