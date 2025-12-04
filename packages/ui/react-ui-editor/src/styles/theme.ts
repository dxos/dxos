//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { fontBody, fontMono } from './tokens';

export type ThemeOptions = {
  monospace?: boolean;
};

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
export const createBaseTheme = ({ monospace }: ThemeOptions = {}) =>
  EditorView.baseTheme({
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
      lineHeight: '24px',
      fontFamily: monospace ? fontMono : fontBody,
      // NOTE: Base font size (otherwise defined by HTML tag, which might be different for storybook).
      fontSize: '16px',
      color: 'unset',
    },

    /**
     * Gutters
     * NOTE: Gutters should have the same top margin as the content.
     */
    '.cm-gutters': {
      borderRight: 'none',
    },
    '.cm-gutter': {},
    '.cm-gutter.cm-lineNumbers': {
      paddingRight: '4px',
      borderRight: '1px solid var(--dx-subduedSeparator)',
      color: 'var(--dx-subduedText)',
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
      background: 'var(--dx-cmActiveLine)',
    },

    /**
     * Cursor (layer).
     */
    '.cm-cursor, .cm-dropCursor': {
      borderLeft: '2px solid var(--dx-cmCursor)',
    },
    '.cm-placeholder': {
      fontFamily: fontBody,
      color: 'var(--dx-placeholder)',
    },

    /**
     * Selection (layer).
     */
    '.cm-selectionBackground': {
      background: 'var(--dx-cmSelection)',
    },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
      background: 'var(--dx-cmFocusedSelection)',
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
      textDecorationColor: 'var(--dx-separator)',
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
      background: 'var(--dx-baseSurface)',
    },
    '.cm-tooltip-below': {},

    /**
     * Autocomplete.
     * https://github.com/codemirror/autocomplete/blob/main/src/completion.ts
     */
    '.cm-tooltip.cm-tooltip-autocomplete': {
      marginTop: '6px',
      marginLeft: '-10px',
      border: '2px solid var(--dx-separator)',
      borderRadius: '4px',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul': {
      maxHeight: '20em',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
      padding: '4px',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      background: 'var(--dx-activeSurface)',
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
      borderColor: 'var(--dx-separator)',
    },
    '.cm-completionIcon': {
      display: 'none',
    },
    '.cm-completionLabel': {
      fontFamily: fontBody,
      color: 'var(--dx-description)',
      padding: '0 4px',
    },
    '.cm-completionMatchedText': {
      textDecoration: 'none !important',
      color: 'var(--dx-baseText)',
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
      fontFamily: fontBody,
      backgroundColor: 'var(--surface-bg)',
    },
    '.cm-panel input, .cm-panel button, .cm-panel label': {
      color: 'var(--dx-subdued)',
      fontFamily: fontBody,
      fontSize: '14px',
      all: 'unset',
      margin: '3px !important',
      padding: '2px 6px !important',
      outline: '1px solid transparent',
    },
    '.cm-panel input, .cm-panel button': {
      backgroundColor: 'var(--dx-inputSurface)',
    },
    '.cm-panel input:focus, .cm-panel button:focus': {
      outline: '1px solid var(--dx-neutralFocusIndicator)',
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
      color: 'var(--dx-neutralFocusIndicator)',
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
  });

export const editorGutter: Extension = EditorView.theme({
  '.cm-gutters': {
    // NOTE: Color required to cover content if scrolling horizontally.
    // TODO(burdon): Non-transparent background clips the focus ring.
    background: 'var(--dx-baseSurface) !important',
    paddingRight: '1rem',
  },
});
