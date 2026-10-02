//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { Channel } from '@dxos/types';

import { MeetingArticle } from '#containers';
import { Meeting } from '#types';

import { MeetingCompanion } from './MeetingCompanion.tsx';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'meeting',
        filter: AppSurface.object(AppSurface.Article, Meeting.Meeting),
        component: MeetingArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.Root.create({
        id: 'meetingCompanion',
        filter: Surface.Root.makeFilter(
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
