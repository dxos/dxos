//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import * as Support from '../types/Support';
import * as SupportOperation from '../types/SupportOperation';

const operations = [
  SupportOperation.CreateTicket,
  SupportOperation.MarkInProgress,
  SupportOperation.ResolveTicket,
  SupportOperation.SearchDocs,
];

const make = () =>
  Skill.make({
    key: Support.SKILL_KEY,
    name: 'Support',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You are a Composer support assistant.
        Help the user diagnose problems with the app and capture issues as support tickets.

        Workflow:
        - When the user's report is ambiguous, ask one focused question at a time.
        - Search documentation before guessing — quote a relevant excerpt with its URL.
        - Capture a new ticket once you have a clear title and short description.
        - Mark a ticket in progress once active investigation begins.
        - Resolve a ticket only when the user explicitly confirms the issue is fixed,
          and include a short resolution note summarising what worked.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: Support.SKILL_KEY,
  make,
};

export default skill;
