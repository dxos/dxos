//
// Copyright 2023 DXOS.org
//

import { tags } from '@lezer/highlight';
import get from 'lodash.get';

import { tokens } from '../../styles';

export const chalky = '#e5c07b';
export const coral = '#e06c75';
export const cyan = '#56b6c2';
export const invalid = '#ffffff';
export const ivory = '#abb2bf';
export const stone = '#7d8799';
export const malibu = '#61afef';
export const sage = '#98c379';
export const whiskey = '#d19a66';
export const violet = '#c678dd';
const _darkBackground = '#21252b';
export const highlightBackground = '#2c313a';
const _background = '#282c34';
export const tooltipBackground = '#353a42';
const _selection = '#3E4451';
export const cursor = '#ffffff';

export const theme = {
  // '&': {
  //   color: ivory,
  //   backgroundColor: background
  // },
  '.cm-content': {
    caretColor: cursor
  },
  // '.cm-cursor, .cm-dropCursor': { borderLeftColor: cursor },
  // '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
  //   backgroundColor: selection
  // },
  // '.cm-panels': { backgroundColor: darkBackground, color: ivory },
  // '.cm-panels.cm-panels-top': { borderBottom: '2px solid black' },
  // '.cm-panels.cm-panels-bottom': { borderTop: '2px solid black' },
  // '.cm-searchMatch': {
  //   backgroundColor: '#72a1ff59',
  //   outline: '1px solid #457dff'
  // },
  // '.cm-searchMatch.cm-searchMatch-selected': {
  //   backgroundColor: '#6199ff2f'
  // },
  // '.cm-activeLine': { backgroundColor: '#6699ff0b' },
  // '.cm-selectionMatch': { backgroundColor: '#aafe661a' },
  // '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
  //   backgroundColor: '#bad0f847'
  // },
  // '.cm-gutters': {
  //   backgroundColor: background,
  //   color: stone,
  //   border: 'none'
  // },
  // '.cm-activeLineGutter': {
  //   backgroundColor: highlightBackground
  // },
  // '.cm-foldPlaceholder': {
  //   backgroundColor: 'transparent',
  //   border: 'none',
  //   color: '#ddd'
  // },
  '.cm-tooltip': {
    border: 'none',
    backgroundColor: tooltipBackground
  },
  '.cm-tooltip .cm-tooltip-arrow:before': {
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent'
  },
  '.cm-tooltip .cm-tooltip-arrow:after': {
    borderTopColor: tooltipBackground,
    borderBottomColor: tooltipBackground
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: highlightBackground,
      color: ivory
    }
  }
};

const monospace = get(tokens, 'fontFamily.mono', ['monospace']).join(',');

export const highlighting = [
  {
    tag: tags.keyword,
    color: violet
  },
  {
    tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName],
    color: coral
  },
  {
    tag: [tags.function(tags.variableName), tags.labelName],
    color: malibu
  },
  {
    tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)],
    color: whiskey
  },
  {
    tag: [tags.definition(tags.name), tags.separator],
    color: ivory
  },
  {
    tag: [
      tags.typeName,
      tags.className,
      tags.number,
      tags.changed,
      tags.annotation,
      tags.modifier,
      tags.self,
      tags.namespace
    ],
    color: chalky
  },
  {
    tag: [
      // tags.link,
      // tags.url,
      tags.operator,
      tags.operatorKeyword,
      tags.escape,
      tags.regexp,
      tags.special(tags.string)
    ],
    color: cyan
  },
  {
    tag: [
      // tags.meta,
      tags.comment
    ],
    color: stone
  },
  {
    tag: [tags.atom, tags.bool, tags.special(tags.variableName)],
    color: whiskey
  },
  {
    tag: [
      // tags.processingInstruction,
      tags.string,
      tags.inserted
    ],
    color: sage
  },
  {
    tag: tags.invalid,
    color: invalid
  }
];
