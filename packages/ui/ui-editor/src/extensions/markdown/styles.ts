//
// Copyright 2024 DXOS.org
//

import { EditorView } from '@codemirror/view';

import { fontBody, fontMono } from '../../styles';

export const bulletListIndentationWidth = 24;
export const orderedListIndentationWidth = 36; // TODO(burdon): Make variable length based on number of digits.

export const formattingStyles = EditorView.theme({
  /**
   * Horizontal rule.
   */
  '& .cm-hr': {
    display: 'inline-block',
    width: '100%',
    height: '0',
    verticalAlign: 'middle',
    borderTop: '1px solid var(--color-cm-separator)',
    opacity: 0.5,
  },

  /**
   * Lists.
   */
  '& .cm-list-item': {},
  '& .cm-list-mark': {
    display: 'inline',
    textAlign: 'right',
    paddingRight: '0.5em',
    fontVariant: 'tabular-nums',
    // Anchor to the line top (not the baseline) so the inline-block marker — whose height already
    // equals the line-height — fills the line box exactly instead of extending it and making a
    // bulleted line taller than a plain one.
    verticalAlign: 'top',
    lineHeight: 'inherit',
  },
  '& .cm-list-mark-bullet': {
    width: `${bulletListIndentationWidth}px`,
    // The rendered bullet widget sits inside the `ListMark` font-mono highlight span; a direct
    // font-family on the widget overrides that inherited monospace so the bullet uses the body font.
    fontFamily: fontBody,
  },
  '& .cm-list-mark-ordered': {
    width: `${orderedListIndentationWidth}px`,
  },

  /**
   * Blockquote.
   */
  '& .cm-blockquote': {
    background: 'var(--color-cm-codeblock)',
    borderLeft: '2px solid var(--color-cm-separator)',
    paddingLeft: '1rem',
    margin: 0,
  },

  /**
   * Code and codeblocks.
   */
  '& code': {
    fontFamily: fontMono,
    color: 'var(--color-cm-code)',
    whiteSpace: 'nowrap',
  },
  '& .cm-code': {
    fontFamily: fontMono,
    color: 'var(--color-cm-code)',
  },
  // Inline code spans (triggered by backticks) use `cm-code-inline` + `font-mono`.
  // Different monospace font metrics can slightly overflow the fixed CodeMirror line box,
  // so constrain them to the target 24px height.
  '& .cm-code-inline': {
    fontFamily: fontMono,
    height: '24px',
    // display: 'inline-flex',
    alignItems: 'center',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    color: 'var(--color-cm-code-inline)',
  },
  '& .cm-code-mark': {
    fontFamily: fontMono,
    height: '24px',
    display: 'inline-flex',
    alignItems: 'center',
    overflow: 'hidden',
  },
  '& .cm-codeblock-line': {
    background: 'var(--color-cm-codeblock)',
    paddingLeft: '1rem !important',
    paddingRight: '1.5rem !important',
  },
  '& .cm-codeblock-start': {
    borderTopLeftRadius: '.25rem',
    borderTopRightRadius: '.25rem',
  },
  '& .cm-codeblock-end': {
    borderBottomLeftRadius: '.25rem',
    borderBottomRightRadius: '.25rem',
  },

  /**
   * Task list.
   */
  '& .cm-task': {
    display: 'inline-flex',
    width: `${bulletListIndentationWidth}px`,
    height: '20px',
  },
  '& .cm-task-checkbox': {
    display: 'grid',
    margin: '0',
    transform: 'translateY(2px)',
  },

  /**
   * Table.
   */
  '.cm-table': {
    borderCollapse: 'separate',
    borderSpacing: '2px',
  },
  '.cm-table *': {
    lineHeight: 1.5,
  },
  '.cm-table-editor *': {
    fontFamily: fontMono,
  },
  '.cm-table-head': {
    padding: '4px 8px',
    paddingRight: '24px',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    wordBreak: 'keep-all',
    textAlign: 'left',
    textDecoration: 'none !important',
    fontSize: 'small',
    textTransform: 'uppercase',
    color: 'var(--color-description)',
    backgroundColor: 'var(--color-input-surface)',
    // borderBottom: '1px solid var(--color-cm-separator)',
  },
  '.cm-table-cell': {
    padding: '4px 8px',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    wordBreak: 'keep-all',
    verticalAlign: 'top',
    backgroundColor: 'var(--color-base-surface)',
    fontVariantNumeric: 'tabular-nums',
  },

  /**
   * Image.
   */
  '.cm-image': {
    display: 'block',
    height: '0',
  },
  '.cm-image.cm-loaded-image': {
    height: 'auto',
    borderTop: '0.5rem solid transparent',
    borderBottom: '0.5rem solid transparent',
  },
  '.cm-image-with-loader': {
    display: 'block',
    opacity: 0,
    transitionDuration: '350ms',
    transitionProperty: 'opacity',
  },
  '.cm-image-with-loader.cm-loaded-image': {
    opacity: 1,
  },
  '.cm-image-wrapper': {
    'grid-template-columns': '1fr',
    'display': 'grid',
    'margin': '0.5rem 0',
    'overflow': 'hidden',
    'transitionDuration': '350ms',
    'transitionProperty': 'height',
    '& > *': {
      'grid-row-start': 1,
      'grid-column-start': 1,
    },
  },
});
