//
// Copyright 2024 DXOS.org
//

type TableButton = 'columnSettings' | 'rowMenu' | 'newColumn';

const TABLE_ATTRS: { [K in TableButton]: string } = {
  columnSettings: 'data-table-column-settings-button',
  rowMenu: 'data-table-row-menu-button',
  newColumn: 'data-table-new-column-button',
} as const;

const ICONS: { [K in TableButton]: string } = {
  columnSettings: 'ph--caret-down--regular',
  rowMenu: 'ph--dots-three--regular',
  newColumn: 'ph--plus--regular',
} as const;

const createButtonHtml = ({ button, value = '' }: { button: TableButton; value?: string }): string => {
  const buttonClasses = 'ch-button is-6 pli-0.5 min-bs-0 absolute inset-block-1 inline-end-2' as const;
  return `<button class="${buttonClasses}" ${TABLE_ATTRS[button]}="${value}"><svg><use href="/icons.svg#${ICONS[button]}"/></svg></button>`;
};

export const tableButtons = {
  columnSettings: {
    attr: TABLE_ATTRS.columnSettings,
    icon: ICONS.columnSettings,
    render: ({ columnId }: { columnId: string }) => createButtonHtml({ button: 'columnSettings', value: columnId }),
  },
  rowMenu: {
    attr: TABLE_ATTRS.rowMenu,
    icon: ICONS.rowMenu,
    render: ({ rowIndex }: { rowIndex: number }) => createButtonHtml({ button: 'rowMenu', value: rowIndex.toString() }),
  },
  newColumn: {
    attr: TABLE_ATTRS.newColumn,
    icon: ICONS.newColumn,
    render: () => createButtonHtml({ button: 'newColumn' }),
  },
} as const;
