//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { log } from '@dxos/log';

import { type FileNode, buildFileTree, fileSignature, flattenFiles } from '../components/PullRequestFiles/files.ts';
import { type PatchFile, parsePatch } from '../walkthrough/patch.ts';

export type PullRequestFiles = {
  tree?: FileNode;
  files: PatchFile[];
  /** The file on screen. */
  file?: PatchFile;
  reviewed: ReadonlySet<string>;
  select: (path: string) => void;
  /** Moves to the file `delta` places away in tree order; a no-op past either end. */
  step: (delta: number) => void;
  setReviewed: (path: string, reviewed: boolean) => void;
};

/** Paths the reader checked off, each at the signature of the change they reviewed. */
type ReviewedRecord = Record<string, string>;

const readRecord = (key: string): ReviewedRecord => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : {};
  } catch (error) {
    // Blocked or cleared storage leaves the reader with nothing checked, which is recoverable.
    log.warn('reviewed files unreadable', { error });
    return {};
  }
};

const writeRecord = (key: string, record: ReviewedRecord): void => {
  try {
    localStorage.setItem(key, JSON.stringify(record));
  } catch (error) {
    log.warn('reviewed files not saved', { error });
  }
};

/**
 * A pull request's changed files, the one on screen, and which the reader has reviewed.
 *
 * Reviewed state is the reader's own, so it lives in their browser under `storageKey` rather than in
 * the space. A file is reviewed at the change it had when checked: a push that changes it unchecks
 * it, as GitHub's "Viewed" does.
 */
export const usePullRequestFiles = (diff: string | undefined, storageKey: string): PullRequestFiles => {
  const files = useMemo(() => (diff === undefined ? [] : parsePatch(diff)), [diff]);
  const tree = useMemo(() => (diff === undefined ? undefined : buildFileTree(files)), [diff, files]);
  const order = useMemo(() => (tree ? flattenFiles(tree) : []), [tree]);
  const signatures = useMemo(() => new Map(files.map((file) => [file.path, fileSignature(file)])), [files]);

  const [record, setRecord] = useState<ReviewedRecord>(() => readRecord(storageKey));
  useEffect(() => setRecord(readRecord(storageKey)), [storageKey]);

  const reviewed = useMemo(
    () => new Set(Object.keys(record).filter((path) => signatures.get(path) === record[path])),
    [record, signatures],
  );

  const setReviewed = useCallback(
    (path: string, value: boolean) => {
      setRecord((previous) => {
        const next = { ...previous };
        const signature = signatures.get(path);
        if (value && signature) {
          next[path] = signature;
        } else {
          delete next[path];
        }
        writeRecord(storageKey, next);
        return next;
      });
    },
    [signatures, storageKey],
  );

  const [selected, setSelected] = useState<string>();
  const file = order.find((candidate) => candidate.path === selected) ?? order[0];
  const step = useCallback(
    (delta: number) => {
      const index = order.findIndex((candidate) => candidate.path === file?.path);
      const next = order[index + delta];
      if (next) {
        setSelected(next.path);
      }
    },
    [order, file],
  );

  return { tree, files, file, reviewed, select: setSelected, step, setReviewed };
};
