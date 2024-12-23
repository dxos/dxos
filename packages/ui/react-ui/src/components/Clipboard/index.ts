//
// Copyright 2023 DXOS.org
//

import { ClipboardProvider } from './ClipboardProvider';
import { CopyButton, CopyButtonIconOnly } from './CopyButton';

export const Clipboard = {
  Button: CopyButton,
  IconButton: CopyButtonIconOnly,
  Provider: ClipboardProvider,
};

export { useClipboard } from './ClipboardProvider';
