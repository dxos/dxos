//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { DailySummaryHandlers, GenerateSummary } from './functions';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.daily-summary';

export { DailySummaryHandlers };

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Daily Summary',
    tools: Blueprint.toolDefinitions({ operations: [GenerateSummary] }),
    instructions: Template.make({
      source: trim`
        {{! Daily Summary }}

        You generate concise daily activity summaries as Markdown documents.
        When asked to summarize, use the generate tool to query recent objects and produce a summary.
        The tool creates a Markdown document in a "Summaries" collection.
        If a summary for today already exists, it updates the existing document.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
