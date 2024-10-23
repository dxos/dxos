//
// Copyright 2024 DXOS.org
//

import { useRef, useCallback, useState, type MouseEvent } from 'react';

import { columnSettingsButtonAttr, rowMenuButtonAttr, newColumnButtonAttr } from '../model';

type MenuState =
  | { type: 'column'; columnId: string }
  | { type: 'row'; rowIndex: number }
  | { type: 'newColumn' }
  | undefined;

export const useTableMenuController = () => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [state, setState] = useState<MenuState>();

  const handleClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;

    const columnButton = target.closest(`button[${columnSettingsButtonAttr}]`);
    if (columnButton) {
      triggerRef.current = columnButton as HTMLButtonElement;
      const columnId = columnButton.getAttribute(columnSettingsButtonAttr)!;
      setState({ type: 'column', columnId });
      return;
    }

    const rowButton = target.closest(`button[${rowMenuButtonAttr}]`);
    if (rowButton) {
      triggerRef.current = rowButton as HTMLButtonElement;
      const rowIndex = Number(rowButton.getAttribute(rowMenuButtonAttr));
      setState({ type: 'row', rowIndex });
      return;
    }

    const newColumnButton = target.closest(`button[${newColumnButtonAttr}]`);
    if (newColumnButton) {
      triggerRef.current = newColumnButton as HTMLButtonElement;
      setState({ type: 'newColumn' });
    }
  }, []);

  return {
    state,
    triggerRef,
    handleClick,
    close: () => setState(undefined),
  };
};
