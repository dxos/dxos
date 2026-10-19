//
// Copyright 2026 DXOS.org
//

import type * as SlashCommand from '@dxos/assistant-toolkit/SlashCommand';
import { Obj } from '@dxos/echo';

import { Assistant } from '#types';

/** `/view <mode>` sets how the thread renders; the same choice as the chat toolbar's View menu. */
export const ViewSlashCommands: SlashCommand.SlashCommand[] = [
  {
    command: '/view',
    description: `Show the thread as ${Assistant.ChatViews.join(', ')}`,
    execute: async (args, { chat }) => {
      const mode = Assistant.ChatViews.find((view) => view === args.trim().toLowerCase());
      if (!mode) {
        return new Error(`Usage: /view ${Assistant.ChatViews.join(' | ')}`);
      }
      Obj.update(chat, (chat) => {
        chat.viewType = mode;
      });
      // No summary: the thread changing is the feedback, and a transcript line would be noise in every view.
      return {};
    },
  },
];
