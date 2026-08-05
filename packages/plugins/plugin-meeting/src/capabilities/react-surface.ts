//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Channel } from '@dxos/types';

import { MeetingArticle } from '#containers';
import { Meeting } from '#types';

import { MeetingCompanion } from './MeetingCompanion';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'meeting',
        filter: AppSurface.object(AppSurface.Article, Meeting.Meeting),
        component: MeetingArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'meetingCompanion',
        filter: Surface.makeFilter(
          AppSurface.Article,
          (data) =>
            (Obj.instanceOf(Meeting.Meeting, data.subject) || data.subject === 'meeting') &&
            Obj.instanceOf(Channel.Channel, data.companionTo),
        ),
        component: MeetingCompanion,
        props: ({ role, data: { subject, companionTo } }) => ({ role, subject, companionTo }),
      }),
    ]),
  ),
);
