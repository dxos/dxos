//
// Copyright 2024 DXOS.org
//

import { EditorView } from '@codemirror/view';

import { fontMono } from '../../styles';

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
    borderTop: '1px solid var(--dx-cmSeparator)',
    opacity: 0.5,
  },

  /**
   * Lists.
   */
  '& .cm-list-item': {},
  '& .cm-list-mark': {
    display: 'inline-block',
    textAlign: 'right',
    paddingRight: '0.5em',
    fontVariant: 'tabular-nums',
  },
  '& .cm-list-mark-bullet': {
    width: `${bulletListIndentationWidth}px`,
  },
  '& .cm-list-mark-ordered': {
    width: `${orderedListIndentationWidth}px`,
  },

  /**
   * Blockquote.
   */
  '& .cm-blockquote': {
    background: 'var(--dx-cmCodeblock)',
    borderLeft: '2px solid var(--dx-cmSeparator)',
    paddingLeft: '1rem',
    margin: '0',
  },

  /**
   * Code and codeblocks.
   */
  '& .cm-code': {
    fontFamily: fontMono,
  },
  '& .cm-codeblock-line': {
    background: 'var(--dx-cmCodeblock)',
    paddingInline: '1rem !important',
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
  '.cm-table *': {
    fontFamily: fontMono,
    textDecoration: 'none !important',
  },
  '.cm-table-head': {
    padding: '2px 16px 2px 0px',
    textAlign: 'left',
    borderBottom: '1px solid var(--dx-cmSeparator)',
    color: 'var(--dx-subdued)',
  },
  '.cm-table-cell': {
    padding: '2px 16px 2px 0px',
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
    opacity: '0',
    transitionDuration: '350ms',
    transitionProperty: 'opacity',
  },
  '.cm-image-with-loader.cm-loaded-image': {
    opacity: '1',
  },
  '.cm-image-wrapper': {
    'grid-template-columns': '1fr',
    display: 'grid',
    margin: '0.5rem 0',
    overflow: 'hidden',
    transitionDuration: '350ms',
    transitionProperty: 'height',
    '& > *': {
      'grid-row-start': 1,
      'grid-column-start': 1,
    },
  },
});
