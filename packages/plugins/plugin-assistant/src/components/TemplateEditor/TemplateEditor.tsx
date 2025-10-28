//
// Copyright 2025 DXOS.org
//

import { xml } from '@codemirror/lang-xml';
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

import { handlebars } from './handlebars-extension';

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
          lineNumbers,
          lineWrapping: false,
          placeholder: t('template placeholder'),
        }),
        createThemeExtensions({ themeMode }),
        createMarkdownExtensions(),
        decorateMarkdown(), // TODO(burdon): Move into bundle.
        handlebars(),
        xml(),
        syntaxHighlighting(defaultHighlightStyle),
      ].filter(isNonNullable),
    };
  }, [themeMode, template.source?.target, lineNumbers]);

  return <div ref={parentRef} className={mx('bs-full overflow-hidden', classNames)} />;
};
