//
// Copyright 2025 DXOS.org
//

import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { composeRefs } from '@radix-ui/react-compose-refs';
import React from 'react';

import { type Ref } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-client';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { type Text } from '@dxos/schema';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';

import { handlebars, xmlDecorator } from './extensions';

export type TemplateEditorProps = {
  id: string;
  /** Markdown + Handlebars source text. */
  source?: Ref.Ref<Text.Text>;
  lineNumbers?: boolean;
};

export const TemplateEditor = composable<HTMLDivElement, TemplateEditorProps>(
  ({ classNames, id, source, lineNumbers = true, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const { themeMode } = useThemeContext();
    const { parentRef } = useTextEditor(() => {
      const target = source?.target;
      if (!target) {
        return {};
      }

      return {
        initialValue: target.content ?? '',
        extensions: [
          createDataExtensions({
            id,
            text: createDocAccessor(target, ['content']),
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
    }, [themeMode, source?.target, lineNumbers]);

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
