//
// Copyright 2026 DXOS.org
//

const SOURCES = import.meta.glob<string>('./snippets/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });

const readSnippet = (file: string): string => {
  const entry = Object.entries(SOURCES).find(([path]) => path.match(new RegExp(`/${file}\\.tsx?$`)));
  if (!entry) {
    throw new Error(`Unknown snippet: ${file}`);
  }
  return entry[1];
};

/** Returns a snippet's visible code: one `// #region` if named, else every region, else the whole file past its imports. */
export const snippetSource = (file: string, region?: string): string => {
  const source = readSnippet(file);
  const pattern = region
    ? new RegExp(`// #region ${region}\\n([\\s\\S]*?)// #endregion`)
    : /\/\/ #region\n([\s\S]*?)\/\/ #endregion/;
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Snippet ${file} has no region ${region ?? '(default)'}`);
  }
  return match[1].trimEnd();
};

/** The snippet with the code before its region cut, so a compiler can resolve its types while the page shows only the region. */
export const snippetWithContext = (file: string, region?: string): string => {
  const source = readSnippet(file);
  const marker = region ? `// #region ${region}\n` : '// #region\n';
  const start = source.indexOf(marker);
  if (start < 0) {
    throw new Error(`Snippet ${file} has no region ${region ?? '(default)'}`);
  }
  const before = source.slice(0, start).replace(/^\/\/ #(end)?region.*$/gm, '');
  return `${before}// ---cut---\n${snippetSource(file, region)}`;
};
