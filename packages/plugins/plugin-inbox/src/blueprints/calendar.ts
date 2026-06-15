//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { InboxOperation } from '#types';
import { Calendar } from '#types';

const make = () =>
  Blueprint.make({
    key: Calendar.BLUEPRINT_KEY,
    name: 'Calendar',
    tools: Blueprint.toolDefinitions({ operations: [InboxOperation.GoogleCalendarSync], tools: [] }),
    instructions: Template.make({
      source: trim`
        You manage my calendar.
      `,
    }),
  });

const blueprint: Blueprint.Definition = {
  key: Calendar.BLUEPRINT_KEY,
  make,
};

export default blueprint;
