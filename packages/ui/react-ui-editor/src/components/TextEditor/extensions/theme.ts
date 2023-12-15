//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';
import { type StyleSpec } from 'style-mod';

import { tokens } from '../../../styles';

/**
 * Minimal styles.
 * https://codemirror.net/examples/styling
 * NOTE: Use one of '&', '&light', and '&dark' prefix to scope instance.
 * NOTE: `light` and `dark` selectors are preprocessed by CodeMirror and can only be in the base theme.
 */
export const baseTheme: {
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
  },

  //
  // Cursor
  //
  '&light .cm-content': {
    caretColor: 'black',
  },
  '&dark .cm-content': {
    caretColor: 'white',
  },
  '&light .cm-cursor': {
    borderLeft: '2px solid black',
  },
  '&dark .cm-cursor': {
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
    lineHeight: 1.6,
    minBlockSize: '1.6em',
  },
  '& .cm-line *': {
    lineHeight: 1.6,
  },
  '& .cm-activeLine': {
    backgroundColor: 'transparent',
  },

  //
  // selection
  // TODO(burdon): Review.
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

  '&light .cm-ySelection, &light .cm-yLineSelection': {
    mixBlendMode: 'multiply',
  },
  '&dark .cm-ySelection, &dark .cm-yLineSelection': {
    mixBlendMode: 'screen',
  },

  '& .cm-ySelectionInfo': {
    // fontFamily: get(tokens, 'fontFamily.body', []).join(','),
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
    margin: '0',
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
  },

  //
  // tooltip
  //
  '& .cm-tooltip': {
    backgroundColor: 'white', // TODO(burdon): Input surface.
    border: 'none',
  },
  // '& .cm-tooltip-below': {},
  // '& .cm-tooltip-autocomplete': {},

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
};

export const textTheme: {
  [selector: string]: StyleSpec;
} = {
  '& .cm-scroller': {
    fontFamily: get(tokens, 'fontFamily.body', []).join(','),
  },
};

export const codeTheme: {
  [selector: string]: StyleSpec;
} = {
  '& .cm-scroller': {
    fontFamily: get(tokens, 'fontFamily.mono', []).join(','),
  },
};
