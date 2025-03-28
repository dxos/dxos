//
// Copyright 2025 DXOS.org
//

import { mx } from '@dxos/react-ui-theme';

export const stackItemContentEditorClassNames = (role?: string) =>
  mx(
    'dx-focus-ring-inset data-[toolbar=disabled]:pbs-2 attention-surface',
    role === 'section' ? '[&_.cm-scroller]:overflow-hidden [&_.cm-scroller]:min-bs-24' : 'min-bs-0',
  );

export const stackItemContentToolbarClassNames = (role?: string) =>
  mx(
    'attention-surface is-full border-be !border-separator',
    role === 'section' && 'sticky block-start-0 z-[1] -mbe-px min-is-0',
  );
