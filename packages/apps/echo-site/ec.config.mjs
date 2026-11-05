//
// Copyright 2026 DXOS.org
//

import { defineEcConfig } from '@astrojs/starlight/expressive-code';
import ecTwoSlash from 'expressive-code-twoslash';

import { codeThemes } from './src/theme/code-themes.mjs';

export default defineEcConfig({
  themes: codeThemes,
  plugins: [ecTwoSlash()],
  minSyntaxHighlightingColorContrast: 5.5,
  defaultProps: { wrap: true, hangingIndent: 2 },
  styleOverrides: {
    borderRadius: 'var(--c-radius)',
    borderColor: 'transparent',
    codeFontFamily: 'var(--sl-font-mono)',
    uiFontFamily: 'var(--sl-font-mono)',
    frames: {
      frameBoxShadowCssValue: 'none',
      editorActiveTabIndicatorTopColor: 'var(--c-accent)',
      editorTabBarBorderBottomColor: 'var(--c-hairline)',
    },
  },
});
