//
// Copyright 2026 DXOS.org
//

import type * as SlashCommand from '@dxos/assistant-toolkit/SlashCommand';
import { Obj } from '@dxos/echo';

import { Assistant } from '#types';

export const ViewSlashCommands: SlashCommand.SlashCommand[] = [
  {
    command: '/view',
    description: `Show the thread as ${Assistant.ChatViews.join(', ')}`,
    chatOnly: true,
    execute: async (args, { chat }) => {
      const mode = Assistant.ChatViews.find((view) => view === args.trim().toLowerCase());
      if (!mode) {
        return new Error(`Usage: /view ${Assistant.ChatViews.join(' | ')}`);
      }
      Obj.update(chat, (chat) => {
        chat.viewType = mode;
      });
      return {};
    },
  },
];
