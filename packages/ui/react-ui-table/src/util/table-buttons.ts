//
// Copyright 2024 DXOS.org
//

export type TableButton = 'columnSettings' | 'rowMenu' | 'newColumn' | 'referencedCell' | 'sort';

export const BUTTON_IDENTIFIERS: { [K in TableButton]: string } = {
  columnSettings: 'data-table-column-settings-button',
  newColumn: 'data-table-new-column-button',
  referencedCell: 'data-table-ref-cell-button',
  rowMenu: 'data-table-row-menu-button',
  sort: 'data-table-sort-button',
} as const;

type ButtonData =
  | { type: 'columnSettings'; fieldId: string }
  | { type: 'newColumn'; disabled?: boolean }
  | { type: 'referencedCell'; schemaId: string; targetId: string }
  | { type: 'rowMenu'; rowIndex: number }
  | { type: 'sort'; fieldId: string; direction?: 'asc' | 'desc' };

const createButton = ({
  attr,
  data,
  disabled = false,
  icon,
  testId,
  type = 'primary',
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

  const positionClass = type === 'primary' ? 'inline-end-2' : 'inline-end-9';
  return `<button ${attr} data-testid="${testId}" class="ch-button is-6 pli-0.5 min-bs-0 absolute inset-block-1 ${positionClass}" ${dataAttrs} ${disabled ? 'disabled' : ''}><svg><use href="/icons.svg#${icon}"/></svg></button>`;
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
      testId: 'table-new-column-button',
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
      testId: 'table-column-settings-button',
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
      testId: 'table-ref-cell-button',
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
      testId: 'table-row-menu-button',
    });
  },
  getData: (el: HTMLElement): Extract<ButtonData, { type: 'rowMenu' }> => ({
    type: 'rowMenu',
    rowIndex: Number(el.getAttribute('data-row-index')!),
  }),
} as const;

const sortButton = {
  attr: BUTTON_IDENTIFIERS.sort,
  icon: 'ph--sort-ascending--regular',
  render: ({ fieldId, direction }: Omit<Extract<ButtonData, { type: 'sort' }>, 'type'>) => {
    return createButton({
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
    });
  },
  getData: (el: HTMLElement): Extract<ButtonData, { type: 'sort' }> => ({
    type: 'sort',
    fieldId: el.getAttribute('data-field-id')!,
    direction: el.getAttribute('data-direction') as 'asc' | 'desc' | undefined,
  }),
} as const;

export const tableButtons = {
  addColumn: addColumnButton,
  columnSettings: columnSettingsButton,
  referencedCell: referencedCellButton,
  rowMenu: rowMenuButton,
  sort: sortButton,
} as const;
