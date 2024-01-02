//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';
import { type StyleSpec } from 'style-mod';

import { tokens } from '../../../styles';

/**
 * Minimal styles.
 * https://codemirror.net/examples/styling
 *
 * Examples:
 * - https://github.com/codemirror/view/blob/main/src/theme.ts
 * - https://github.com/codemirror/theme-one-dark/blob/main/src/one-dark.ts
 *
 * NOTE: Use one of '&', '&light', and '&dark' prefix to scope instance.
 * NOTE: `light` and `dark` selectors are preprocessed by CodeMirror and can only be in the base theme.
 */
export const defaultTheme: {
  [selector: string]: StyleSpec;
} = {
  //
  // Main layout:
  // <div class=".cm-editor .cm-focused">
  //   <div class=".cm-scroller">
  //     <div class=".cm-content" role="textbox" contenteditable="true">
  //       <div class=".cm-line" />
  //     </div>
  //   </div>
  // </div>
  //
  '&': {},
  '&.cm-focused': {
    outline: 'none',
  },
  '& .cm-scroller': {
    overflow: 'visible',
  },
  '& .cm-content': {
    padding: 0,
    // Base font size (otherwise defined by HTML tag, which might be different for storybook).
    fontSize: '16px',
  },
  '&light .cm-content': {
    color: get(tokens, 'extend.colors.neutral.900', 'black'),
    caretColor: 'black',
  },
  '&dark .cm-content': {
    color: get(tokens, 'extend.colors.neutral.100', 'white'),
    caretColor: 'white',
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
  '& .cm-placeholder': {
    fontWeight: 100,
  },

  //
  // line
  //
  '& .cm-line': {
    paddingInline: 0,
  },
  '& .cm-line *': {},
  '& .cm-activeLine': {
    backgroundColor: 'transparent',
  },

  //
  // selection
  //

  '&light .cm-selectionBackground, &light.cm-focused .cm-selectionBackground': {
    background: get(tokens, 'extend.colors.primary.150', '#00ffff'),
  },
  '&dark .cm-selectionBackground, &dark.cm-focused .cm-selectionBackground': {
    background: get(tokens, 'extend.colors.primary.850', '#00ffff'),
  },
  '&light .cm-selectionMatch': {
    background: get(tokens, 'extend.colors.primary.250', '#00ffff') + '44',
  },
  '&dark .cm-selectionMatch': {
    background: get(tokens, 'extend.colors.primary.600', '#00ffff') + '44',
  },

  //
  // collaboration
  // TODO(burdon): Review classnames (YJS dependent?)
  //

  '&light .cm-ySelection, &light .cm-yLineSelection': {
    mixBlendMode: 'multiply',
  },
  '&dark .cm-ySelection, &dark .cm-yLineSelection': {
    mixBlendMode: 'screen',
  },

  '& .cm-ySelectionInfo': {
    padding: '2px 4px',
    marginBlockStart: '-4px',
  },
  '& .cm-ySelection, & .cm-selectionMatch': {
    paddingBlockStart: '.15em',
    paddingBlockEnd: '.15em',
  },
  '& .cm-ySelectionCaret': {
    display: 'inline-block',
    insetBlockStart: '.1em',
    blockSize: '1.4em',
    verticalAlign: 'top',
  },
  '& .cm-yLineSelection': {
    margin: 0,
  },

  //
  // link
  //
  '& .cm-link': {
    color: get(tokens, 'extend.colors.primary.500'),
    textDecorationLine: 'underline',
    textDecorationThickness: '1px',
    textUnderlineOffset: '2px',
    borderRadius: '.125rem',
    fontFamily: get(tokens, 'fontFamily.body', []).join(','),
  },

  //
  // tooltip
  //
  '& .cm-tooltip': {
    border: 'none',
  },
  '& .cm-tooltip-below': {},

  //
  // autocomplete
  //
  '& .cm-tooltip-autocomplete': {
    marginTop: '4px',
    marginLeft: '-3px',
  },
  '& .cm-tooltip-autocomplete ul li': {},
  '& .cm-tooltip-autocomplete ul li[aria-selected]': {},
  '& .cm-completionIcon': {
    display: 'none',
  },
  '& .cm-completionLabel': {
    fontFamily: get(tokens, 'fontFamily.body', []).join(','),
  },
  '& .cm-completionMatchedText': {
    textDecoration: 'none',
  },

  //
  // widgets
  //
  '& .cm-widgetBuffer': {
    display: 'none',
    height: 0,
  },

  //
  // table
  //
  '& .cm-table *': {
    fontFamily: `${get(tokens, 'fontFamily.mono', []).join(',')} !important`,
    textDecoration: 'none !important',
  },
  '& .cm-table-head': {
    padding: '2px 16px 2px 0px',
    borderBottom: `1px solid ${get(tokens, 'extend.colors.neutral.500')}`,
    fontWeight: 100,
    textAlign: 'left',
    color: get(tokens, 'extend.colors.neutral.500'),
  },
  '& .cm-table-cell': {
    padding: '2px 16px 2px 0px',
  },

  //
  // image
  //
  '& .cm-image': {
    margin: '0.5rem 0',
  },

  //
  // font size
  // TODO(thure): This appears to be the best or only way to set selection caret heights, but it's far more verbose than it needs to be.
  //
  ...Object.keys(get(tokens, 'extend.fontSize', {})).reduce((acc: Record<string, any>, fontSize) => {
    const height = get(tokens, ['extend', 'fontSize', fontSize, 1, 'lineHeight']);

    acc[`& .text-${fontSize} + .cm-ySelectionCaret`] = { height };
    acc[`& .text-${fontSize} + .cm-ySelection + .cm-ySelectionCaret`] = { height };
    acc[`& .text-${fontSize} + .cm-widgetBuffer + .cm-ySelectionCaret`] = { height };
    return acc;
  }, {}),

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
  '& .cm-panels': {
    border: `1px solid ${get(tokens, 'extend.colors.neutral.200')}`,
    borderBottom: 'none',
  },
  '& .cm-panel': {
    background: get(tokens, 'extend.colors.neutral.50'),
    fontFamily: get(tokens, 'fontFamily.body', []).join(','),
  },
  '& .cm-button': {
    margin: '4px',
    fontFamily: get(tokens, 'fontFamily.body', []).join(','),
    background: get(tokens, 'extend.colors.neutral.100'),
    border: 'none',
  },

  '& .cm-searchMatch': {
    backgroundColor: get(tokens, 'extend.colors.yellow.100'),
  },
  '& .cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: get(tokens, 'extend.colors.primary.100'),
  },
};

export const textTheme: {
  [selector: string]: StyleSpec;
} = {
  '& .cm-scroller': {
    fontFamily: get(tokens, 'fontFamily.body', []).join(','),
  },
  '& .cm-placeholder': {
    fontFamily: get(tokens, 'fontFamily.body', []).join(','),
  },
};

export const markdownTheme: {
  [selector: string]: StyleSpec;
} = {
  // NOTE: Must leave base font family as is (i.e., monospace) due to fenced code blocks.
  '& .cm-placeholder': {
    fontFamily: get(tokens, 'fontFamily.body', []).join(','),
  },
};

export const codeTheme: {
  [selector: string]: StyleSpec;
} = {
  '& .cm-scroller': {
    fontFamily: get(tokens, 'fontFamily.mono', []).join(','),
  },
  '& .cm-placeholder': {
    fontFamily: get(tokens, 'fontFamily.mono', []).join(','),
  },
};
