//
// Copyright 2025 DXOS.org
//

import { mx } from '@dxos/react-ui-theme';

export const stackItemContentEditorClassNames = (role: string) =>
  mx(
    'ch-focus-ring-inset data-[toolbar=disabled]:pbs-2 attention-surface',
    role === 'article' ? 'min-bs-0' : '[&_.cm-scroller]:overflow-hidden [&_.cm-scroller]:min-bs-24',
  );
