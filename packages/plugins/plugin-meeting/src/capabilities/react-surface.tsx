//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, Surface, useCapability } from '@dxos/app-framework';
import { getSchemaTypename, isInstanceOf } from '@dxos/echo-schema';
import { DocumentType } from '@dxos/plugin-markdown/types';

import { MeetingCapabilities } from './capabilities';
import { CallSidebar, MeetingContainer, MeetingStatusDetail, MissingArtifact } from '../components';
import { MEETING_PLUGIN } from '../meta';
import { MeetingType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${MEETING_PLUGIN}/article`,
      role: 'article',
      filter: (data): data is { subject: MeetingType; variant: undefined } =>
        isInstanceOf(MeetingType, data.subject) && !data.variant,
      component: ({ data }) => <MeetingContainer meeting={data.subject} />,
    }),
    createSurface({
      id: `${MEETING_PLUGIN}/missing-companion`,
      role: 'article',
      filter: (data): data is { companionTo: MeetingType; variant: string; subject: null } =>
        !data.subject && isInstanceOf(MeetingType, data.companionTo) && typeof data.variant === 'string',
      component: ({ data }) => <MissingArtifact meeting={data.companionTo} typename={data.variant} />,
    }),
    createSurface({
      id: `${MEETING_PLUGIN}/meeting-summary`,
      role: 'article',
      filter: (data): data is { companionTo: MeetingType; subject: 'summary' } =>
        isInstanceOf(MeetingType, data.companionTo) &&
        data.variant === 'summary' &&
        isInstanceOf(DocumentType, data.companionTo.artifacts[getSchemaTypename(DocumentType)!]?.target),
      component: ({ data }) => {
        return (
          <Surface
            data={{ subject: data.companionTo.artifacts[getSchemaTypename(DocumentType)!].target }}
            role='article'
            limit={1}
          />
        );
      },
    }),
    createSurface({
      id: `${MEETING_PLUGIN}/assistant`,
      role: 'deck-companion--active-meeting',
      component: () => <CallSidebar />,
    }),
    createSurface({
      id: `${MEETING_PLUGIN}/devtools-overview`,
      role: 'devtools-overview',
      component: () => {
        const call = useCapability(MeetingCapabilities.CallManager);
        return <MeetingStatusDetail state={call.state} />;
      },
    }),
  ]);
