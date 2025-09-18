import { Prompt } from '@dxos/blueprints';
import { Filter } from '@dxos/echo';
import { createDocAccessor, Space, useQuery } from '@dxos/react-client/echo';
import { useThemeContext, ThemedClassName } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { Predicate } from 'effect';
import React from 'react';

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

        // Extend markdown with handlebars support.
        createMarkdownExtensions({ themeMode }),
      ].filter(Predicate.isTruthy),
    };
  }, [themeMode, prompt]);

  return <div ref={parentRef} className={mx('bs-full overflow-hidden', classNames)} />;
};
