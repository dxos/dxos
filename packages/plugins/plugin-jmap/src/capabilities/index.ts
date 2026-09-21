//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';

export { Connector } from './connector.ts';
export { MailSend } from './mail-send.ts';
export { OperationHandler } from './operation-handler.ts';
export const Translations = AppCapability.translations(translations);
