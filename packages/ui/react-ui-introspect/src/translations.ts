//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-introspect';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        // ToolForm
        'run-tool.label': 'Run tool',

        // ToolList
        'tools.label': 'MCP tools',

        // ToolResults
        'calling-tool.message': 'Calling tool…',
        'no-result.message': 'No result yet — fill the form and click Run tool.',
        'no-displayable-fields.message': '(no displayable fields)',
        'tool-result.label': 'Tool result',

        // ToolsExplorer
        'connection-failed.title': 'MCP Server connection failed',
      },
    },
  },
] as const satisfies Resource[];
