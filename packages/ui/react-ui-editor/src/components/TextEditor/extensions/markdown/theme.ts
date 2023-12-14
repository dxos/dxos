//
// Copyright 2023 DXOS.org
//

import { markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import get from 'lodash.get';

import { markdownTags } from './tags';
import { bold, heading, italic, mark, strikethrough, tokens, type ThemeStyles } from '../../../../styles';

// TODO(burdon): Rationalize theme/colors. Hoist onto single property object.
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

const monospace = get(tokens, 'fontFamily.mono', ['monospace']).join(',');

// TODO(burdon): Subtle difference in layout for documents and stacks.
// TODO(burdon): On first character, height of editor changes by a few pixels.
//  Also jiggles once styles is applied in code block.

/**
 * NOTE: The '&' prefix denotes the CM editor root.
 * https://codemirror.net/examples/styling
 */
export const markdownTheme: ThemeStyles = {
  // TODO(thure): Consider whether these commented-out rules from one-dark-theme should be integrated.
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

  '& .cm-tooltip': {
    backgroundColor: 'transparent',
    border: 'none',
  },
  // '.dark & .cm-tooltip': {
  //   border: 'none',
  //   backgroundColor: tooltipBackground,
  // },
  // '.dark & .cm-tooltip .cm-tooltip-arrow:before': {
  //   borderTopColor: 'transparent',
  //   borderBottomColor: 'transparent',
  // },
  // '.dark & .cm-tooltip .cm-tooltip-arrow:after': {
  //   borderTopColor: tooltipBackground,
  //   borderBottomColor: tooltipBackground,
  // },
  // '.dark & .cm-tooltip-autocomplete': {
  //   '& > ul > li[aria-selected]': {
  //     backgroundColor: highlightBackground,
  //     color: ivory,
  //   },
  // },
  '&.cm-focused': {
    outline: 'none',
  },
  '& .cm-line': {
    paddingInline: 0,
    minBlockSize: '1.6em',
  },
  '& .cm-line *': {
    lineHeight: 1.6,
  },
  '&.cm-focused .cm-selectionBackground, & .cm-selectionBackground': {
    background: get(tokens, 'extend.colors.primary.150', '#00ffff'),
  },
  '.dark & .cm-selectionBackground, .dark &.cm-focused .cm-selectionBackground': {
    background: get(tokens, 'extend.colors.primary.850', '#00ffff'),
  },
  '& .cm-selectionMatch': {
    background: get(tokens, 'extend.colors.primary.250', '#00ffff') + '44',
  },
  '.dark & .cm-selectionMatch': {
    background: get(tokens, 'extend.colors.primary.600', '#00ffff') + '44',
  },
  '& .cm-content': {
    padding: 0,
    caretColor: 'black',
  },
  '.dark & .cm-content': {
    caretColor: 'white',
  },
  '& .cm-cursor': {
    borderLeftColor: 'black',
  },
  '.dark & .cm-cursor': {
    borderLeftColor: 'white',
  },
  '.cm-placeholder': {
    fontFamily: get(tokens, 'fontFamily.body', []).join(','),
  },
  '& .cm-scroller': {
    fontFamily: get(tokens, 'fontFamily.mono', []).join(','),
    overflow: 'visible',
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
  '& .cm-ySelection, & .cm-selectionMatch': {
    paddingBlockStart: '.15em',
    paddingBlockEnd: '.15em',
  },
  '& .cm-ySelection, & .cm-yLineSelection': {
    mixBlendMode: 'multiply',
  },
  '.dark & .cm-ySelection, .dark & .cm-yLineSelection': {
    mixBlendMode: 'screen',
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
  '.cm-link': {
    color: 'rgb(20 89 208)', // TODO(burdon): Rationalize.
    textDecorationLine: 'underline',
    textDecorationThickness: '1px',
    textUnderlineOffset: '2px',
    borderRadius: '.125rem',
  },
  // TODO(burdon): Document.
  ...Object.keys(get(tokens, 'extend.fontSize', {})).reduce((acc: Record<string, any>, fontSize) => {
    const height = get(tokens, ['extend', 'fontSize', fontSize, 1, 'lineHeight']);
    // TODO(thure): This appears to be the best or only way to set selection caret heights, but it's far more verbose than it needs to be.
    acc[`& .text-${fontSize} + .cm-ySelectionCaret`] = { height };
    acc[`& .text-${fontSize} + .cm-ySelection + .cm-ySelectionCaret`] = { height };
    acc[`& .text-${fontSize} + .cm-widgetBuffer + .cm-ySelectionCaret`] = { height };
    return acc;
  }, {}),
};

export const markdownHighlightStyle = HighlightStyle.define(
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
        markdownTags.codeMark,
        markdownTags.emphasisMark,
        markdownTags.headingMark,
        markdownTags.linkLabel,
        markdownTags.linkReference,
        markdownTags.listMark,
        markdownTags.quoteMark,
        markdownTags.url,
        tags.meta,
        tags.processingInstruction,
      ],
      class: mark,
    },
    { tag: [markdownTags.codeText, markdownTags.inlineCode], class: 'font-mono' },
    { tag: tags.emphasis, class: italic },
    { tag: tags.heading1, class: heading[1] },
    { tag: tags.heading2, class: heading[2] },
    { tag: tags.heading3, class: heading[3] },
    { tag: tags.heading4, class: heading[4] },
    { tag: tags.heading5, class: heading[5] },
    { tag: tags.heading6, class: heading[6] },
    { tag: tags.strikethrough, class: strikethrough },
    { tag: tags.strong, class: bold },
  ],
  { scope: markdownLanguage, all: { fontFamily: get(tokens, 'fontFamily.body', []).join(',') } },
);
