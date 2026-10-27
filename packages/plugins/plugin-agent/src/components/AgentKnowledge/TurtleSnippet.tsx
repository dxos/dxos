//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithoutRef, memo, useInsertionEffect, useMemo } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import { diffHighlightStyles, highlightTurtle } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

/** Theme modes whose highlight rules are in the document; a style's rules are only mounted by an editor otherwise. */
const mounted = new Set<'dark' | 'light'>();

const useHighlightStyle = () => {
  const mode = Hooks.useThemeMode() === 'dark' ? 'dark' : 'light';
  const style = diffHighlightStyles[mode];
  useInsertionEffect(() => {
    const rules = style.module?.getRules();
    if (mounted.has(mode) || !rules) {
      return;
    }
    const element = document.createElement('style');
    element.textContent = rules;
    document.head.appendChild(element);
    mounted.add(mode);
  }, [mode, style]);
  return style;
};

export type TurtleSnippetProps = Omit<ComponentPropsWithoutRef<'pre'>, 'children'> & {
  /** Turtle or TriG source. */
  source: string;
};

/** Read-only Turtle or TriG, coloured as the editor colours it, without mounting an editor. */
export const TurtleSnippet = memo(({ source, className, ...props }: TurtleSnippetProps) => {
  const style = useHighlightStyle();
  const lines = useMemo(() => highlightTurtle(source, style), [source, style]);
  return (
    <pre {...props} className={mx('m-0 whitespace-pre font-mono', className)}>
      {lines.map((spans, line) => (
        <div key={line}>
          {spans.length === 0
            ? '\n'
            : spans.map(({ text, classes }, index) =>
                classes ? (
                  <span key={index} className={classes}>
                    {text}
                  </span>
                ) : (
                  text
                ),
              )}
        </div>
      ))}
    </pre>
  );
});

TurtleSnippet.displayName = 'TurtleSnippet';
