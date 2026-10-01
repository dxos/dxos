//
// Copyright 2026 DXOS.org
//

// The action model is shared with the root entry, so a call site migrates by changing its import path only.
export * from '../hooks/index.ts';
export * from '../types.ts';
export {
  createGapSeparator,
  createLineSeparator,
  createMenuAction,
  createMenuItemGroup,
  executeMenuAction,
  fallbackIcon,
} from '../util.ts';
export { type ActionGroupBuilder, type ActionGroupBuilderFn, MenuBuilder } from '../builder.ts';
export { PROMPT_DISPOSITION, TOOLBAR_DISPOSITION, isPromptAction, isToolbarAction } from '../toolbar.ts';
export { applyPresentation } from '../presentation.ts';

export * from './ActionMenu.tsx';
export * from './ActionToolbar.tsx';
