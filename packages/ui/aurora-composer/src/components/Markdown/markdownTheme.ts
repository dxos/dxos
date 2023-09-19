//
// Copyright 2023 DXOS.org
//

import { markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import get from 'lodash.get';

import { markdownTags } from './markdownTags';
import { bold, heading, italic, mark, strikethrough, tokens } from '../../styles';

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

const monospace = get(tokens, 'fontFamily.mono', ['monospace']).join(',');

export const markdownTheme = {
  // TODO(thure): consider whether these commented-out rules from one-dark-theme should be integrated.
  // '&': {
  //   color: ivory,
  //   backgroundColor: background
  // },
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
    backgroundColor: tooltipBackground,
  },
  '.cm-tooltip .cm-tooltip-arrow:before': {
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  '.cm-tooltip .cm-tooltip-arrow:after': {
    borderTopColor: tooltipBackground,
    borderBottomColor: tooltipBackground,
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: highlightBackground,
      color: ivory,
    },
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '& .cm-line': {
    paddingInline: 0,
  },
  '& .cm-line *': {
    lineHeight: 1.6,
  },
  '& .cm-selectionBackground': {
    background: get(tokens, 'extend.colors.primary.150', '#00ffff') + 'aa',
  },
  '.dark & .cm-selectionBackground': {
    background: get(tokens, 'extend.colors.primary.500', '#00ffff') + 'aa',
  },
  '& .cm-selectionMatch': {
    background: get(tokens, 'extend.colors.primary.100', '#00ffff') + '44',
  },
  '.dark & .cm-selectionMatch': {
    background: get(tokens, 'extend.colors.primary.400', '#00ffff') + '44',
  },
  '& .cm-content': {
    caretColor: 'black',
  },
  '.dark & .cm-content': {
    caretColor: cursor,
  },
  '& .cm-cursor': {
    borderLeftColor: 'black',
  },
  '.dark & .cm-cursor': {
    borderLeftColor: cursor,
  },
  '.cm-placeholder': {
    fontFamily: get(tokens, 'fontFamily.body', []).join(','),
  },
  '& .cm-scroller': {
    fontFamily: get(tokens, 'fontFamily.mono', []).join(','),
  },
  '& .cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.dark & .cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '& .cm-ySelectionInfo': {
    fontFamily: get(tokens, 'fontFamily.body', []).join(','),
    padding: '2px 4px',
    marginBlockStart: '-4px',
  },
  '& .cm-ySelection': {
    display: 'inline-block',
  },
  '& .cm-ySelectionCaret': {
    display: 'inline-block',
    verticalAlign: 'top',
  },
  ...Object.keys(get(tokens, 'extend.fontSize', {})).reduce((acc: Record<string, any>, fontSize) => {
    const height = get(tokens, ['extend', 'fontSize', fontSize, 1, 'lineHeight']);
    // TODO(thure): This appears to be the best or only way to set selection caret heights, but it's far more verbose than it needs to be.
    acc[`& .text-${fontSize} + .cm-ySelectionCaret`] = { height };
    acc[`& .text-${fontSize} + .cm-ySelection + .cm-ySelectionCaret`] = { height };
    acc[`& .text-${fontSize} + .cm-widgetBuffer + .cm-ySelectionCaret`] = { height };
    return acc;
  }, {}),
};

export const markdownDarkHighlighting = HighlightStyle.define(
  [
    {
      tag: [
        tags.keyword,
        tags.name,
        tags.deleted,
        tags.character,
        tags.propertyName,
        tags.macroName,
        tags.color,
        tags.constant(tags.name),
        tags.standard(tags.name),
        tags.definition(tags.name),
        tags.separator,
        tags.typeName,
        tags.className,
        tags.number,
        tags.changed,
        tags.annotation,
        tags.modifier,
        tags.self,
        tags.namespace,
        tags.operator,
        tags.operatorKeyword,
        tags.escape,
        tags.regexp,
        tags.special(tags.string),
        tags.meta,
        tags.comment,
        tags.atom,
        tags.bool,
        tags.special(tags.variableName),
        tags.processingInstruction,
        tags.string,
        tags.inserted,
        tags.invalid,
      ],
      color: 'inherit !important',
      // opacity: '0.5',
    },
    {
      tag: [tags.link, tags.url],
      color: 'inherit !important',
      textDecoration: 'none !important',
    },
    {
      tag: [tags.function(tags.variableName), tags.labelName],
      color: malibu,
      fontFamily: monospace,
    },
    {
      tag: [
        markdownTags.headingMark,
        markdownTags.quoteMark,
        markdownTags.listMark,
        markdownTags.linkMark,
        markdownTags.emphasisMark,
        markdownTags.codeMark,
        markdownTags.url,
        markdownTags.linkLabel,
        markdownTags.linkReference,
        tags.processingInstruction,
        tags.meta,
      ],
      class: mark,
    },
    { tag: [markdownTags.codeText, markdownTags.inlineCode], class: 'font-mono' },
    { tag: tags.heading1, class: heading[1] },
    { tag: tags.heading2, class: heading[2] },
    { tag: tags.heading3, class: heading[3] },
    { tag: tags.heading4, class: heading[4] },
    { tag: tags.heading5, class: heading[5] },
    { tag: tags.heading6, class: heading[6] },
    { tag: tags.strikethrough, class: strikethrough },
    { tag: tags.emphasis, class: italic },
    { tag: tags.strong, class: bold },
  ],
  { scope: markdownLanguage, all: { fontFamily: get(tokens, 'fontFamily.body', []).join(',') } },
);
