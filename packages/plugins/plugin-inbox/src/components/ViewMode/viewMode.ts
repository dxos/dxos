//
// Copyright 2026 DXOS.org
//

import { type ActionGroupBuilderFn } from '@dxos/react-ui-menu';

/**
 * How the selected block is sourced and rendered.
 *   - `enriched`: the enriched (second) text block, decorated via the markdown extensions.
 *   - `markdown`: the plain (first) text block, decorated via the markdown extensions.
 *   - `plain`:    the plain (first) text block, shown verbatim with no markdown parsing.
 */
export type ViewMode = 'enriched' | 'markdown' | 'plain';

export const VIEW_MODE_ICONS: Record<ViewMode, string> = {
  enriched: 'ph--article--regular',
  markdown: 'ph--markdown-logo--regular',
  plain: 'ph--text-t--regular',
};

export type ViewModeGroupOptions = {
  /** Translation namespace for the menu labels. */
  ns: string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  /** Modes offered, in order. Defaults to all three. */
  modes?: ViewMode[];
};

/**
 * Toolbar dropdown that switches how a body is rendered (enriched/markdown/plain).
 * Shared by the Message and Event toolbars; compose via `MenuBuilder.subgraph(viewModeGroup(...))`.
 */
export const viewModeGroup =
  ({
    ns,
    viewMode,
    setViewMode,
    modes = ['enriched', 'markdown', 'plain'],
  }: ViewModeGroupOptions): ActionGroupBuilderFn =>
  (builder) => {
    builder.group(
      'viewMode',
      {
        label: ['view-mode.menu', { ns }],
        icon: 'ph--article--regular',
        iconOnly: true,
        variant: 'dropdownMenu',
        applyActive: true,
        selectCardinality: 'single',
        value: viewMode,
      },
      (group) => {
        for (const mode of modes) {
          group.action(
            mode,
            {
              label: [`view-mode-${mode}.menu`, { ns }],
              icon: VIEW_MODE_ICONS[mode],
              checked: viewMode === mode,
            },
            () => setViewMode(mode),
          );
        }
      },
    );
  };
