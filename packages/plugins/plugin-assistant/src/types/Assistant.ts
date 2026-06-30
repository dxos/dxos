//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

// Re-export Chat schema for backward compatibility.
import { Chat as ChatModule } from '@dxos/assistant-toolkit';
export const Chat = ChatModule.Chat;
export type Chat = ChatModule.Chat;

import { type DXN } from '@dxos/keys';

// TODO(wittjosiah): Why are we re-exporting rather than using the setting namespace directly?
// Re-export Settings as merged const/type (not as namespace).
import * as Settings$ from './Settings'; // eslint-disable-line
export const Settings = Settings$.Settings;
export type Settings = Settings$.Settings;

export const ChatViews = Settings$.ChatViews;
export const ChatView = Settings$.ChatView;
export type ChatView = Settings$.ChatView;

export const ModelProviders: readonly DXN.DXN[] = Settings$.ModelProviders;
export const ModelProvider = Settings$.ModelProvider;
export type ModelProvider = Settings$.ModelProvider;

export const ModelDefaults = Settings$.ModelDefaults;
export type ModelDefaults = Settings$.ModelDefaults;
