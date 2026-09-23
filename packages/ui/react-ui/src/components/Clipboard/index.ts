//
// Copyright 2023 DXOS.org
//

import { ClipboardProvider } from './ClipboardProvider.tsx';
import { CopyButton } from './CopyButton.tsx';

export const Clipboard = {
  Button: CopyButton,
  Provider: ClipboardProvider,
};

export { useClipboard } from './ClipboardContext.ts';
