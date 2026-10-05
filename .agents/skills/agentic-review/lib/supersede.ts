//
// Copyright 2026 DXOS.org
//

// A PR keeps one review store: a fresh `fast.ts` run reviews the whole PR diff, inherits the
// statuses the PR's earlier stores already settled, and replaces them.

import { readFileSync, writeFileSync } from 'node:fs';

import { type ResolutionEntry, type ResolutionStatus, STATUSES } from './resolution.ts';

const fileOf = (location: string): string => location.replace(/(:\d+){1,2}$/, '');

/**
 * Statuses to carry from prior index rows onto `next` rows, keyed by the next row's id: a row
 * matches on rule and exact location, else on rule and file when that pair is unique on both
 * sides (the code above it moved). Only settled statuses carry, so a stale `unresolved` never
 * masks a row the new run raised again.
 */
export const carryStatuses = (prior: ResolutionEntry[], next: ResolutionEntry[]): Map<string, ResolutionStatus> => {
  const settled = prior.filter((entry) => entry.status !== 'unresolved' && entry.ruleId && entry.location);
  const statuses = new Map<string, ResolutionStatus>();
  const used = new Set<ResolutionEntry>();
  for (const entry of next) {
    const match = settled.find(
      (candidate) => !used.has(candidate) && candidate.ruleId === entry.ruleId && candidate.location === entry.location,
    );
    if (match) {
      used.add(match);
      statuses.set(entry.id, match.status);
    }
  }
  const byRuleFile = <T extends ResolutionEntry>(entries: T[], entry: ResolutionEntry): T[] =>
    entries.filter(
      (candidate) =>
        candidate.ruleId === entry.ruleId && fileOf(candidate.location ?? '') === fileOf(entry.location ?? ''),
    );
  for (const entry of next) {
    if (statuses.has(entry.id) || !entry.location) {
      continue;
    }
    const candidates = byRuleFile(
      settled.filter((candidate) => !used.has(candidate)),
      entry,
    );
    const peers = byRuleFile(
      next.filter((peer) => !statuses.has(peer.id)),
      entry,
    );
    if (candidates.length === 1 && peers.length === 1) {
      used.add(candidates[0]);
      statuses.set(entry.id, candidates[0].status);
    }
  }
  return statuses;
};

const ROW_RE = new RegExp(`^(\\s*-\\s+\`?)([A-Za-z0-9._]+-\\d+)(\`?\\s*-\\s*)(${STATUSES.join('|')})(\\s*-.*)$`, 'i');

/** Set the given rows' statuses in the `## Index` of the REVIEW.md at `path`, leaving every other line alone. */
export const applyStatuses = (path: string, statuses: Map<string, ResolutionStatus>): void => {
  if (statuses.size === 0) {
    return;
  }
  let inIndex = false;
  const lines = readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => {
      if (/^## /.test(line)) {
        inIndex = /^## Index\s*$/.test(line);
        return line;
      }
      const match = inIndex ? line.match(ROW_RE) : null;
      const status = match ? statuses.get(match[2]) : undefined;
      return match && status ? `${match[1]}${match[2]}${match[3]}${status}${match[5]}` : line;
    });
  writeFileSync(path, lines.join('\n'));
};
