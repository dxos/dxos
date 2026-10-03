//
// Copyright 2026 DXOS.org
//

/** Prism language names by file extension; anything unlisted renders as plain text. */
const LANGUAGES: Record<string, string> = {
  bash: 'bash',
  c: 'c',
  cpp: 'cpp',
  css: 'css',
  go: 'go',
  h: 'c',
  html: 'markup',
  java: 'java',
  js: 'javascript',
  json: 'json',
  jsx: 'jsx',
  md: 'markdown',
  mjs: 'javascript',
  py: 'python',
  rs: 'rust',
  sh: 'bash',
  sql: 'sql',
  svg: 'markup',
  toml: 'toml',
  ts: 'typescript',
  tsx: 'tsx',
  xml: 'markup',
  yaml: 'yaml',
  yml: 'yaml',
};

const IMAGE_TYPES: Record<string, string> = {
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const extension = (path: string): string => path.split('/').at(-1)?.split('.').at(-1)?.toLowerCase() ?? '';

export const languageForPath = (path: string): string => LANGUAGES[extension(path)] ?? 'text';

/** The MIME type to show a binary file as an image with, when its name says it is one. */
export const imageTypeForPath = (path: string): string | undefined => IMAGE_TYPES[extension(path)];
