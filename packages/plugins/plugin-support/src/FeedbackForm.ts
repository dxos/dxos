//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { FeedbackForm as FeedbackFormParts } from './components/FeedbackForm/index.ts';

export const { Root, DownloadLogs, Submit, DiscordPresence } = FeedbackFormParts;
export type {
  FeedbackFormDiscordPresenceProps as DiscordPresenceProps,
  FeedbackFormDownloadLogsProps as DownloadLogsProps,
  FeedbackPluginOption,
  FeedbackSubmitHandler,
  FeedbackFormRootProps as RootProps,
  FeedbackFormSubmitProps as SubmitProps,
} from './components/FeedbackForm/index.ts';
