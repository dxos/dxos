//
// Copyright 2024 DXOS.org
//

// Based upon https://github.com/synw/tailwindcss-semantic-colors/blob/main/index.js retrieved 22 Jan 2024

import plugin from 'tailwindcss/plugin';
import { type CSSRuleObject } from 'tailwindcss/types/config';

export type SemanticColorValue = {
  light: string;
  dark: string;
  fg?: SemanticColorValue;
};

export const semanticColors = plugin(({ addUtilities, theme, e }) => {
  const values: Record<string, SemanticColorValue> = theme('semanticColors');
  const semanticColorUtilities = Object.entries(values).map(([key, value]) => {
    return {
      [`.fg-${e(`${key}`)}`]: {
        color: `${value.fg?.light ?? value.light}`,
      },
      [`.dark .fg-${e(`${key}`)}`]: {
        color: `${value.fg?.dark ?? value.dark}`,
      },
      [`.surface-${e(`${key}`)}`]: {
        backgroundColor: `${value.light}`,
      },
      [`.dark .surface-${e(`${key}`)}`]: {
        backgroundColor: `${value.dark}`,
      },
      [`.separator-${e(`${key}`)}`]: {
        borderColor: `${value.fg?.light ?? value.light}`,
      },
      [`.dark .separator-${e(`${key}`)}`]: {
        borderColor: `${value.fg?.dark ?? value.dark}`,
      },
    } as CSSRuleObject;
  });
  addUtilities(semanticColorUtilities);
});
