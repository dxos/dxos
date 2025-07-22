//
// Copyright 2025 DXOS.org
//

import { HighlightStyle, LanguageSupport, syntaxHighlighting } from '@codemirror/language';
import { styleTags, tags } from '@lezer/highlight';
import { handlebarsLanguage } from '@xiechao/codemirror-lang-handlebars';
import React from 'react';

import { createDocAccessor } from '@dxos/react-client/echo';
import { useThemeContext, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { meta } from '../../meta';
import { type TemplateType } from '../../types';

handlebarsLanguage.configure({
  props: [
    styleTags({
      '---': tags.lineComment,
    }),
  ],
});

export type TemplateEditorProps = ThemedClassName<{
  template: TemplateType;
}>;

export const TemplateEditor = ({ classNames, template }: TemplateEditorProps) => {
  const { t } = useTranslation(meta.id);
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      initialValue: template.source,
      extensions: [
        createDataExtensions({
          id: template.id,
          text: template.source !== undefined ? createDocAccessor(template, ['template']) : undefined,
        }),
        createBasicExtensions({
          bracketMatching: false,
          lineWrapping: true,
          placeholder: t('template placeholder'),
        }),
        createThemeExtensions({
          themeMode,
          slots: {
            content: { className: '!p-3' },
          },
        }),

        // https://github.com/xiechao/lang-handlebars
        new LanguageSupport(handlebarsLanguage, syntaxHighlighting(handlebarsHighlightStyle)),
      ],
    }),
    [themeMode, prompt],
  );

  return <div ref={parentRef} className={mx(classNames)} />;
};

/**
 * https://github.com/xiechao/lang-handlebars/blob/direct/src/highlight.js
 */
export const handlebarsHighlightStyle = HighlightStyle.define([
  { tag: tags.tagName, class: 'text-redText' }, // Braces.
  { tag: tags.variableName, class: 'text-blueText' },
  { tag: tags.keyword, class: 'text-greenText' },
  { tag: tags.comment, class: 'text-subdued' },
]);
