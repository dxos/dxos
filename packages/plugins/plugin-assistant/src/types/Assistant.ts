//
// Copyright 2024 DXOS.org
//

import { Chat as ChatModule } from '@dxos/assistant-toolkit';

// Re-export Chat schema for backward compatibility.
export const Chat = ChatModule.Chat;
export type Chat = ChatModule.Chat;

export { Settings } from './Settings';
