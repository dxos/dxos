//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type GridScopedProps, useGridContext } from '@dxos/react-ui-grid';

export type CellValidationMessageProps = {
  validationError: string | null;
  variant?: 'error' | 'warning';
};

export const CellValidationMessage = ({
  __gridScope,
  validationError,
  variant = 'error',
}: GridScopedProps<CellValidationMessageProps>) => {
  const { editing, editBox: box } = useGridContext('GridSheetCellEditor', __gridScope);

  if (!editing || !validationError) {
    return null;
  }

  const bgClass = variant === 'error' ? 'bg-error-surface' : 'bg-warning-surface';
  const textClass = variant === 'error' ? 'text-error-surface-text' : 'text-warning-surface-text';

  return (
    <div
      role='none'
      className={`absolute ${bgClass} ${textClass} rounded-h-sm text-xs p-1`}
      style={{
        ...{ '--dx-grid-cell-width': `${box?.inlineSize ?? 200}px` },
        zIndex: 10,
        insetBlockEnd: `calc(100% - ${box.insetBlockStart}px)`,
        insetInlineStart: box.insetInlineStart,
        inlineSize: box.inlineSize,
      }}
    >
      {validationError}
    </div>
  );
};
