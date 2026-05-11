//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';
import picomatch from 'picomatch';

/**
 * Decides whether a metafile node (a file or external specifier) is a "terminal"
 * for the trace. The matcher abstracts over three flavours of `--to`:
 *  1. Absolute / relative file path — match the resolved file path.
 *  2. Bare package name (no glob meta-chars) — match `node_modules/<pkg>` paths,
 *     the workspace package name of the file, and exact external specifiers.
 *  3. Glob pattern (contains `*`, `?`, `[`, `{`, `!`) — match against package
 *     names, paths, file basenames, and external specifiers.
 */
export interface Matcher {
  readonly description: string;
  matches(input: MatcherInput): boolean;
}

export interface MatcherInput {
  /** Absolute, normalized path to the resolved file (when applicable). */
  readonly resolvedAbsolute: string | null;
  /** Workspace-qualified package name (e.g. `@dxos/react-ui`) when known. */
  readonly packageName: string | null;
  /** External specifier as authored in the import (only for external imports). */
  readonly externalSpecifier: string | null;
}

const GLOB_META = /[*?[\]{}!()]/;

const slashify = (value: string): string => value.replace(/\\/g, '/');

const hasGlobMeta = (value: string): boolean => GLOB_META.test(value);

/** Normalize a path for cross-platform comparison. */
export const normalizeFsPath = (filePath: string): string => path.normalize(filePath);

/**
 * Extract the npm package name from a path of the form `<pkg>/...` or `@scope/<pkg>/...`.
 */
export const packageNameFromSpecifier = (specifier: string): string | null => {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return null;
  }
  const slash = specifier.indexOf('/');
  return slash === -1 ? specifier : specifier.slice(0, slash);
};

/**
 * Resolve the package name corresponding to a node_modules path, if any.
 */
export const packageNameFromPath = (relativePath: string): string | null => {
  const slashed = slashify(relativePath);
  const lastNm = slashed.lastIndexOf('node_modules/');
  if (lastNm === -1) {
    return null;
  }
  const tail = slashed.slice(lastNm + 'node_modules/'.length);
  return packageNameFromSpecifier(tail);
};

/**
 * Walks up from `absoluteFile` looking for a `package.json` with a `name`
 * field, mapping a workspace file to its package. Cached on the path of the
 * containing directory.
 *
 * Walks all the way up to the filesystem root so that workspace packages
 * outside the current working directory still resolve.
 */
export const createWorkspacePackageResolver = (_absWorkingDir: string) => {
  const cache = new Map<string, string | null>();
  return (absoluteFile: string): string | null => {
    let dir = path.dirname(absoluteFile);
    const visited: string[] = [];
    while (true) {
      if (cache.has(dir)) {
        const cached = cache.get(dir) ?? null;
        for (const v of visited) {
          cache.set(v, cached);
        }
        return cached;
      }
      visited.push(dir);
      const pkgPath = path.join(dir, 'package.json');
      try {
        const text = fs.readFileSync(pkgPath, 'utf8');
        const json = JSON.parse(text) as { name?: string };
        if (json.name) {
          for (const v of visited) {
            cache.set(v, json.name);
          }
          return json.name;
        }
      } catch {
        // No package.json here — keep walking up.
      }
      const parent = path.dirname(dir);
      if (parent === dir) {
        for (const v of visited) {
          cache.set(v, null);
        }
        return null;
      }
      dir = parent;
    }
  };
};

const matchPackageGlob = (pattern: string, candidate: string | null): boolean => {
  if (!candidate) {
    return false;
  }
  return picomatch.isMatch(candidate, pattern, { dot: true });
};

/**
 * Build a matcher for `--to`. Behaviour depends on the syntactic shape of the
 * target spec; see {@link Matcher} for the three cases.
 */
export const createMatcher = (toSpec: string, absWorkingDir: string): Matcher => {
  if (path.isAbsolute(toSpec) || toSpec.startsWith('.')) {
    const resolvedToAbsolute = normalizeFsPath(path.resolve(absWorkingDir, toSpec));
    return {
      description: `path: ${resolvedToAbsolute}`,
      matches: ({ resolvedAbsolute }) => {
        if (!resolvedAbsolute) {
          return false;
        }
        const target = resolvedToAbsolute;
        return resolvedAbsolute === target || resolvedAbsolute.startsWith(target + path.sep);
      },
    };
  }

  if (hasGlobMeta(toSpec)) {
    const patternHasSlash = toSpec.includes('/');
    const isMatch = picomatch(toSpec, { dot: true });
    const tryMatch = (candidate: string): boolean => {
      if (isMatch(candidate)) {
        return true;
      }
      // For slash-less patterns, also try the basename so that `*.pcss`
      // matches `@dxos/lit-ui/dx-avatar.pcss` and `/abs/path/foo.pcss` alike.
      if (!patternHasSlash) {
        const base = path.basename(candidate);
        if (base !== candidate && isMatch(base)) {
          return true;
        }
      }
      return false;
    };
    return {
      description: `glob: ${toSpec}`,
      matches: ({ resolvedAbsolute, packageName, externalSpecifier }) => {
        if (packageName && tryMatch(packageName)) {
          return true;
        }
        if (externalSpecifier && tryMatch(externalSpecifier)) {
          return true;
        }
        if (externalSpecifier) {
          const externalPkg = packageNameFromSpecifier(externalSpecifier);
          if (externalPkg && tryMatch(externalPkg)) {
            return true;
          }
        }
        if (resolvedAbsolute && tryMatch(slashify(resolvedAbsolute))) {
          return true;
        }
        return false;
      },
    };
  }

  // Bare package name — match node_modules paths, workspace package names, and external specifiers.
  return {
    description: `package: ${toSpec}`,
    matches: ({ resolvedAbsolute, packageName, externalSpecifier }) => {
      if (packageName === toSpec) {
        return true;
      }
      if (externalSpecifier) {
        if (
          externalSpecifier === toSpec ||
          externalSpecifier.startsWith(`${toSpec}/`) ||
          externalSpecifier.startsWith(`${toSpec}\\`)
        ) {
          return true;
        }
      }
      if (resolvedAbsolute) {
        const file = slashify(resolvedAbsolute);
        if (toSpec.startsWith('@')) {
          const parts = toSpec.split('/');
          if (parts.length === 2) {
            const needle = `/node_modules/${parts[0]}/${parts[1]}/`;
            const needleBare = `/node_modules/${parts[0]}/${parts[1]}`;
            if (file.includes(needle) || file.endsWith(needleBare)) {
              return true;
            }
          }
        } else {
          const needle = `/node_modules/${toSpec}/`;
          const needleBare = `/node_modules/${toSpec}`;
          if (file.includes(needle) || file.endsWith(needleBare)) {
            return true;
          }
        }
      }
      return false;
    },
  };
};
