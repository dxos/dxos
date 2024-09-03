//
// Copyright 2023 DXOS.org
//

import { type StyleSpec } from 'style-mod';

import { getToken } from './tokens';

export type ThemeStyles = Record<string, StyleSpec>;

// TODO(burdon): Factor out theme.
// TODO(burdon): Can we use @apply and import css file?
//  https://tailwindcss.com/docs/reusing-styles#extracting-classes-with-apply?

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
 * NOTE: Use one of '&', '&light', and '&dark' prefix to scope instance.
 * NOTE: `light` and `dark` selectors are preprocessed by CodeMirror and can only be in the base theme.
 */
export const defaultTheme: ThemeStyles = {
  '&': {},
  '&.cm-focused': {
    outline: 'none',
  },

  // Scroller.
  // NOTE: See https://codemirror.net/docs/guide (DOM Structure).
  '.cm-scroller': {
    overflowY: 'auto',
    fontFamily: getToken('fontFamily.body', []),
    lineHeight: 1.5,
  },

  // Content.
  '.cm-content': {
    padding: 'unset',
    // NOTE: Base font size (otherwise defined by HTML tag, which might be different for storybook).
    fontSize: '16px',
  },
  '&light .cm-content': {
    color: getToken('extend.semanticColors.base.fg.light', 'black'),
  },
  '&dark .cm-content': {
    color: getToken('extend.semanticColors.base.fg.dark', 'red'),
  },

  //
  // Cursor
  //
  '&light .cm-cursor, &light .cm-dropCursor': {
    borderLeft: '2px solid black',
  },
  '&dark .cm-cursor, &dark .cm-dropCursor': {
    borderLeft: '2px solid white',
  },
  '&light .cm-placeholder': {
    color: getToken('extend.semanticColors.description.light', 'rgba(0,0,0,.2)'),
  },
  '&dark .cm-placeholder': {
    color: getToken('extend.semanticColors.description.dark', 'rgba(255,255,255,.2)'),
  },

  //
  // line
  //
  '.cm-line': {
    paddingInline: 0,
  },
  '.cm-activeLine': {
    background: 'transparent',
  },

  //
  // gutter
  //
  '.cm-lineNumbers': {
    minWidth: '36px',
  },

  //
  // Selection
  //

  '&light .cm-selectionBackground': {
    background: getToken('extend.colors.primary.100'),
  },
  '&light.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    background: getToken('extend.colors.primary.200'),
  },
  '&dark .cm-selectionBackground': {
    background: getToken('extend.colors.primary.700'),
  },
  '&dark.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    background: getToken('extend.colors.primary.600'),
  },

  //
  // Search
  //

  '&light .cm-searchMatch': {
    backgroundColor: getToken('extend.colors.yellow.100'),
  },
  '&dark .cm-searchMatch': {
    backgroundColor: getToken('extend.colors.yellow.700'),
  },

  //
  // link
  //
  '.cm-link': {
    textDecorationLine: 'underline',
    textDecorationThickness: '1px',
    textUnderlineOffset: '2px',
    borderRadius: '.125rem',
    fontFamily: getToken('fontFamily.body', []),
  },
  '&light .cm-link > span': {
    color: getToken('extend.colors.primary.600'),
  },
  '&dark .cm-link > span': {
    color: getToken('extend.colors.primary.400'),
  },

  //
  // tooltip
  //
  '.cm-tooltip': {},
  '&light .cm-tooltip': {
    background: `${getToken('extend.colors.neutral.100')} !important`,
  },
  '&dark .cm-tooltip': {
    background: `${getToken('extend.colors.neutral.900')} !important`,
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
    color: getToken('extend.colors.primary.500'),
  },
  '.cm-tooltip.cm-completionInfo': {
    border: getToken('extend.colors.neutral.500'),
    width: '360px !important',
    margin: '-10px 1px 0 1px',
    padding: '8px !important',
  },
  '.cm-completionIcon': {
    display: 'none',
  },
  '.cm-completionLabel': {
    fontFamily: getToken('fontFamily.body', []),
  },
  '.cm-completionMatchedText': {
    textDecoration: 'none !important',
    opacity: 0.5,
  },

  //
  // table
  //
  '.cm-table *': {
    fontFamily: `${getToken('fontFamily.mono', [])} !important`,
    textDecoration: 'none !important',
  },
  '.cm-table-head': {
    padding: '2px 16px 2px 0px',
    textAlign: 'left',
    borderBottom: `1px solid ${getToken('extend.colors.primary.500')}`,
    color: getToken('extend.colors.neutral.500'),
  },
  '.cm-table-cell': {
    padding: '2px 16px 2px 0px',
  },

  //
  // image
  //
  '.cm-image': {
    display: 'block',
    height: '0',
  },
  '.cm-image.cm-loaded-image': {
    height: 'auto',
    borderTop: '0.5rem solid transparent',
    borderBottom: '0.5rem solid transparent',
  },

  // TODO(burdon): Override vars --cm-background.
  //  https://www.npmjs.com/package/codemirror-theme-vars

  /**
   * Gutters
   */
  '.cm-gutters': {
    background: 'transparent',
  },

  /**
   * Panels
   * TODO(burdon): Needs styling attention (esp. dark mode).
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
    fontFamily: getToken('fontFamily.body', []),
  },
  '.cm-panel input[type=checkbox]': {
    marginRight: '0.4rem !important',
  },
  '&light .cm-panel': {
    background: getToken('extend.colors.neutral.50'),
  },
  '&dark .cm-panel': {
    background: getToken('extend.colors.neutral.850'),
  },
  '.cm-button': {
    margin: '4px',
    fontFamily: getToken('fontFamily.body', []),
    backgroundImage: 'none',
    border: 'none',
    '&:active': {
      backgroundImage: 'none',
    },
  },
  '&light .cm-button': {
    background: getToken('extend.colors.neutral.100'),
    '&:hover': {
      background: getToken('extend.colors.neutral.200'),
    },
    '&:active': {
      background: getToken('extend.colors.neutral.300'),
    },
  },
  '&dark .cm-button': {
    background: getToken('extend.colors.neutral.800'),
    '&:hover': {
      background: getToken('extend.colors.neutral.700'),
    },
    '&:active': {
      background: getToken('extend.colors.neutral.600'),
    },
  },
};
