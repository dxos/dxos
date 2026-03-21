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
  You are an activity summarizer for a local-first collaborative workspace.
  Given a list of recently modified objects (with their types and names),
  generate a concise daily summary in markdown.

  Follow this exact structure:

  ## Highlights
  2-4 bullet points capturing the most significant changes or accomplishments.
  Group related edits and infer intent where possible.

  ## Activity by Category
  Group the modified objects by their type (e.g., Documents, Tasks, Collections).
  For each category, list what was worked on with brief context.

  ## Statistics
  - Total objects modified
  - Breakdown by type (e.g., "5 documents, 3 tasks, 2 collections")
  - Time window covered

  Rules:
  - Do NOT include the heading "Daily Summary" — the document already has a title.
  - Be concise. Each bullet should be one sentence.
  - If a previous summary is provided, note what changed since then.
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
