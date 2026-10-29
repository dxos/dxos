//
// Copyright 2026 DXOS.org
//

/** The trace's strings, under the plugin's namespace. */
export const traceTranslations: Record<string, string> = {
  'trace.label': 'Trajectory explained',
  'trace-loading.message': 'Explaining...',
  'trace-empty.message': 'Run the research to see its trace.',
  'trace-summary.label':
    '{{wall}} wall · {{cost}} · {{turns}} turns ({{tokensIn}} tokens in, {{tokensOut}} out) · {{calls}} tool calls · {{loads}} loads · {{extracts}} extractions · {{models}} System One calls · {{facts}} facts · {{results}} results',
  'trace-failed.label': '{{count}} failed',
  'trace-legend.label': 'Row colours',
  'trace-category-llm.label': 'LLM',
  'trace-category-llm.description': 'Agent turns, and the LLMs tools call',
  'trace-category-system-one.label': 'System One',
  'trace-category-system-one.description': 'Clairic and Clef',
  'trace-category-tool.label': 'Non-model',
  'trace-category-tool.description': 'Tool calls, commands, loads and extractions',
  'trace-expand.label': 'Expand all',
  'trace-collapse.label': 'Collapse',
  'trace-expand-row.label': 'Expand',
  'trace-collapse-row.label': 'Collapse',
  'trace-more.label': '+ {{count}} more',
  'trace-subjects.label': '{{count}} subjects',
  'trace-types.label': 'Types',
  'trace-predicates.label': 'Predicates',
  'trace-step.label': 'Step',
  'trace-timeline.label': 'Timeline',
  'trace-time.label': 'Time',
  'trace-cost.label': 'Cost',
  'trace-pages.label': 'Pages',
  'trace-facts.label': 'Facts',
  'trace-results.label': 'Results',
};
