//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';

import { MeetingArticle, MeetingsList } from '#containers';

export type MeetingCompanionProps = {
  role: string;
  /** The `'meeting'` sentinel selects the channel's meeting list; a Meeting object selects one meeting. */
  subject: unknown;
  companionTo: unknown;
};

export const MeetingCompanion = ({ role, subject, companionTo }: MeetingCompanionProps) => {
  if (subject === 'meeting') {
    // The surface filter already guarantees a Channel, but `companionTo` is untyped on the article data.
    return Obj.isObject(companionTo) ? <MeetingsList companionTo={companionTo} /> : null;
  }

  return <MeetingArticle role={role} subject={subject} />;
};
