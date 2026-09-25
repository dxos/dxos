//
// Copyright 2026 DXOS.org
//

import { type PatchFile, renderHunks } from '../../walkthrough/patch.ts';

/** A node of the changed-file tree: a directory (with children) or a changed file (with its patch). */
export type FileNode = {
  /**
   * A generated id rather than the path: the tree joins ids into row paths with a separator a file
   * name may itself contain (`+page.svelte`).
   */
  id: string;
  /** The full path of the file or directory; the synthetic root's is empty. */
  path: string;
  /** What the row shows: a base name, or a run of directories that each hold only one child. */
  name: string;
  file?: PatchFile;
  children: FileNode[];
  added: number;
  removed: number;
};

/** Id of the synthetic root the tree model anchors its top-level rows to; never rendered. */
export const FILE_TREE_ROOT = 'root';

/**
 * The changed files as a directory tree, directories before files and each alphabetical — the order
 * GitHub's own file tree uses. A directory whose only child is another directory is folded into one
 * row (`src/components`), since a chain of single-entry folders is depth without information.
 */
export const buildFileTree = (files: readonly PatchFile[]): FileNode => {
  let count = 0;
  const nextId = () => `node-${++count}`;
  const root: FileNode = { id: FILE_TREE_ROOT, path: '', name: '', children: [], added: 0, removed: 0 };
  for (const file of files) {
    const segments = file.path.split('/');
    let parent = root;
    for (let index = 0; index < segments.length - 1; index++) {
      const path = segments.slice(0, index + 1).join('/');
      let directory = parent.children.find((child) => child.path === path);
      if (!directory) {
        directory = { id: nextId(), path, name: segments[index], children: [], added: 0, removed: 0 };
        parent.children.push(directory);
      }
      parent = directory;
    }
    parent.children.push({
      id: nextId(),
      path: file.path,
      name: segments.at(-1) ?? file.path,
      file,
      children: [],
      added: file.added,
      removed: file.removed,
    });
  }

  const finish = (node: FileNode): FileNode => {
    const children = node.children.map(finish).sort(compareNodes);
    let folded: FileNode = {
      ...node,
      children,
      added: node.file ? node.added : children.reduce((sum, child) => sum + child.added, 0),
      removed: node.file ? node.removed : children.reduce((sum, child) => sum + child.removed, 0),
    };
    while (folded !== root && !folded.file && folded.children.length === 1 && !folded.children[0].file) {
      const [only] = folded.children;
      folded = { ...only, name: `${folded.name}/${only.name}` };
    }
    return folded;
  };

  return finish(root);
};

const compareNodes = (left: FileNode, right: FileNode): number =>
  Number(!!left.file) - Number(!!right.file) || left.name.localeCompare(right.name);

/** The files in the order the tree lists them, which is the order previous/next walks. */
export const flattenFiles = (node: FileNode): PatchFile[] =>
  node.file ? [node.file] : node.children.flatMap(flattenFiles);

/**
 * One file's change as the ```diff fence the walkthrough renders, so the files view shows a file
 * exactly as a walkthrough chunk would. The fence is one backtick longer than any run in the body:
 * a context line of a markdown file can itself be a fence, which would otherwise close this one.
 */
export const diffFence = (file: PatchFile): string => {
  const body = renderHunks(file.hunks);
  const longest = Math.max(0, ...(body.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}diff file=${file.path}\n${body}\n${fence}`;
};

/**
 * A short digest of a file's change. A file is reviewed at a signature: when a push changes the
 * file its signature moves and the check falls away, as GitHub's "Viewed" does.
 */
export const fileSignature = (file: PatchFile): string => {
  // FNV-1a over the hunk text; collisions only cost a stale check, never correctness.
  let hash = 0x811c9dc5;
  for (const hunk of file.hunks) {
    for (const line of [hunk.header, ...hunk.lines]) {
      for (let index = 0; index < line.length; index++) {
        hash ^= line.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
      }
      hash ^= 10;
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return (hash >>> 0).toString(36);
};
