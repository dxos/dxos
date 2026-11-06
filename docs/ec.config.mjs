//
// Copyright 2026 DXOS.org
//

import { defineEcConfig } from '@astrojs/starlight/expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import ecTwoSlash from 'expressive-code-twoslash';

import { codeThemes } from './src/theme/code-themes.mjs';

export default defineEcConfig({
  themes: codeThemes,
  plugins: [pluginLineNumbers(), ecTwoSlash()],
  minSyntaxHighlightingColorContrast: 5.5,
  defaultProps: { wrap: true, hangingIndent: 2, showLineNumbers: true },
  styleOverrides: {
    borderRadius: 'var(--c-radius)',
    borderColor: 'var(--c-hairline)',
    borderWidth: '1px',
    codeBackground: 'var(--c-surface)',
    codeFontFamily: 'var(--sl-font-mono)',
    codeFontSize: '0.85rem',
    codeLineHeight: '1.65',
    codePaddingBlock: '1.25rem',
    codePaddingInline: '1.4rem',
    uiFontFamily: 'var(--sl-font-mono)',
    gutterBorderColor: 'var(--c-hairline-strong)',
    gutterBorderWidth: '1.5px',
    gutterForeground: 'var(--c-muted)',
    frames: {
      frameBoxShadowCssValue: 'none',
      editorActiveTabBackground: 'var(--c-bg)',
      editorActiveTabForeground: 'var(--c-fg)',
      editorActiveTabBorderColor: 'var(--c-hairline)',
      editorActiveTabIndicatorTopColor: 'transparent',
      editorActiveTabIndicatorBottomColor: 'transparent',
      editorTabBarBackground: 'var(--c-surface)',
      editorTabBarBorderColor: 'var(--c-hairline)',
      editorTabBarBorderBottomColor: 'var(--c-hairline)',
    },
  },
});
