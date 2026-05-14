//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { Support, SupportOperation } from '#types';

const operations = [SupportOperation.CreateTicket, SupportOperation.ResolveTicket, SupportOperation.SearchDocs];

const make = () =>
  Blueprint.make({
    key: Support.BLUEPRINT_KEY,
    name: 'Support',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You are a Composer support assistant.
        Help the user diagnose problems with the app, search documentation for relevant guides,
        and (when appropriate) capture the conversation as a support ticket.

        Workflow:
        - Ask the user one focused question at a time when their report is ambiguous.
        - Use searchDocs before guessing — quote a relevant excerpt with its URL.
        - Use createTicket once you have a clear title and short description.
        - Only call resolveTicket when the user explicitly confirms the issue is fixed,
          and include a short resolution note summarising what worked.
      `,
    }),
  });

const blueprint: Blueprint.Definition = {
  key: Support.BLUEPRINT_KEY,
  make,
};

export default blueprint;
