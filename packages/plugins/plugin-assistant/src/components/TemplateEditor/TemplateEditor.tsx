//
// Copyright 2025 DXOS.org
//

import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import React from 'react';

import { type Template } from '@dxos/blueprints';
import { createDocAccessor } from '@dxos/react-client/echo';
import { type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';

import { handlebars, xmlDecorator } from './extensions';

export type TemplateEditorProps = ThemedClassName<{
  id: string;
  template: Template.Template;
  lineNumbers?: boolean;
}>;

export const TemplateEditor = ({ id, classNames, template, lineNumbers = true }: TemplateEditorProps) => {
  const { t } = useTranslation(meta.id);
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    const text = template.source?.target;
    if (!text) {
      return {};
    }

    return {
      initialValue: text.content ?? '',
      extensions: [
        createDataExtensions({
          id,
          text: createDocAccessor(text, ['content']),
        }),
        createBasicExtensions({
          bracketMatching: false,
          lineNumbers: true,
          lineWrapping: true,
          placeholder: t('template placeholder'),
        }),
        createThemeExtensions({ themeMode, slots: { content: { className: '!pie-4' } } }),
        createMarkdownExtensions(),
        decorateMarkdown(),
        handlebars(),
        // xml(),
        // NOTE: Since we're using markdown only HTML nodes are parsed.
        xmlDecorator(),
        syntaxHighlighting(defaultHighlightStyle),
      ].filter(isNonNullable),
    };
  }, [themeMode, template.source?.target, lineNumbers]);

  return <div ref={parentRef} className={mx('bs-full overflow-hidden', classNames)} />;
};
