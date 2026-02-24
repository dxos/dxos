//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { mx } from '@dxos/ui-theme';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

// https://tailwindcss.com/docs/font-weight
const headings: Record<HeadingLevel, { className: string; fontSize: string; lineHeight: string }> = {
  1: {
    className: 'text-4xl',
    fontSize: 'var(--text-4xl)',
    lineHeight: 'var(--text-4xl--line-height)',
  },
  2: {
    className: 'text-3xl',
    fontSize: 'var(--text-3xl)',
    lineHeight: 'var(--text-3xl--line-height)',
  },
  3: {
    className: 'text-2xl',
    fontSize: 'var(--text-2xl)',
    lineHeight: 'var(--text-2xl--line-height)',
  },
  4: {
    className: 'text-xl',
    fontSize: 'var(--text-xl)',
    lineHeight: 'var(--text-xl--line-height)',
  },
  5: {
    className: 'text-lg',
    fontSize: 'var(--text-lg)',
    lineHeight: 'var(--text-lg--line-height)',
  },
  6: {
    className: 'text-base',
    fontSize: 'var(--text-base)',
    lineHeight: 'var(--text-base--line-height)',
  },
};

export const markdownTheme = {
  code: 'font-mono no-underline! text-cm-code',
  codeMark: 'font-mono text-cm-code-mark',
  mark: 'opacity-50',
  heading: (level: HeadingLevel) => ({
    className: mx(headings[level].className, 'font-light text-cm-heading'),
    color: 'var(--color-cm-heading) !important',
    lineHeight: headings[level].lineHeight,
    fontSize: headings[level].fontSize,
    fontWeight: '100 !important',
  }),
};

// Font families matching --font-body and --font-mono in theme.css.
export const fontBody = 'Inter Variable, ui-sans-serif, system-ui, sans-serif';
export const fontMono = 'JetBrains Mono Variable, ui-monospace, Cascadia Code, Source Code Pro, monospace';

/**
 * Global base theme.
 *
 * NOTE: The base theme is GLOBAL and is applied to ALL editors.
 * NOTE: `light` and `dark` selectors are preprocessed by CodeMirror and can only be in the base theme.
 * NOTE: Use 'unset' to remove default CM style.
 *
 * Examples:
 * - https://codemirror.net/examples/styling
 * - https://github.com/codemirror/view/blob/main/src/theme.ts
 * - https://github.com/codemirror/theme-one-dark/blob/main/src/one-dark.ts
 *
 * Main layout:
 * - https://codemirror.net/examples/styling
 * - https://codemirror.net/docs/guide (DOM Structure).
 *
 * <div class="cm-editor [cm-focused] [generated classes]">
 *   <div class="cm-scroller">
 *     <div class="cm-gutters">
 *       <div class="cm-gutter [...]">
 *         <div class="cm-gutterElement">...</div>
 *       </div>
 *     </div>
 *     <div class="cm-content" role="textbox" contenteditable="true">
 *       <div class="cm-line"></div>
 *     </div>
 *     <div class="cm-selectionLayer">
 *       <div class="cm-selectionBackground"></div>
 *     </div>
 *     <div class="cm-cursorLayer">
 *       <div class="cm-cursor"></div>
 *     </div>
 *   </div>
 * </div>
 */
export const baseTheme = EditorView.baseTheme({
  /**
   * Outer frame.
   */
  '&': {},
  '&.cm-focused': {
    outline: 'none',
  },

  /**
   * Scroller
   */
  '.cm-scroller': {},
  '.cm-scroller::-webkit-scrollbar': {
    width: '8px',
  },
  '.cm-scroller::-webkit-scrollbar-track': {},
  '.cm-scroller::-webkit-scrollbar-thumb': {
    background: 'transparent',
    transition: 'background 0.15s',
  },
  '&:hover .cm-scroller::-webkit-scrollbar-thumb': {
    background: 'var(--color-scrollbar-thumb)',
  },

  /**
   * Content
   * NOTE: Apply margins to content so that scrollbar is at the edge of the container.
   */
  '.cm-content': {
    padding: 'unset',
    lineHeight: '24px',
    color: 'unset',
  },

  /**
   * Gutters
   * NOTE: Gutters should have the same top margin as the content.
   */
  '.cm-gutters': {
    background: 'transparent',
    borderRight: 'none',
  },
  '.cm-gutter': {},
  '.cm-gutter.cm-lineNumbers': {
    paddingRight: '4px',
    borderRight: '1px solid var(--color-subdued-separator)',
    color: 'var(--color-subdued)',
  },
  '.cm-gutter.cm-lineNumbers .cm-gutterElement': {
    minWidth: '40px',
  },
  /**
   * Height is set to match the corresponding line (which may have wrapped).
   */
  '.cm-gutterElement': {
    lineHeight: '24px',
    fontSize: '12px',
  },

  /**
   * Line.
   */
  '.cm-line': {
    lineHeight: '24px',
    paddingInline: 0,
  },
  '.cm-activeLine': {
    background: 'var(--color-cm-active-line)',
  },

  /**
   * Cursor (layer).
   */
  '.cm-cursor, .cm-dropCursor': {
    borderLeft: '2px solid var(--color-cm-cursor)',
  },
  '.cm-placeholder': {
    color: 'var(--color-placeholder)',
  },

  /**
   * Selection (layer).
   */
  '.cm-selectionBackground': {
    background: 'var(--color-cm-selection)',
  },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    background: 'var(--color-cm-focused-selection)',
  },

  /**
   * Search.
   * NOTE: Matches comment.
   */
  '.cm-searchMatch': {
    margin: '0 -3px',
    padding: '3px',
    borderRadius: '3px',
    background: 'var(--color-cm-highlight-surface)',
    color: 'var(--color-cm-highlight)',
  },
  '.cm-searchMatch-selected': {
    textDecoration: 'underline',
  },

  /**
   * Link.
   */
  '.cm-link': {
    textDecorationLine: 'underline',
    textDecorationThickness: '1px',
    textDecorationColor: 'var(--color-separator)',
    textUnderlineOffset: '2px',
    borderRadius: '.125rem',
  },
  '.cm-link > span': {
    color: 'var(--color-accent-text)',
  },
  '.cm-link > span:hover': {
    color: 'var(--color-accent-text-hover)',
  },

  /**
   * Tooltip.
   */
  '.cm-tooltip': {
    background: 'var(--color-modal-surface)',
  },
  '.cm-tooltip-below': {},
  '.cm-tooltip-hover': {
    // background: 'var(--color-red-500)',
    background: 'var(--color-modal-surface)',
    border: '1px solid var(--color-separator)',
    borderRadius: '4px',
    overflow: 'hidden',
  },

  /**
   * Autocomplete.
   * https://github.com/codemirror/autocomplete/blob/main/src/completion.ts
   */
  '.cm-tooltip.cm-tooltip-autocomplete': {
    marginTop: '6px',
    marginLeft: '-10px',
    border: '2px solid var(--color-separator)',
    borderRadius: '4px',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    maxHeight: '20em',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
    padding: '4px',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    background: 'var(--color-active-surface)',
    color: 'var(--dx-activeSurfaceText)',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > completion-section': {
    paddingLeft: '4px !important',
    color: 'var(--dx-hoverSurfaceText)',
  },

  /**
   * Completion info.
   */
  '.cm-completionInfo': {
    width: '360px !important',
    margin: '-10px 1px 0 1px',
    padding: '8px !important',
    borderColor: 'var(--color-separator)',
  },
  '.cm-completionIcon': {
    display: 'none',
  },
  '.cm-completionLabel': {
    color: 'var(--color-description)',
    padding: '0 4px',
  },
  '.cm-completionMatchedText': {
    color: 'var(--color-base-text)',
    textDecoration: 'none !important',
  },

  /**
   * Panels
   * https://github.com/codemirror/search/blob/main/src/search.ts#L745
   *
   * Find/replace panel.
   * <div class="cm-announced">...</div>
   * <div class="cm-scroller">...</div>
   * <div class="cm-panels cm-panels-bottom">
   *   <div class="cm-search cm-panel">
   *     <input class="cm-textfield" />
   *     <button class="cm-button">...</button>
   *     <label><input type="checkbox" />...</label>
   *   </div>
   * </div
   */
  // TODO(burdon): Implement custom panel (with icon buttons).
  '.cm-panels': {},
  '.cm-panel': {
    backgroundColor: 'var(--surface-bg)',
  },
  '.cm-panel input, .cm-panel button, .cm-panel label': {
    color: 'var(--color-subdued)',
    fontSize: '14px',
    all: 'unset',
    margin: '3px !important',
    padding: '2px 6px !important',
    outline: '1px solid transparent',
  },
  '.cm-panel input, .cm-panel button': {
    backgroundColor: 'var(--color-input-surface)',
  },
  '.cm-panel input:focus, .cm-panel button:focus': {
    outline: '1px solid var(--color-neutral-focus-indicator)',
  },
  '.cm-panel label': {
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  '.cm-panel input.cm-textfield': {},
  '.cm-panel input[type=checkbox]': {
    width: '8px',
    height: '8px',
    marginRight: '6px !important',
    padding: '2px !important',
    color: 'var(--color-neutral-focus-indicator)',
  },
  '.cm-panel button': {
    '&:hover': {
      // TODO(burdon): Replace with layer and @apply bg-accent-surface-hover
      backgroundColor: 'var(--color-accent-surface-hover) !important',
    },
    '&:active': {
      backgroundColor: 'var(--color-accent-surface-hover)',
    },
  },
  '.cm-panel.cm-search': {
    padding: '4px',
    borderTop: '1px solid var(--color-separator)',
  },
});

export const editorGutter: Extension = EditorView.theme({
  '.cm-gutters': {
    // NOTE: Non-transparent background required to cover content if scrolling horizontally.
    background: 'var(--color-base-surface) !important',
    paddingRight: '1rem',
  },
});

export type FontOptions = {
  monospace?: boolean;
};

export const createFontTheme = ({ monospace }: FontOptions = {}) =>
  EditorView.theme({
    // Set metrics on the scroller (this is often what CM uses for layout).
    '.cm-scroller': {
      fontFamily: monospace ? fontMono : fontBody,
      fontSize: '16px',
    },

    // Maintain defaults for UI components.
    '.cm-content, .cm-gutters, .cm-panel': {
      fontFamily: 'inherit',
      fontSize: 'inherit',
    },
  });
