//
// Copyright 2024 DXOS.org
//

import { useRef, useCallback, useState, type MouseEvent, type RefObject } from 'react';

import { tableButtons } from '../util';

export type ColumnSettingsMode = { type: 'create' } | { type: 'edit'; fieldId: string };

export type TableMenuState =
  | { type: 'row'; rowIndex: number }
  | { type: 'column'; fieldId: string }
  | { type: 'columnSettings'; mode: ColumnSettingsMode }
  | undefined;

export type TableMenuController = {
  triggerRef: RefObject<HTMLButtonElement>;
  state: TableMenuState;
  handleClick: (event: MouseEvent) => void;
  close: () => void;
  showColumnSettings: () => void;
};

export const useTableMenuController = (): TableMenuController => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [state, setState] = useState<TableMenuState>();

  const handleClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;

    const columnButton = target.closest(`button[${tableButtons.columnSettings.attr}]`);
    if (columnButton) {
      triggerRef.current = columnButton as HTMLButtonElement;
      const fieldId = columnButton.getAttribute(tableButtons.columnSettings.attr)!;
      setState({ type: 'column', fieldId });
      return;
    }

    const rowButton = target.closest(`button[${tableButtons.rowMenu.attr}]`);
    if (rowButton) {
      triggerRef.current = rowButton as HTMLButtonElement;
      const rowIndex = Number(rowButton.getAttribute(tableButtons.rowMenu.attr));
      setState({ type: 'row', rowIndex });
      return;
    }

    const newColumnButton = target.closest(`button[${tableButtons.newColumn.attr}]`);
    if (newColumnButton) {
      triggerRef.current = newColumnButton as HTMLButtonElement;
      setState({ type: 'columnSettings', mode: { type: 'create' } });
    }
  }, []);

  const showColumnSettings = useCallback(() => {
    if (state?.type === 'column') {
      setTimeout(() => setState({ type: 'columnSettings', mode: { type: 'edit', fieldId: state.fieldId } }), 1);
    }
  }, [state]);

  return {
    triggerRef,
    state,
    handleClick,
    close: () => setState(undefined),
    showColumnSettings,
  };
};
