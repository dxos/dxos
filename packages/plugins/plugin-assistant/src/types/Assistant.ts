//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import { type DXN } from '@dxos/keys';

// Re-export Settings as merged const/type (not as namespace).
import * as SettingsModule from './Settings';
export const Settings = SettingsModule.Settings;
export type Settings = SettingsModule.Settings;

export const ChatViews = SettingsModule.ChatViews;

export const ModelProviders: readonly DXN.DXN[] = SettingsModule.ModelProviders;
export const ModelProvider = SettingsModule.ModelProvider;
export type ModelProvider = SettingsModule.ModelProvider;

export const ModelDefaults = SettingsModule.ModelDefaults;
export type ModelDefaults = SettingsModule.ModelDefaults;
