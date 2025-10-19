//
// Copyright 2025 DXOS.org
//

import * as Predicate from 'effect/Predicate';
import React from 'react';

import { Prompt } from '@dxos/blueprints';
import { Filter } from '@dxos/echo';
import { type Space, createDocAccessor, useQuery } from '@dxos/react-client/echo';
import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

export const PromptContainer = ({ space }: { space: Space }) => {
  const [prompt] = useQuery(space, Filter.type(Prompt.Prompt));
  if (!prompt) {
    return null;
  }
  return (
    <div style={{ minHeight: '300px' }}>
      <PromptEditor prompt={prompt} />
    </div>
  );
};

const PromptEditor = ({ prompt, classNames }: ThemedClassName<{ prompt: Prompt.Prompt }>) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    return {
      initialValue: prompt.instructions ?? '',
      extensions: [
        createDataExtensions({ id: prompt.id, text: createDocAccessor(prompt, ['instructions']) }),
        createBasicExtensions({
          bracketMatching: false,
          lineNumbers: true,
          lineWrapping: true,
        }),
        createThemeExtensions({ themeMode }),
        createMarkdownExtensions(),
      ].filter(Predicate.isTruthy),
    };
  }, [themeMode, prompt]);

  return <div ref={parentRef} className={mx('bs-full overflow-hidden', classNames)} />;
};
