#!/usr/bin/env node
/**
 * Generates CSS tokens from the tokenSet configuration.
 *
 * IMPORTANT: This script was used to generate src/styles/generated-tokens.css
 * during the Tailwind CSS v4 migration. It should be run manually after making
 * changes to the tokenSet configuration in src/config/tokens/.
 *
 * Current status: The script needs to be updated to work with the compiled
 * output. For now, the generated-tokens.css file has been created and checked
 * into source control.
 *
 * To regenerate tokens in the future:
 * 1. Update this script to properly import tokenSet from compiled output
 * 2. Build the ui-theme package: `moon run ui-theme:compile-node`
 * 3. Run this script: `cd packages/ui/ui-theme && node scripts/generate-token-css.mjs`
 *
 * The generated CSS will be written to src/styles/generated-tokens.css
 */
import { writeFile } from 'node:fs/promises';
import { renderTokenSet } from '@ch-ui/tokens';

console.error('This script needs to be updated to work with the new build system.');
console.error('The generated-tokens.css file has already been created and is checked into source control.');
console.error('It only needs to be regenerated when the tokenSet configuration changes.');
process.exit(1);
