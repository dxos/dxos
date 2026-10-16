//
// Copyright 2026 DXOS.org
//

/** A path id joins network and node ids with "/", e.g. "cloud/s2/server-1". */
export type Path = string;

export const joinPath = (...parts: string[]): Path => parts.filter((part) => part !== '').join('/');

const escape = (text: string): string => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

const toRegExp = (selector: string): RegExp =>
  new RegExp(
    `^${selector
      .split('/')
      .map((segment) => (segment === '**' ? '.+' : segment.split('*').map(escape).join('[^/]*')))
      .join('/')}$`,
  );

/**
 * Compiles a selector: "*" matches within one segment, "**" any number of segments,
 * and commas separate alternatives ("home, local-*").
 */
export const matchSelector = (selector: string): ((path: Path) => boolean) => {
  const patterns = selector
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map(toRegExp);
  return (path) => patterns.some((pattern) => pattern.test(path));
};
