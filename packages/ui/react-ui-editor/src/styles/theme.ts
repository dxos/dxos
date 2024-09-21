//
// Copyright 2023 DXOS.org
//

import { type StyleSpec } from 'style-mod';

import { fontBody } from './tokens';

export type ThemeStyles = Record<string, StyleSpec>;

/**
 * Minimal styles.
 * https://codemirror.net/examples/styling
 *
 * Examples:
 * - https://github.com/codemirror/view/blob/main/src/theme.ts
 * - https://github.com/codemirror/theme-one-dark/blob/main/src/one-dark.ts
 *
 * Main layout:
 * https://codemirror.net/examples/styling
 * https://codemirror.net/docs/guide (DOM Structure).
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
 *
 * NOTE: `light` and `dark` selectors are preprocessed by CodeMirror and can only be in the base theme.
 * NOTE: Use 'unset' to remove default CM style.
 */
export const defaultTheme: ThemeStyles = {
  '&': {},
  '&.cm-focused': {
    outline: 'none',
  },

  /**
   * Scroller
   */
  '.cm-scroller': {
    overflowY: 'auto',
  },

  /**
   * Content
   * NOTE: Apply margins to content so that scrollbar is at the edge of the container.
   */
  '.cm-content': {
    padding: 'unset',
    fontFamily: fontBody,
    // NOTE: Base font size (otherwise defined by HTML tag, which might be different for storybook).
    fontSize: '16px',
    lineHeight: 1.5,
    color: 'unset',
  },

  /**
   * Gutters
   * NOTE: Gutters should have the same top margin as the content.
   */
  '.cm-gutters': {
    background: 'var(--surface-bg)',
  },
  '.cm-gutter': {},
  /**
   * Height is set to match the corresponding line.
   */
  '.cm-gutterElement': {
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
    lineHeight: 1.5,
  },

  '.cm-lineNumbers': {
    minWidth: '36px',
  },

  /**
   * Line.
   */
  '.cm-line': {
    paddingInline: 0,
  },
  '.cm-activeLine': {
    background: 'var(--dx-hoverSurface)',
  },

  /**
   * Cursor (layer).
   */
  '.cm-cursor, .cm-dropCursor': {
    borderLeft: '2px solid var(--dx-cmCursor)',
  },
  '.cm-placeholder': {
    color: 'var(--dx-subdued)',
  },

  /**
   * Selection (layer).
   */
  '.cm-selectionBackground': {
    background: 'var(--dx-cmSelection)',
  },

  /**
   * Search.
   * NOTE: Matches comment.
   */
  '.cm-searchMatch': {
    margin: '0 -3px',
    padding: '3px',
    borderRadius: '3px',
    background: 'var(--dx-cmHighlightSurface)',
    color: 'var(--dx-cmHighlight)',
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
    textUnderlineOffset: '2px',
    borderRadius: '.125rem',
  },
  '.cm-link > span': {
    color: 'var(--dx-accentText)',
  },

  /**
   * Tooltip.
   */
  '.cm-tooltip': {
    background: 'var(--dx-base)',
  },
  '.cm-tooltip-below': {},

  /**
   * Autocomplete.
   * https://github.com/codemirror/autocomplete/blob/main/src/completion.ts
   */
  '.cm-tooltip.cm-tooltip-autocomplete': {
    marginTop: '4px',
    marginLeft: '-3px',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    maxHeight: '20em !important',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {},
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {},
  '.cm-tooltip.cm-tooltip-autocomplete > ul > completion-section': {
    paddingLeft: '4px !important',
    borderBottom: 'none !important',
    color: 'var(--dx-accentText)',
  },
  '.cm-tooltip.cm-completionInfo': {
    width: '360px !important',
    margin: '-10px 1px 0 1px',
    padding: '8px !important',
    borderColor: 'var(--dx-separator)',
  },
  '.cm-completionIcon': {
    display: 'none',
  },
  '.cm-completionLabel': {
    fontFamily: fontBody,
  },
  '.cm-completionMatchedText': {
    textDecoration: 'none !important',
    opacity: 0.5,
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
  // TODO(burdon): Apply react-ui-theme or replace panel.
  '.cm-panels': {},
  '.cm-panel': {
    fontFamily: fontBody,
    backgroundColor: 'var(--dx-base)',
  },
  '.cm-panel input, .cm-panel button, .cm-panel label': {
    fontFamily: fontBody,
    fontSize: '14px',
    all: 'unset',
    margin: '3px !important',
    padding: '2px 6px !important',
    outline: '1px solid transparent',
  },
  '.cm-panel input, .cm-panel button': {
    backgroundColor: 'var(--dx-input)',
  },
  '.cm-panel input:focus, .cm-panel button:focus': {
    outline: '1px solid var(--dx-accentFocusIndicator)',
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
    color: 'var(--dx-accentFocusIndicator)',
  },
  '.cm-panel button': {
    '&:hover': {
      backgroundColor: 'var(--dx-accentSurfaceHover) !important',
    },
    '&:active': {
      backgroundColor: 'var(--dx-accentSurfaceHover)',
    },
  },
  '.cm-panel.cm-search': {
    padding: '4px',
    borderTop: '1px solid var(--dx-separator)',
  },
};
