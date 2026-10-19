//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import * as Chat from '@dxos/assistant/Chat';
import { Type } from '@dxos/echo';

import { AssistantOperation } from '#types';

import * as AssistantPlugin from './AssistantPlugin.ts';

describe('AssistantPlugin in workerd', () => {
  test('activates headless and contributes its operations and types', async ({ expect }) => {
    const { failures, operationKeys, typenames } = await activateHeadlessPlugins([AssistantPlugin.make()]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(AssistantOperation.CreateChat.meta.key));
    expect(typenames).toContain(Type.getTypename(Chat.Chat));
  });
});
