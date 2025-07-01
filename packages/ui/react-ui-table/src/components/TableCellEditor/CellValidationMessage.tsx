//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useGridContext, type GridScopedProps } from '@dxos/react-ui-grid';

export type CellValidationMessageProps = {
  validationError: string | null;
};

export const CellValidationMessage = ({
  validationError,
  __gridScope,
}: GridScopedProps<CellValidationMessageProps>) => {
  const { editing, editBox: box } = useGridContext('GridSheetCellEditor', __gridScope);

  if (!editing || !validationError) {
    return null;
  }

  return (
    <div
      role='none'
      className='absolute bg-errorSurface text-errorSurfaceText rounded-bs-sm text-xs p-1'
      style={{
        ...{ '--dx-gridCellWidth': `${box?.inlineSize ?? 200}px` },
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
