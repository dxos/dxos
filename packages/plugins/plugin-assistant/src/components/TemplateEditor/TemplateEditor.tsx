//
// Copyright 2025 DXOS.org
//

import { HighlightStyle, LanguageSupport, syntaxHighlighting } from '@codemirror/language';
import { styleTags, tags } from '@lezer/highlight';
import { handlebarsLanguage } from '@xiechao/codemirror-lang-handlebars';
import React from 'react';

import { type Template } from '@dxos/blueprints';
import { invariant } from '@dxos/invariant';
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

handlebarsLanguage.configure({
  props: [
    styleTags({
      '---': tags.lineComment,
    }),
  ],
});

export type TemplateEditorProps = ThemedClassName<{
  template: Template.Template;
}>;

export const TemplateEditor = ({ classNames, template }: TemplateEditorProps) => {
  const { t } = useTranslation(meta.id);
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    invariant(template.source.target);
    return {
      initialValue: template.source.target.content,
      extensions: [
        createDataExtensions({
          id: template.id,
          text: createDocAccessor(template.source.target, ['content']),
        }),
        createBasicExtensions({
          bracketMatching: false,
          lineNumbers: true,
          lineWrapping: true,
          monospace: true,
          placeholder: t('template placeholder'),
        }),
        createThemeExtensions({
          themeMode,
        }),

        // https://github.com/xiechao/lang-handlebars
        new LanguageSupport(handlebarsLanguage, syntaxHighlighting(handlebarsHighlightStyle)),
      ],
    };
  }, [themeMode, template]);

  return <div ref={parentRef} className={mx('h-full', classNames)} />;
};

/**
 * https://github.com/xiechao/lang-handlebars/blob/direct/src/highlight.js
 */
export const handlebarsHighlightStyle = HighlightStyle.define([
  {
    // Braces.
    tag: tags.tagName,
    class: 'text-redText',
  },
  {
    tag: tags.variableName,
    class: 'text-blueText',
  },
  {
    tag: tags.keyword,
    class: 'text-greenText',
  },
  {
    tag: tags.comment,
    class: 'text-subdued',
  },
]);
