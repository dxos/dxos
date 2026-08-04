//
// Copyright 2024 DXOS.org
//

// Kept out of `ResizeHandle.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

export const RESIZE_SUBJECT = 'data-dx-resize-subject';

export const resizeAttributes = {
  [RESIZE_SUBJECT]: true,
};
