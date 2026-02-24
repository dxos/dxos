//
// Copyright 2024 DXOS.org
//

import type { Config } from 'tailwindcss';

/**
 * Tailwind v4 configuration.
 * Content scanning configuration - theme values are defined in theme.css using @theme directive.
 */
export default {
  content: [
    // Scan all packages for Tailwind utility class usage
    '../../packages/**/src/**/*.{js,ts,jsx,tsx,html}',
    '../../tools/**/src/**/*.{js,ts,jsx,tsx,html}',
    // Include stories
    '../../packages/**/*.stories.{js,ts,jsx,tsx}',
    '../../tools/**/*.stories.{js,ts,jsx,tsx}',
  ],
} satisfies Config;
