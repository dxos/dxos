//
// Copyright 2025 DXOS.org
//

import { createContext } from '@dxos/react-hooks';
import { type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/ui-types';

// Kept out of `EditorPreviewProvider.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export type EditorPreviewPopoverValue = Partial<{
  link: PreviewLinkRef;
  target: PreviewLinkTarget;
  pending: boolean;
}>;

export const [EditorPreviewContextProvider, useEditorPreview] = createContext<EditorPreviewPopoverValue>(
  'PreviewPopover',
  {},
);
