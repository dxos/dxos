//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { DailySummaryHandlers, GenerateSummary } from './functions';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.daily-summary';

/**
 * Predefined structure for the AI-generated daily summary.
 * Used as the system prompt for the summarization model.
 */
export const SUMMARY_STRUCTURE = trim`
  Given a list of recently modified objects,
  generate a concise daily summary in markdown, 
  try to pull insights from the changes and the context of the changes.
  Focus on the meaningful changes and try to avoid changes in the system objects.

  Follow this exact structure:

  ## Highlights
  Bullet points capturing the most significant changes or accomplishments.

  ## TODOs
  List of TODOs that is inferred from the changes and the context of the changes.

  Rules:
  - Do NOT include the heading "Daily Summary" — the document already has a title.
  - Be concise. Each bullet should be one sentence.
  - If a previous summary is provided, note what changed since then.
  - Try to pull actionable pointots from the changes and the context of the changes.
  - Output raw markdown only, no wrapping code fences.
`;

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
  operations: DailySummaryHandlers,
  make,
};

export default blueprint;
