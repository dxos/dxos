//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, Surface } from '@dxos/app-framework';
import { getSchemaTypename, isInstanceOf } from '@dxos/echo-schema';
import { DocumentType } from '@dxos/plugin-markdown/types';

import { CallSidebar, MeetingContainer, MissingArtifact } from '../components';
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
      position: 'fallback',
      filter: (data): data is { subject: MeetingType; variant: string } =>
        isInstanceOf(MeetingType, data.subject) && !!data.variant,
      component: ({ data }) => <MissingArtifact meeting={data.subject} typename={data.variant} />,
    }),
    createSurface({
      id: `${MEETING_PLUGIN}/meeting-summary`,
      role: 'article',
      filter: (data): data is { subject: MeetingType; variant: 'summary' } =>
        isInstanceOf(MeetingType, data.subject) &&
        data.variant === 'summary' &&
        isInstanceOf(DocumentType, data.subject.artifacts[getSchemaTypename(DocumentType)!]?.target),
      component: ({ data }) => {
        return (
          <Surface
            data={{ subject: data.subject.artifacts[getSchemaTypename(DocumentType)!].target }}
            role='article'
            limit={1}
          />
        );
      },
    }),
    createSurface({
      id: `${MEETING_PLUGIN}/assistant`,
      role: 'complementary--meeting',
      component: () => <CallSidebar />,
    }),
  ]);
