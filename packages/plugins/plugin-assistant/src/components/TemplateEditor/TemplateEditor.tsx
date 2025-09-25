//
// Copyright 2025 DXOS.org
//

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
import { isNotFalsy } from '@dxos/util';

import { meta } from '../../meta';

import { handlebars } from './handlebars-extension';

export type TemplateEditorProps = ThemedClassName<{
  id: string;
  template: Template.Template;
}>;

export const TemplateEditor = ({ id, classNames, template }: TemplateEditorProps) => {
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
        createDataExtensions({ id, text: createDocAccessor(text, ['content']) }),
        createBasicExtensions({
          bracketMatching: false,
          lineNumbers: true,
          lineWrapping: true,
          placeholder: t('template placeholder'),
        }),
        createThemeExtensions({ themeMode }),
        createMarkdownExtensions(),
        decorateMarkdown(),
        handlebars(),
      ].filter(isNotFalsy),
    };
  }, [themeMode, template.source?.target]);

  return <div ref={parentRef} className={mx('bs-full overflow-hidden', classNames)} />;
};
