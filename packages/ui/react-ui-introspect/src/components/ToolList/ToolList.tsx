//
// Copyright 2026 DXOS.org
//

// Renders the set of MCP tools exposed by `@dxos/introspect-mcp` (or any
// caller that supplies a compatible map of tool definitions). One row per
// tool; click to select. Selection is controlled — the parent owns the
// currently-selected tool name and renders the form / results panel for it.

import React, { useMemo } from 'react';

import { ScrollArea } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import type { ToolEntry } from '../types';

export type ToolListProps = {
  /**
   * Tool definitions keyed by their MCP tool name (`list_packages`,
   * `get_plugin`, etc.). Pass `Object.entries(createToolDefinitions(...))`
   * or the static metadata map exported from `@dxos/introspect-mcp/tools`.
   */
  tools: Record<string, ToolEntry>;
  /** Currently-selected tool name, or null/undefined for none. */
  selected?: string | null;
  /** Fired when the user clicks a row. */
  onSelect?: (name: string, tool: ToolEntry) => void;
  className?: string;
};

// TODO(burdon): Reconcile with react-ui-list and react-ui-stack.
export const ToolList = ({ tools, selected, onSelect, className }: ToolListProps) => {
  const entries = useMemo(() => Object.entries(tools).sort(([a], [b]) => a.localeCompare(b)), [tools]);

  return (
    <ScrollArea.Root orientation='vertical' classNames={className}>
      <ScrollArea.Viewport>
        <ul role='list' className='flex flex-col'>
          {entries.map(([name, tool]) => {
            const isSelected = selected === name;
            return (
              <li key={name}>
                <button
                  type='button'
                  aria-selected={isSelected}
                  className={mx('w-full text-left px-3 py-2 transition-colors dx-hover dx-selected')}
                  onClick={() => onSelect?.(name, tool)}
                >
                  {/* TODO(burdon): Tag. */}
                  <div className='font-mono text-xs text-subdueText'>{name}</div>
                  <div className='font-medium'>{tool.title}</div>
                  {tool.description && (
                    <div className='text-sm text-description line-clamp-2 mt-1'>{tool.description.trim()}</div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};
