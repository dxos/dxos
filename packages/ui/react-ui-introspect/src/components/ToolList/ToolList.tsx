//
// Copyright 2026 DXOS.org
//

// Renders the set of MCP tools exposed by `@dxos/introspect-mcp` (or any
// caller that supplies a compatible map of tool definitions). One row per
// tool; click to select. Selection is controlled — the parent owns the
// currently-selected tool name and renders the form / results panel for it.
//
// Built on `RowList` from `@dxos/react-ui-list`, which provides the
// `aria-current` / `dx-current` pairing, tabster arrow-key navigation,
// and the `ScrollArea`-backed Viewport for free.

import React, { useCallback, useMemo } from 'react';

import { Row, RowList } from '@dxos/react-ui-list';

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
  /** Fired when the user picks a row. */
  onSelect?: (name: string, tool: ToolEntry) => void;
  className?: string;
};

export const ToolList = ({ tools, selected, onSelect, className }: ToolListProps) => {
  const entries = useMemo(() => Object.entries(tools).sort(([a], [b]) => a.localeCompare(b)), [tools]);

  const handleCurrentChange = useCallback(
    (name: string) => {
      const tool = tools[name];
      if (tool) {
        onSelect?.(name, tool);
      }
    },
    [tools, onSelect],
  );

  return (
    <RowList.Root currentId={selected ?? undefined} onCurrentChange={handleCurrentChange}>
      <RowList.Viewport classNames={className} thin>
        <RowList.Content aria-label='MCP tools'>
          {entries.map(([name, tool]) => (
            <Row key={name} id={name}>
              <div className='font-mono text-xs text-info-text'>{name}</div>
              <div className='font-medium'>{tool.title}</div>
              {tool.description && (
                <div className='text-sm text-description line-clamp-2 mt-1'>{tool.description.trim()}</div>
              )}
            </Row>
          ))}
        </RowList.Content>
      </RowList.Viewport>
    </RowList.Root>
  );
};
