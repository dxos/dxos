//
// Copyright 2025 DXOS.org
//

import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { composeRefs } from '@radix-ui/react-compose-refs';
import React from 'react';

import { type Template } from '@dxos/blueprints';
import { createDocAccessor } from '@dxos/echo-db';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';
import { composable, composableProps } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';

import { handlebars, xmlDecorator } from './extensions';

export type TemplateEditorProps = {
  id: string;
  template: Template.Template;
  lineNumbers?: boolean;
};

export const TemplateEditor = composable<HTMLDivElement, TemplateEditorProps>(
  ({ classNames, id, template, lineNumbers = true, ...props }, forwardedRef) => {
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
            lineWrapping: true,
            placeholder: t('template.placeholder'),
          }),
          createThemeExtensions({ themeMode }),
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

    return (
      <div
        {...composableProps(props, {
          role: 'none',
          classNames: ['h-full overflow-hidden', classNames],
        })}
        ref={composeRefs(parentRef, forwardedRef)}
      />
    );
  },
);
