//
// Copyright 2026 DXOS.org
//

import { useState } from 'react';

/** Phase 1 stub — full selection wiring comes with DragTool in Phase 2. */
export const useSelection = (): Set<string> => {
  const [ids] = useState(() => new Set<string>());
  return ids;
};
