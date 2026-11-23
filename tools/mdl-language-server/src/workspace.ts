//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parseGitHubRemote } from '@dxos/deus/review';
import { type SpecIndex, indexSpecs, isIndexedSpec } from '@dxos/deus/spec-index';

/** The repository a checkout holds, matched against the `owner/repo` of a `github:` key. */
export type Repo = { owner: string; repo: string };

/**
 * What the analysis reads: files by repo-relative POSIX path (an open buffer wins over the disk), the spec index, and
 * the repository the root checks out. Implemented over the disk by {@link DiskWorkspace} and in memory for tests.
 */
export interface Workspace {
  /** Absolute path of the checkout root. */
  readonly root: string;
  readonly repo?: Repo;
  readonly index: SpecIndex;
  read(path: string): string | undefined;
}

/** The repo-relative POSIX path of a `file:` URI, or undefined outside the root. */
export const pathOfUri = (workspace: Workspace, uri: string): string | undefined => {
  if (!uri.startsWith('file:')) {
    return undefined;
  }
  const path = relative(workspace.root, fileURLToPath(uri));
  return path.startsWith('..') || isAbsolute(path) ? undefined : path.split(sep).join('/');
};

/** The `file:` URI of a repo-relative path. */
export const uriOfPath = (workspace: Workspace, path: string): string =>
  pathToFileURL(join(workspace.root, ...path.split('/'))).href;

/** A workspace over files held in memory, for tests and for documents outside any checkout. */
export class MemoryWorkspace implements Workspace {
  readonly files: Map<string, string>;
  index: SpecIndex;

  constructor(
    files: Record<string, string>,
    readonly root = '/repo',
    readonly repo: Repo | undefined = { owner: 'dxos', repo: 'dxos' },
  ) {
    this.files = new Map(Object.entries(files));
    this.index = this.#reindex();
  }

  read(path: string): string | undefined {
    return this.files.get(path);
  }

  set(path: string, text: string): void {
    this.files.set(path, text);
    this.index = this.#reindex();
  }

  #reindex(): SpecIndex {
    return indexSpecs(
      [...this.files]
        .filter(([path]) => path.endsWith('.mdl') && isIndexedSpec(path))
        .map(([path, text]) => ({ path, text })),
    );
  }
}

const SKIPPED_DIRS = new Set(['node_modules', '.git', 'dist', 'out', 'target', '.moon']);

/** Every `.mdl` path under `root`: tracked files when it is a git checkout, else a walk that skips build output. */
const listSpecs = (root: string): string[] => {
  try {
    return execFileSync(
      'git',
      ['-c', 'core.quotePath=false', 'ls-files', '--cached', '--others', '--exclude-standard', '--', '*.mdl'],
      {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    )
      .split('\n')
      .filter(Boolean);
  } catch {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        const path = dir ? `${dir}/${entry.name}` : entry.name;
        if (entry.isDirectory() && !SKIPPED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          walk(path);
        } else if (entry.isFile() && entry.name.endsWith('.mdl')) {
          found.push(path);
        }
      }
    };
    walk('');
    return found;
  }
};

const detectRepo = (root: string): Repo | undefined => {
  try {
    const url = execFileSync('git', ['config', '--get', 'remote.origin.url'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const [owner, repo] = parseGitHubRemote(url)?.split('/') ?? [];
    return owner && repo ? { owner, repo } : undefined;
  } catch {
    return undefined;
  }
};

/**
 * A checkout on disk. Spec texts are cached so the index rebuilds from memory on every edit; a watched-file event or
 * a save refreshes one path, and {@link DiskWorkspace.rescan} picks up added and deleted specs.
 */
export class DiskWorkspace implements Workspace {
  readonly repo: Repo | undefined;
  readonly #open = new Map<string, string>();
  readonly #specs = new Map<string, string>();
  #index: SpecIndex | undefined;

  constructor(readonly root: string) {
    this.repo = detectRepo(root);
    this.rescan();
  }

  get index(): SpecIndex {
    this.#index ??= indexSpecs(
      [...this.#specs.keys()]
        .filter(isIndexedSpec)
        .map((path) => ({ path, text: this.#open.get(path) ?? this.#specs.get(path) ?? '' })),
    );
    return this.#index;
  }

  read(path: string): string | undefined {
    const open = this.#open.get(path);
    if (open !== undefined) {
      return open;
    }
    const cached = this.#specs.get(path);
    if (cached !== undefined) {
      return cached;
    }
    const file = join(this.root, ...path.split('/'));
    try {
      return existsSync(file) && statSync(file).isFile() ? readFileSync(file, 'utf8') : undefined;
    } catch {
      return undefined;
    }
  }

  /** An open document's buffer, which shadows the file until it closes. */
  setOpen(path: string, text: string | undefined): void {
    if (text === undefined) {
      this.#open.delete(path);
      this.refresh(path);
    } else {
      this.#open.set(path, text);
      if (path.endsWith('.mdl')) {
        // A new, unsaved spec is indexed from its buffer.
        this.#specs.set(path, this.#specs.get(path) ?? text);
        this.#index = undefined;
      }
    }
  }

  /** Re-reads one spec from disk after it changed, or drops it when it is gone. */
  refresh(path: string): void {
    if (!path.endsWith('.mdl')) {
      return;
    }
    const text = this.#readDisk(path);
    if (text === undefined) {
      this.#specs.delete(path);
    } else {
      this.#specs.set(path, text);
    }
    this.#index = undefined;
  }

  rescan(): void {
    this.#specs.clear();
    for (const path of listSpecs(this.root)) {
      const text = this.#readDisk(path);
      if (text !== undefined) {
        this.#specs.set(path, text);
      }
    }
    this.#index = undefined;
  }

  #readDisk(path: string): string | undefined {
    try {
      return readFileSync(join(this.root, ...path.split('/')), 'utf8');
    } catch {
      return undefined;
    }
  }
}
