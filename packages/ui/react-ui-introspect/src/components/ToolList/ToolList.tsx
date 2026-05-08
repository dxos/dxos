//
// Copyright 2026 DXOS.org
//

// Renders the set of MCP tools exposed by `@dxos/introspect-mcp` (or any
// caller that supplies a compatible map of tool definitions). One row per
// tool; click to select. Selection is controlled — the parent owns the
// currently-selected tool name and renders the form / results panel for it.
//
// Built on `RowList` from `@dxos/react-ui-list`, which provides the
// `aria-selected` / `dx-selected` pairing (via `selectedId` /
// `onSelectChange`), tabster arrow-key navigation, and the
// `ScrollArea`-backed Viewport for free.

import React, { useCallback, useMemo } from 'react';

import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Row, RowList } from '@dxos/react-ui-list';

import { translationKey } from '#translations';

import type { ToolEntry } from '../types';

// Not `composable()` — ToolList's outermost rendered element is
// `<RowList.Root>`, which is headless. Slot-merging className/ref onto
// a headless component is a no-op, so an `asChild` surface here would
// be misleading. Consumers needing slot semantics should reach for
// `RowList` directly. `classNames` flows through to the visible
// scroll surface (`RowList.Viewport`).
export type ToolListProps = ThemedClassName<{
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
}>;

export const ToolList = ({ tools, selected, onSelect, classNames }: ToolListProps) => {
  const { t } = useTranslation(translationKey);
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
    <RowList.Root selectedId={selected ?? undefined} onSelectChange={handleCurrentChange}>
      <RowList.Viewport classNames={classNames} thin>
        <RowList.Content aria-label={t('tools.label')}>
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
