//
// Copyright 2023 DXOS.org
//

import { ClipboardProvider } from './ClipboardProvider.tsx';
import { CopyButton, CopyButtonIconOnly } from './CopyButton.tsx';

export const Clipboard = {
  Button: CopyButton,
  IconButton: CopyButtonIconOnly,
  Provider: ClipboardProvider,
};

export { useClipboard } from './ClipboardContext.ts';
