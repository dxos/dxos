//
// Copyright 2024 DXOS.org
//

import { Tool, zodSchema } from 'modelfusion';

import { log } from '@dxos/log';
import { z } from '@dxos/plate';

export const scheduler = () =>
  new Tool({
    name: 'scheduler',
    description: 'Schedule meetings with people.',
    parameters: zodSchema(
      z.object({
        subject: z.string().describe('Subject of meeting.'),
        attendees: z.array(z.string()).min(1).describe('Valid usernames of attendees.'),
      }),
    ),
    returnType: zodSchema(
      z.object({
        invitation: z.string().describe('Meeting url.'),
      }),
    ),
    execute: async ({ subject, attendees }) => {
      log.info('scheduler', { subject, attendees });
      return {
        invitation: 'https://meet.com/123',
      };
    },
  });
