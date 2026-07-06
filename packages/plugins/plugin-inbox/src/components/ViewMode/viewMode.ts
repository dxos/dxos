//
// Copyright 2026 DXOS.org
//

import { type ActionGroupBuilderFn } from '@dxos/react-ui-menu';

/**
 * How the body is rendered.
 *   - `html`:     the raw email HTML, rendered in a sandboxed iframe (the default for messages).
 *   - `enriched`: the enriched (second) text block, decorated via the markdown extensions.
 *   - `markdown`: the body converted to markdown in-memory, decorated via the markdown extensions.
 *   - `plain`:    the body as text, shown verbatim with no markdown parsing.
 */
export type ViewMode = 'html' | 'enriched' | 'markdown' | 'plain';

export const VIEW_MODE_ICONS: Record<ViewMode, string> = {
  html: 'ph--browser--regular',
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
  /** Disable the group (e.g. while editing, when the rendered view is irrelevant). */
  disabled?: boolean;
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
    disabled,
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
        disabled,
      },
      (group) => {
        for (const mode of modes) {
          group.action(
            mode,
            {
              label: [`view-mode-${mode}.menu`, { ns }],
              icon: VIEW_MODE_ICONS[mode],
              checked: viewMode === mode,
              disabled,
            },
            () => setViewMode(mode),
          );
        }
      },
    );
  };
