//
// Copyright 2026 DXOS.org
//

import { meta } from '#meta';

/** Tool id strings for inbox operations (matches {@link Skill.toolDefinitions} output from operation defs). */
const operation = (name: string): string => `${meta.profile.key}.operation.${name}`;

export const ToolIds = {
  ClassifyEmail: operation('classifyEmail'),
  DraftEmail: operation('draftEmail'),
  ReadEmail: operation('readEmail'),
  GoogleMailSync: operation('googleMailSync'),
  ExtractMessage: operation('extractMessage'),
  ExtractMailbox: operation('extractMailbox'),
  GoogleMailSend: operation('googleMailSend'),
  GoogleCalendarSync: operation('googleCalendarSync'),
} as const;
