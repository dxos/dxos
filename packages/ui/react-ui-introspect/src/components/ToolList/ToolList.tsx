//
// Copyright 2026 DXOS.org
//

// Renders the set of MCP tools exposed by `@dxos/introspect-mcp` (or any
// caller that supplies a compatible map of tool definitions). One row per
// tool; click to select. Selection is controlled — the parent owns the
// currently-selected tool name and renders the form / results panel for it.

import React from 'react';

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

export const ToolList = ({ tools, selected, onSelect, className }: ToolListProps) => {
  // Sort by name for deterministic order — the tools map is unordered in
  // principle, but a model browsing a long list benefits from alphabetical.
  const entries = React.useMemo(() => Object.entries(tools).sort(([a], [b]) => a.localeCompare(b)), [tools]);

  return (
    <ul role='list' className={mx('flex flex-col gap-1 overflow-auto p-2', className)}>
      {entries.map(([name, tool]) => {
        const isSelected = selected === name;
        return (
          <li key={name}>
            <button
              type='button'
              aria-pressed={isSelected}
              onClick={() => onSelect?.(name, tool)}
              className={mx(
                'w-full text-left rounded-md px-3 py-2 transition-colors',
                'hover:bg-hoverSurface focus-visible:outline focus-visible:outline-2 focus-visible:outline-accentSurface',
                isSelected ? 'bg-activeSurface text-accentText' : 'bg-baseSurface',
              )}
            >
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
  );
};
