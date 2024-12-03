//
// Copyright 2024 DXOS.org
//

type TableButton = 'columnSettings' | 'rowMenu' | 'newColumn' | 'referencedCell';

// TODO(thure): Lots of copy-pasted business here, this could by DRYed out substantially.

// TODO(thure): These unique attributes come with more caveats than e.g. applying multiple attributes – one key-value
//  pair for identifying the button type and another for passing the fieldId.

const TABLE_ATTRS: { [K in TableButton]: string } = {
  referencedCell: 'data-table-ref-cell-button',
  columnSettings: 'data-table-column-settings-button',
  rowMenu: 'data-table-row-menu-button',
  newColumn: 'data-table-new-column-button',
} as const;

const ICONS: { [K in TableButton]: string } = {
  referencedCell: 'ph--link-simple-horizontal--regular',
  columnSettings: 'ph--caret-down--regular',
  rowMenu: 'ph--dots-three--regular',
  newColumn: 'ph--plus--regular',
} as const;

const createButtonHtml = ({
  button,
  value = '',
  disabled = false,
  testId,
}: {
  button: TableButton;
  value?: string;
  disabled?: boolean;
  testId: string;
}): string => {
  const buttonClasses = 'ch-button is-6 pli-0.5 min-bs-0 absolute inset-block-1 inline-end-2' as const;
  return `<button class="${buttonClasses}" ${TABLE_ATTRS[button]}="${value}" data-testid="${testId}" ${disabled ? 'disabled' : ''}><svg><use href="/icons.svg#${ICONS[button]}"/></svg></button>`;
};

export const tableButtons = {
  referencedCell: {
    attr: TABLE_ATTRS.referencedCell,
    icon: ICONS.referencedCell,
    render: ({ targetId }: { targetId: string }) =>
      createButtonHtml({
        button: 'referencedCell',
        value: targetId,
        testId: 'table-ref-cell-button',
      }),
  },
  columnSettings: {
    attr: TABLE_ATTRS.columnSettings,
    icon: ICONS.columnSettings,
    render: ({ fieldId }: { fieldId: string }) =>
      createButtonHtml({ button: 'columnSettings', value: fieldId, testId: 'table-column-settings-button' }),
  },
  rowMenu: {
    attr: TABLE_ATTRS.rowMenu,
    icon: ICONS.rowMenu,
    render: ({ rowIndex }: { rowIndex: number }) =>
      createButtonHtml({ button: 'rowMenu', value: rowIndex.toString(), testId: 'table-row-menu-button' }),
  },
  addColumn: {
    attr: TABLE_ATTRS.newColumn,
    icon: ICONS.newColumn,
    render: ({ disabled }: { disabled?: boolean } = {}) =>
      createButtonHtml({ button: 'newColumn', disabled, testId: 'table-new-column-button' }),
  },
} as const;
