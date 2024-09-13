//
// Copyright 2023 DXOS.org
//

import { type StyleSpec } from 'style-mod';

import { getToken } from './tokens';

export type ThemeStyles = Record<string, StyleSpec>;

// TODO(burdon): Replace getToken with unset?
// TODO(burdon): Able to remove !important if only one base theme?
// TODO(burdon): Override CM vars https://www.npmjs.com/package/codemirror-theme-vars

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
    background: 'unset',
  },
  '.cm-gutter': {},
  '.cm-gutterElement': {
    fontSize: '16px',
    lineHeight: 1.5,
  },

  //
  // line
  //
  '.cm-line': {
    paddingInline: 0,
  },
  '.cm-activeLine': {
    background: 'var(--dx-hoverSurface)',
  },

  //
  // gutter
  //
  '.cm-lineNumbers': {
    minWidth: '36px',
  },

  //
  // Cursor
  //
  '.cm-cursor, .cm-dropCursor': {
    borderLeft: '2px solid var(--dx-cmCursor)',
  },
  '.cm-placeholder': {
    color: 'var(--dx-subdued)',
  },

  //
  // Selection
  //

  '.cm-selectionBackground': {
    background: 'var(--dx-cmSelection)',
  },
  // '.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
  //   background: 'var(--dx-cmSelection)',
  // },

  //
  // Search
  //

  '.cm-searchMatch': {
    background: 'var(--dx-cmSearch)',
  },

  //
  // link
  //
  '.cm-link': {
    textDecorationLine: 'underline',
    textDecorationThickness: '1px',
    textUnderlineOffset: '2px',
    borderRadius: '.125rem',
  },
  '.cm-link > span': {
    color: 'var(--dx-accentText)',
  },

  //
  // tooltip
  //
  '.cm-tooltip': {
    background: 'var(--dx-base)',
  },
  '.cm-tooltip-below': {},

  //
  // autocomplete
  // https://github.com/codemirror/autocomplete/blob/main/src/completion.ts
  //
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
    fontFamily: getToken('fontFamily.body'),
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
  '.cm-panels': {},
  '.cm-panel': {
    fontFamily: getToken('fontFamily.body'),
    background: 'var(--dx-input)',
  },
  // TODO(burdon): Use same styles as react-ui.
  '.cm-panel input': {
    border: 'none',
  },
  '.cm-panel input[type=checkbox]': {
    color: 'var(--dx-accentFocusIndicator)',
    marginRight: '0.4rem !important',
  },
  '.cm-button': {
    margin: '4px',
    fontFamily: getToken('fontFamily.body'),
    backgroundImage: 'none',
    background: 'var(--dx-input)',
    border: 'none',
    '&:active': {
      backgroundImage: 'none',
      background: 'var(--dx-accentSurfaceHover)',
    },
    '&:hover': {
      background: 'var(--dx-accentSurfaceHover)',
    },
  },
};
