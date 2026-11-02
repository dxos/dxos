//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, type Range, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

/**
 * Fenced-code languages rendered by a plugin's own editor extension, keyed by the fence's info
 * string; a fence in one of these languages offers to enable the plugin while it is off.
 */
export const FENCE_LANGUAGE_PLUGINS: Readonly<Record<string, string>> = {
  mermaid: 'org.dxos.plugin.mermaid',
};

export type PluginFence = {
  /** Start of the fence's opening line. */
  from: number;
  language: string;
  pluginId: string;
};

const FENCE_OPEN = /^\s*(`{3,}|~{3,})\s*([^\s`]*)/;

/**
 * Fences whose language maps to a plugin. Scans lines rather than the syntax tree so the result
 * does not depend on the markdown parser having reached the fence.
 */
export const findPluginFences = (
  state: EditorState,
  plugins: Readonly<Record<string, string>> = FENCE_LANGUAGE_PLUGINS,
): PluginFence[] => {
  const fences: PluginFence[] = [];
  let open: string | undefined;
  for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber++) {
    const line = state.doc.line(lineNumber);
    if (open) {
      const trimmed = line.text.trim();
      // A closing fence uses the opening character at least as many times, with no info string.
      if (trimmed.startsWith(open) && /^(`+|~+)$/.test(trimmed)) {
        open = undefined;
      }
      continue;
    }

    const match = FENCE_OPEN.exec(line.text);
    if (!match) {
      continue;
    }
    open = match[1];
    const language = match[2].toLowerCase();
    const pluginId = Object.hasOwn(plugins, language) ? plugins[language] : undefined;
    if (pluginId) {
      fences.push({ from: line.from, language, pluginId });
    }
  }
  return fences;
};

export type PluginFencesOptions = {
  /** Fence language → plugin id. */
  plugins?: Readonly<Record<string, string>>;
  /** True when the plugin is installed but not enabled — the only case worth offering. */
  canEnable: (pluginId: string) => boolean;
  /** Invoked from the button, e.g. to open the plugin registry filtered by the fence's language. */
  onSelect: (fence: Pick<PluginFence, 'language' | 'pluginId'>) => void;
  /** Button text. */
  label: string;
  /** Shown on hover, in the app's tooltip style rather than the browser's `title`. */
  tooltip: string;
};

/** Decorations for the fences whose plugin can be enabled. */
export const buildPluginFenceDecorations = (state: EditorState, options: PluginFencesOptions): DecorationSet => {
  const decorations: Range<Decoration>[] = [];
  for (const fence of findPluginFences(state, options.plugins)) {
    if (!options.canEnable(fence.pluginId)) {
      continue;
    }
    // The line is the positioning context so the button sits in the block's top-right corner.
    decorations.push(Decoration.line({ class: 'cm-plugin-fence' }).range(fence.from));
    decorations.push(
      Decoration.widget({
        widget: new EnablePluginWidget(fence.language, fence.pluginId, options),
        side: -1,
      }).range(fence.from),
    );
  }
  return Decoration.set(decorations, true);
};

// Built once: every `EditorView.theme` call mints a new stylesheet, which restyles the whole document.
const pluginFenceTheme = EditorView.theme({
  '& .cm-plugin-fence': {
    position: 'relative',
  },
  '& .cm-plugin-fence-button': {
    position: 'absolute',
    top: '4px',
    right: '4px',
    zIndex: '1',
  },
  // Drawn only while the pointer is over the button, above its end edge.
  '& .cm-plugin-fence-tooltip': {
    position: 'absolute',
    bottom: 'calc(100% + 4px)',
    right: '0',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    visibility: 'hidden',
  },
  '& .cm-plugin-fence-button:hover .cm-plugin-fence-tooltip': {
    visibility: 'visible',
  },
});

/**
 * Shows an "Enable plugin" button, which opens the plugin registry, on fences whose language is rendered by a disabled plugin.
 * The host reconfigures the extension when the enabled set changes, so the button goes away once
 * the plugin (and with it the extension that renders the fence) is on.
 */
export const pluginFences = (options: PluginFencesOptions): Extension => [
  StateField.define<DecorationSet>({
    create: (state) => buildPluginFenceDecorations(state, options),
    update: (decorations, tr) => (tr.docChanged ? buildPluginFenceDecorations(tr.state, options) : decorations),
    provide: (field) => EditorView.decorations.from(field),
  }),
  pluginFenceTheme,
];

class EnablePluginWidget extends WidgetType {
  constructor(
    private readonly _language: string,
    private readonly _pluginId: string,
    private readonly _options: PluginFencesOptions,
  ) {
    super();
  }

  override eq(other: this) {
    return this._language === other._language && this._pluginId === other._pluginId && this._options === other._options;
  }

  // The button owns its events; the editor must not move the selection into the fence on click.
  override ignoreEvent() {
    return true;
  }

  override toDOM() {
    const button = Domino.of('button')
      .classNames('dx-control dx-button cm-plugin-fence-button')
      .attributes({ 'type': 'button', 'data-size': 'sm', 'data-variant': 'valence', 'data-valence': 'info' })
      // The plugin registry's own icon, so the button reads as the way to the registry.
      .append(Domino.svg('ph--squares-four--regular'))
      .append(
        Domino.of('span').text(this._options.label),
        Domino.of('span').classNames('dx-popup dx-tooltip cm-plugin-fence-tooltip').text(this._options.tooltip),
      ).root;
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', (event) => {
      event.preventDefault();
      this._options.onSelect({ language: this._language, pluginId: this._pluginId });
    });
    return button;
  }
}
