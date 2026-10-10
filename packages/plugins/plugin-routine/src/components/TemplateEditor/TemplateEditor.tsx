//
// Copyright 2025 DXOS.org
//

import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import React from 'react';

import { type Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useDocAccessor } from '@dxos/react-client/echo';
import { composeRefs } from '@dxos/react-hooks';
import { useTextEditor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Util from '@dxos/react-ui/Util';
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

import { handlebars, xmlDecorator } from './extensions/index.ts';

export type TemplateEditorProps = {
  id: string;
  /** Markdown + Handlebars source text. */
  source?: Ref.Ref<Text.Text>;
  lineNumbers?: boolean;
};

export const TemplateEditor = Util.composable<HTMLDivElement, TemplateEditorProps>(
  ({ classNames, id, source, lineNumbers = true, ...props }, forwardedRef) => {
    const { t } = Hooks.useTranslation(meta.profile.key);
    const themeMode = Hooks.useThemeMode();
    const [resolved] = useObject(source);
    const text = useDocAccessor(resolved ? source?.target : undefined, ['content']);
    const { parentRef } = useTextEditor(() => {
      const target = source?.target;
      if (!resolved || !target || !text) {
        return {};
      }

      return {
        initialValue: target.content ?? '',
        extensions: [
          createDataExtensions({ id, text }),
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
    }, [themeMode, resolved, text, lineNumbers]);

    return (
      <div
        {...Util.composableProps(props, {
          role: 'none',
          classNames: ['h-full overflow-hidden', classNames],
        })}
        ref={composeRefs(parentRef, forwardedRef)}
      />
    );
  },
);
