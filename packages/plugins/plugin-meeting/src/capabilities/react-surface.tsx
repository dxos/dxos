//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Channel } from '@dxos/types';

import { MeetingArticle, MeetingsList } from '#containers';
import { Meeting } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'meeting',
        filter: AppSurface.object(AppSurface.Article, Meeting.Meeting),
        component: ({ role, data }) => (
          <MeetingArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'meetingCompanion',
        filter: {
          bindings: [
            {
              role: AppSurface.Article.role,
              guard: (
                data: unknown,
              ): data is {
                subject: Meeting.Meeting | 'meeting';
                attendableId: string;
                companionTo: Channel.Channel;
              } => {
                if (typeof data !== 'object' || data === null) {
                  return false;
                }
                const d = data as { subject?: unknown; attendableId?: unknown; companionTo?: unknown };
                return (
                  typeof d.attendableId === 'string' &&
                  (Obj.instanceOf(Meeting.Meeting, d.subject) || d.subject === 'meeting') &&
                  Obj.instanceOf(Channel.Channel, d.companionTo)
                );
              },
            },
          ],
        } satisfies Surface.Filter<{
          subject: Meeting.Meeting | 'meeting';
          attendableId: string;
          companionTo: Channel.Channel;
        }>,
        component: ({ role, data }) => {
          return data.subject === 'meeting' ? (
            <MeetingsList companionTo={data.companionTo} />
          ) : (
            <MeetingArticle role={role} subject={data.subject} />
          );
        },
      }),
    ]),
  ),
);
