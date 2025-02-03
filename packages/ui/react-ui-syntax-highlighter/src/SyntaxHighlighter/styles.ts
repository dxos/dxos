//
// Copyright 2024 DXOS.org
//

import { type CSSProperties } from 'react';

// https://highlightjs.org/examples
// https://react-syntax-highlighter.github.io/react-syntax-highlighter/demo
// https://github.com/react-syntax-highlighter/react-syntax-highlighter/blob/master/AVAILABLE_STYLES_HLJS.MD

/**
 * https://github.com/findrakecil/hljs-alabaster-dark/blob/master/readme.md
 */
export const alabasterDark: Record<string, CSSProperties> = {
  hljs: {
    display: 'block',
    overflowX: 'auto',
    color: '#CECECE',
    padding: '0.5em',
  },
  'hljs-comment': {
    color: '#DFDF8E',
  },
  'hljs-string': {
    color: '#95CB82',
  },
  'hljs-meta-string': {
    color: '#95CB82',
  },
  'hljs-regexp': {
    color: '#95CB82',
  },
  'hljs-number': {
    color: '#CC8BC9',
  },
  'hljs-literal': {
    color: '#CC8BC9',
  },
  'hljs-title': {
    color: '#71ADE7',
  },
  'hljs-deletion': {
    backgroundColor: '#ffdddd',
    color: '#434343',
  },
  'hljs-addition': {
    backgroundColor: '#ddffdd',
    color: '#434343',
  },
};

/**
 * https://github.com/highlightjs/highlight.js/blob/main/src/styles/github.css
 */
export const githubLight: Record<string, CSSProperties> = {
  hljs: {
    display: 'block',
    overflowX: 'auto',
    color: '#545454',
    padding: '0.5em',
  },
  'hljs-comment': {
    color: '#696969',
  },
  'hljs-quote': {
    color: '#696969',
  },
  'hljs-variable': {
    color: '#d91e18',
  },
  'hljs-template-variable': {
    color: '#d91e18',
  },
  'hljs-tag': {
    color: '#d91e18',
  },
  'hljs-name': {
    color: '#d91e18',
  },
  'hljs-selector-id': {
    color: '#d91e18',
  },
  'hljs-selector-class': {
    color: '#d91e18',
  },
  'hljs-regexp': {
    color: '#d91e18',
  },
  'hljs-deletion': {
    color: '#d91e18',
  },
  'hljs-number': {
    color: '#aa5d00',
  },
  'hljs-built_in': {
    color: '#aa5d00',
  },
  'hljs-builtin-name': {
    color: '#aa5d00',
  },
  'hljs-literal': {
    color: '#aa5d00',
  },
  'hljs-type': {
    color: '#aa5d00',
  },
  'hljs-params': {
    color: '#aa5d00',
  },
  'hljs-meta': {
    color: '#aa5d00',
  },
  'hljs-link': {
    color: '#aa5d00',
  },
  'hljs-attribute': {
    color: '#aa5d00',
  },
  'hljs-string': {
    color: '#008000',
  },
  'hljs-symbol': {
    color: '#008000',
  },
  'hljs-bullet': {
    color: '#008000',
  },
  'hljs-addition': {
    color: '#008000',
  },
  'hljs-title': {
    color: '#007faa',
  },
  'hljs-section': {
    color: '#007faa',
  },
  'hljs-keyword': {
    color: '#7928a1',
  },
  'hljs-selector-tag': {
    color: '#7928a1',
  },
  'hljs-emphasis': {
    fontStyle: 'italic',
  },
  'hljs-strong': {
    fontWeight: 'bold',
  },
};
