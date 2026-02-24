# Tailwind v4 Migration - ui-theme Plugin

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the Tailwind v4 migration so Storybook loads without errors and TW utility classes are visible in the browser.

**Architecture:**
- `packages/ui/ui-theme/src/theme.css` is the source CSS with `@import 'tailwindcss'`, `@theme`, `@plugin`, and layer imports
- `scripts/process-theme-css.mjs` builds `dist/plugin/node-esm/theme.css` by inlining all `@import`s, leaving `@apply` for Vite to process at runtime
- `ThemePlugin` (Vite plugin) resolves the virtual `@dxos-theme` module to the dist/theme.css, runs it through PostCSS+Tailwind with content paths to generate utilities and process `@apply`

**Tech Stack:** Tailwind CSS v4, `@tailwindcss/postcss`, Vite 7, PostCSS, moon build system

---

## Current Errors

1. **Runtime crash**: `Cannot apply unknown utility class \`ease-[cubic-bezier(0.4,\`` in `dist/plugin/node-esm/theme.css`
   - Root cause: `process-theme-css.mjs` uses the removed `@ch-ui/tokens` package and runs `tailwindcss()` without content, producing a stale dist/theme.css where cubic-bezier values have spaces (e.g. `0.4, 0, 0.6, 1`) which Tailwind v4 misparses as multiple class names
   - Source files are correct (no spaces in cubic-bezier values)

2. **Utilities not visible**: Even after crash is fixed, TW utility classes may not appear in browser devtools
   - Content paths must be passed to `tailwindcss()` in the PostCSS pipeline

---

## Task 1: Fix process-theme-css.mjs

**Files:**
- Modify: `packages/ui/ui-theme/scripts/process-theme-css.mjs`

**Context:** This script builds the dist/theme.css. It currently imports the removed `@ch-ui/tokens` package. The script should ONLY inline imports (postcss-import + postcss-nesting) so that `@apply` directives are preserved for Vite to process at runtime with content paths.

**Step 1: Read current script**

```bash
cat packages/ui/ui-theme/scripts/process-theme-css.mjs
```

**Step 2: Rewrite the script**

Replace the content with:

```js
#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import postcssNesting from 'postcss-nesting';

// Only inline @imports and process nesting.
// Do NOT run tailwindcss() here - @apply is processed at Vite runtime with content paths.
const processor = postcss([
  postcssImport(),
  postcssNesting(),
]);

const inputFile = 'src/theme.css';
const outputFiles = [
  'dist/plugin/node-esm/theme.css',
  'dist/plugin/node-cjs/theme.css',
];

async function processCSS() {
  console.log(`Reading ${inputFile}...`);
  const css = await readFile(inputFile, 'utf8');

  console.log('Processing CSS (inlining imports)...');
  const result = await processor.process(css, {
    from: inputFile,
    to: outputFiles[0],
  });

  for (const outputFile of outputFiles) {
    console.log(`Writing ${outputFile}...`);
    await mkdir(dirname(outputFile), { recursive: true });
    await writeFile(outputFile, result.css);
  }

  console.log('Done!');
}

processCSS().catch((err) => {
  console.error('Error processing CSS:', err);
  process.exit(1);
});
```

**Step 3: Run the script to rebuild dist/theme.css**

```bash
cd packages/ui/ui-theme && node scripts/process-theme-css.mjs
```

Expected output:
```
Reading src/theme.css...
Processing CSS (inlining imports)...
Writing dist/plugin/node-esm/theme.css...
Writing dist/plugin/node-cjs/theme.css...
Done!
```

**Step 4: Verify dist/theme.css has no spaces in cubic-bezier**

```bash
grep "cubic-bezier" packages/ui/ui-theme/dist/plugin/node-esm/theme.css | head -5
```

Expected: `ease-[cubic-bezier(0.4,0,0.6,1)]` (no spaces after commas)

**Step 5: Verify dist/theme.css still has @apply**

```bash
grep "@apply" packages/ui/ui-theme/dist/plugin/node-esm/theme.css | head -5
```

Expected: @apply directives present (they'll be processed by Vite)

---

## Task 2: Restart Storybook and Verify No Crash

**Step 1: Kill current Storybook**

```bash
pkill -f "moon run storybook-react:serve"; pkill -f "storybook/dist"; sleep 2
```

**Step 2: Clear Vite cache**

```bash
rm -rf node_modules/.vite tools/storybook-react/.storybook-cache
```

**Step 3: Start Storybook**

```bash
moon run storybook-react:serve > /tmp/storybook.log 2>&1 &
```

**Step 4: Wait and check for errors**

```bash
sleep 90 && grep -E "(error|Error|Cannot apply|Failed)" /tmp/storybook.log | grep -v "Auth token DEPOT_TOKEN" | head -20
```

Expected: No errors. If errors appear, note the exact message.

**Step 5: Verify Storybook is accessible**

```bash
curl -s http://localhost:9009 | head -5
```

Expected: HTML response (not empty)

---

## Task 3: Verify Tailwind Utilities in Browser

**Step 1: Check that the theme CSS served by Vite contains utility classes**

The ThemePlugin resolves `@dxos-theme` to dist/theme.css and processes it with tailwindcss(content). Check the content paths are being picked up:

```bash
grep "content" packages/ui/ui-theme/src/plugins/plugin.ts | head -10
```

**Step 2: Verify content paths in Storybook config**

```bash
grep -A5 "ThemePlugin" tools/storybook-react/.storybook/main.ts
```

Expected: `ThemePlugin({ root: __dirname, content })` where `content` is an array of glob paths

**Step 3: Check resolveContent.ts logic**

```bash
cat packages/ui/ui-theme/src/plugins/resolveContent.ts
```

Verify `resolveKnownPeers` correctly resolves the content paths relative to Storybook root.

**Step 4: Test a specific known utility is generated**

Add `DEBUG=1` to Storybook startup temporarily to see content resolution:

```bash
DEBUG=1 moon run storybook-react:serve 2>&1 | grep -i "content" | head -10
```

**Step 5: If content paths are wrong, fix resolveContent.ts**

The content paths in main.ts are absolute paths computed at config time:
```ts
export const content = modules.map((dir) => join(packages, dir, contentFiles));
```
These are absolute, so `resolveKnownPeers` should pass them through unchanged.

---

## Task 4: Fix Any Remaining @apply Issues in .pcss Files

**Step 1: Find all remaining @apply with potential comma-in-brackets issues**

```bash
grep -r "@apply.*\[.*,.*\]" packages/ --include="*.css" --include="*.pcss" -n | grep -v "dist/" | head -20
```

**Step 2: For each file found, check if spaces are present inside brackets**

Any `@apply foo-[value, with, spaces]` must have spaces removed: `foo-[value,with,spaces]`

**Step 3: Check lit-ui dx-avatar.pcss is correct**

```bash
head -10 packages/ui/lit-ui/src/dx-avatar/dx-avatar.pcss
```

Expected: No @apply directives (was converted to direct CSS in previous session)

**Step 4: Force-rebuild any cached lit-ui packages**

```bash
moon run lit-ui:compile --force 2>&1 | grep -v "Auth token DEPOT_TOKEN" | tail -10
```

---

## Task 5: Commit and Final Verification

**Step 1: Check git diff for changed files**

```bash
git diff --stat
```

**Step 2: Final Storybook check - no errors**

```bash
grep -E "(error|Error|Cannot apply)" /tmp/storybook.log | grep -v "Auth token DEPOT_TOKEN" | wc -l
```

Expected: 0

**Step 3: Commit**

```bash
git add packages/ui/ui-theme/scripts/process-theme-css.mjs \
        packages/ui/ui-theme/dist/plugin/node-esm/theme.css \
        packages/ui/ui-theme/dist/plugin/node-cjs/theme.css
git commit -m "fix(ui-theme): rebuild dist/theme.css with correct process-theme-css script

- Remove broken @ch-ui/tokens dependency from process-theme-css.mjs
- Only inline @imports at build time; leave @apply for Vite PostCSS runtime
- Fixes 'Cannot apply unknown utility class ease-[cubic-bezier...]' error"
```

---

## Notes

- **moon remote cache**: If changes don't take effect, force rebuild with `moon run ui-theme:compile-node --force`
- **Filter DEPOT_TOKEN warnings**: Always filter `Auth token DEPOT_TOKEN does not exist` from output
- **Verify after EVERY step** - do not proceed to next step without confirming the current step worked
- **Do NOT cast types to fix errors** - understand root cause first
