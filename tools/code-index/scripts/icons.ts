//
// Copyright 2026 DXOS.org
//

import codicons from '@iconify-json/codicon/icons.json' with { type: 'json' };
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

/**
 * The VS Code glyphs the tree tab and its Cmd+P palette draw, as icons in the app's sprite: files
 * take Seti's glyph and colour (VS Code's default file icon theme, built from `seti-ui`), and
 * declarations the codicon VS Code's outline shows. Writes one SVG per glyph to `assets/icons/`, which
 * `workspace/Vite.ts` serves as the `vsc` icon set, and `src/webui/react/vscode-icons.generated.ts`,
 * which maps a file or declaration to its icon id and colour class. The sprite paints every icon in
 * `currentColor`, so a colour is a class, never a fill. Rerun after changing the lists below or
 * bumping a pack:
 *
 *   pnpm --filter @dxos/code-index icons
 */

/** File names and extensions the tree can show, looked up in Seti's own mapping; longest match wins at runtime. */
const FILE_KEYS = [
  'tsconfig.json',
  'README.md',
  'CHANGELOG.md',
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.json',
  '.md',
  '.css',
  '.html',
  '.svg',
  '.yml',
  '.yaml',
  '.sh',
];

/** The glyph for a package row; Seti has no package icon, so its npm glyph stands in. */
const PACKAGE_KEY = '.npmignore';

/** Codicon glyphs for declarations, as VS Code's outline draws them. */
const CODICONS = [
  'symbol-method',
  'symbol-class',
  'symbol-interface',
  'symbol-structure',
  'symbol-enum',
  'symbol-variable',
  'symbol-namespace',
  'symbol-field',
  'symbol-misc',
];

/**
 * Seti draws its art in the middle of a 32-unit box and VS Code enlarges it as a font glyph, so its
 * view box is cropped to that middle to match the size of a codicon beside it.
 */
const SETI_CROP = { from: 0.16, size: 0.68 };

const require = createRequire(import.meta.url);
const seti = dirname(require.resolve('seti-ui/package.json'));
const root = join(import.meta.dirname, '..');
const assets = join(root, 'assets', 'icons');

/** Seti's palette: the `@name: #rrggbb;` lines of its variables. */
const colors = new Map(
  [...readFileSync(join(seti, 'styles/ui-variables.less'), 'utf8').matchAll(/^@([\w-]+):\s*(#[0-9a-f]{3,6});/gim)].map(
    ([, name, value]) => [name, value],
  ),
);

/** Seti's mapping, `.icon-set("<file or extension>", "<icon>", @<colour>);`; the first rule for a key wins. */
const mapping = new Map<string, { readonly icon: string; readonly color: string }>();
for (const [, key, icon, color] of readFileSync(join(seti, 'styles/components/icons/mapping.less'), 'utf8').matchAll(
  /\.icon-set\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*@([\w-]+)\s*\)/g,
)) {
  if (!mapping.has(key)) {
    mapping.set(key, { icon, color: colors.get(color) ?? '' });
  }
}

/** An icon id in the sprite's `vsc` set, which only has the regular weight. */
const iconId = (name: string): string => `vsc--${name}--regular`;

/** A file name or extension as an icon name: lowercase words joined by hyphens (`README.md` -> `file-readme-md`). */
const fileName = (key: string): string =>
  `file-${key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;

const writeIcon = (name: string, viewBox: string, body: string) =>
  writeFileSync(
    join(assets, `${name}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>\n`,
  );

const writeSeti = (name: string, icon: string) => {
  const svg = readFileSync(join(seti, 'icons', `${icon}.svg`), 'utf8');
  const [width, height] = (/viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)?.slice(1) ?? ['32', '32']).map(Number);
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const box = [width * SETI_CROP.from, height * SETI_CROP.from, width * SETI_CROP.size, height * SETI_CROP.size];
  writeIcon(name, box.map((value) => Number(value.toFixed(2))).join(' '), body);
};

rmSync(assets, { recursive: true, force: true });
mkdirSync(assets, { recursive: true });

/** A glyph as the page uses it: its sprite id, and the class that gives it Seti's colour. */
type Glyph = { readonly icon: string; readonly className?: string };

const files: Record<string, Glyph> = {};
for (const key of [...FILE_KEYS, PACKAGE_KEY]) {
  const entry = mapping.get(key);
  if (!entry) {
    throw new Error(`Seti maps no icon for ${key}`);
  }
  writeSeti(fileName(key), entry.icon);
  files[key] = { icon: iconId(fileName(key)), className: `text-[${entry.color}]` };
}
writeSeti('file-default', 'default');

const symbols: Record<string, string> = {};
for (const name of CODICONS) {
  const icon = codicons.icons[name as keyof typeof codicons.icons];
  if (!icon) {
    throw new Error(`No codicon ${name}`);
  }
  // Codicons are drawn on a 16-unit grid; an icon names its own size only when it differs.
  writeIcon(name, `0 0 ${'width' in icon ? icon.width : 16} ${'height' in icon ? icon.height : 16}`, icon.body);
  symbols[name] = iconId(name);
}

const output = join(root, 'src', 'webui', 'react', 'vscode-icons.generated.ts');
writeFileSync(
  output,
  [
    '//',
    '// Copyright 2026 DXOS.org',
    '//',
    '',
    '// Generated by `tools/code-index/scripts/icons.ts`; do not edit.',
    '// File glyphs and colours: Seti UI (https://github.com/jesseweed/seti-ui), MIT, Jesse Weed.',
    '// Symbol glyphs: Codicons (https://github.com/microsoft/vscode-codicons), CC BY 4.0, Microsoft Corporation.',
    '',
    "/** A glyph as the page uses it: its sprite id, and the class that gives it Seti's colour. */",
    'export type Glyph = { icon: string; className?: string };',
    '',
    '/** Seti glyphs by file name or extension. */',
    `export const FILE_ICONS: Record<string, Glyph> = ${JSON.stringify(files, null, 2)};`,
    '',
    `export const DEFAULT_FILE_ICON: Glyph = ${JSON.stringify({ icon: iconId('file-default'), className: `text-[${colors.get('white')}]` })};`,
    '',
    `export const PACKAGE_ICON: Glyph = FILE_ICONS[${JSON.stringify(PACKAGE_KEY)}];`,
    '',
    "/** Codicon ids by name; they take the row's tint. */",
    `export const SYMBOL_ICONS: Record<string, string> = ${JSON.stringify(symbols, null, 2)};`,
    '',
  ].join('\n'),
);
console.log(`wrote ${Object.keys(files).length + 1} file icons and ${CODICONS.length} symbol icons to ${assets}`);
