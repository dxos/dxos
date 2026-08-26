//
// Copyright 2025 DXOS.org
//

import { FileSystemCapabilities } from '#types';

/** Collect all markdown file ids from a tree of entries. */
export const collectMarkdownFileIds = (entries: FileSystemCapabilities.FileSystemEntry[]): string[] => {
  const ids: string[] = [];
  for (const entry of entries) {
    if ('children' in entry) {
      ids.push(...collectMarkdownFileIds(entry.children));
    } else if (FileSystemCapabilities.isFileSystemFile(entry) && entry.type === 'markdown') {
      ids.push(entry.id);
    }
  }
  return ids;
};

/** Collect all markdown files from a tree of entries. */
export const collectMarkdownFiles = (
  entries: FileSystemCapabilities.FileSystemEntry[],
): FileSystemCapabilities.FileSystemFile[] => {
  const files: FileSystemCapabilities.FileSystemFile[] = [];
  for (const entry of entries) {
    if ('children' in entry) {
      files.push(...collectMarkdownFiles(entry.children));
    } else if (FileSystemCapabilities.isFileSystemFile(entry) && entry.type === 'markdown') {
      files.push(entry);
    }
  }
  return files;
};

/** Compute a relative path from a workspace root. */
export const relativePath = (workspacePath: string, filePath: string): string => {
  const prefix = workspacePath.endsWith('/') ? workspacePath : workspacePath + '/';
  return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath;
};
