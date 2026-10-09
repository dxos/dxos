//
// Copyright 2026 DXOS.org
//

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { type FunctionCost, type Resolve, functionCosts, isCpuProfile } from './profile.ts';

/** A realm as named in a profile file, without the chunk hash, so one worker lines up across two builds. */
export const realmOf = (raw: string): string => raw.replace(/_[A-Za-z0-9_-]{8}_js$/, '');

export type ProfileFile = { stage: string; realm: string; file: string };

/** Every `<stage>-<realm>.cpuprofile` under a results directory's `artifacts/`; stages disambiguate the dashes. */
export const findProfiles = (resultsDir: string, stages: ReadonlyArray<string>): ProfileFile[] => {
  const artifacts = path.join(resultsDir, 'artifacts');
  if (!existsSync(artifacts)) {
    return [];
  }
  const byLength = [...stages].sort((left, right) => right.length - left.length);
  return readdirSync(artifacts).flatMap((run) => {
    const dir = path.join(artifacts, run);
    return readdirSync(dir)
      .filter((name) => name.endsWith('.cpuprofile'))
      .flatMap((name) => {
        const stem = name.slice(0, -'.cpuprofile'.length);
        const stage = byLength.find((candidate) => stem.startsWith(`${candidate}-`));
        return stage ? [{ stage, realm: realmOf(stem.slice(stage.length + 1)), file: path.join(dir, name) }] : [];
      });
  });
};

export const readCosts = (file: string, resolve: Resolve): Map<string, FunctionCost> => {
  const profile: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!isCpuProfile(profile)) {
    throw new Error(`not a CPU profile: ${file}`);
  }
  return functionCosts(profile, resolve);
};

const addInto = (target: Map<string, number>, source: Map<string, number>, scale: number) => {
  for (const [key, value] of source) {
    target.set(key, (target.get(key) ?? 0) + value * scale);
  }
};

/** Each function's cost averaged over profiles of one stage and realm, counting absence as zero. */
export const meanCosts = (profiles: ReadonlyArray<Map<string, FunctionCost>>): Map<string, FunctionCost> => {
  const mean = new Map<string, FunctionCost>();
  const scale = 1 / Math.max(1, profiles.length);
  for (const costs of profiles) {
    for (const cost of costs.values()) {
      const entry = mean.get(cost.key) ?? { ...cost, selfMs: 0, totalMs: 0, callers: new Map(), callees: new Map() };
      entry.selfMs += cost.selfMs * scale;
      entry.totalMs += cost.totalMs * scale;
      addInto(entry.callers, cost.callers, scale);
      addInto(entry.callees, cost.callees, scale);
      mean.set(cost.key, entry);
    }
  }
  return mean;
};

/** One line of a digest: a function's self time in one stage and realm, per arm when comparing. */
export type DigestRow = {
  stage: string;
  realm: string;
  key: string;
  label: string;
  package: string;
  source?: string;
  /** Mean self ms per round; `base` only when comparing. */
  candidate: number;
  base?: number;
};

export type Group = {
  stage: string;
  realm: string;
  base: Map<string, FunctionCost>;
  candidate: Map<string, FunctionCost>;
};

/** Mean costs per stage and realm for each arm, from the results directories of each arm's runs. */
export const groupCosts = (
  arms: {
    base?: { dirs: ReadonlyArray<string>; resolve: Resolve };
    candidate: { dirs: ReadonlyArray<string>; resolve: Resolve };
  },
  stages: ReadonlyArray<string>,
  filter: (stage: string, realm: string) => boolean = () => true,
): Group[] => {
  const collect = (dirs: ReadonlyArray<string>, resolve: Resolve) => {
    const byGroup = new Map<string, Array<Map<string, FunctionCost>>>();
    for (const dir of dirs) {
      for (const { stage, realm, file } of findProfiles(dir, stages)) {
        if (filter(stage, realm)) {
          const group = `${stage}\0${realm}`;
          byGroup.set(group, [...(byGroup.get(group) ?? []), readCosts(file, resolve)]);
        }
      }
    }
    return new Map([...byGroup].map(([group, profiles]) => [group, meanCosts(profiles)]));
  };
  const candidate = collect(arms.candidate.dirs, arms.candidate.resolve);
  const base = arms.base ? collect(arms.base.dirs, arms.base.resolve) : new Map<string, Map<string, FunctionCost>>();
  const groups = new Set([...candidate.keys(), ...base.keys()]);
  return [...groups].map((group) => {
    const [stage, realm] = group.split('\0');
    return { stage, realm, base: base.get(group) ?? new Map(), candidate: candidate.get(group) ?? new Map() };
  });
};

/**
 * The functions worth reading first: by self time for one arm, by the change in self time when
 * comparing. Capped, since the digest exists to fit in a context window.
 */
export const digestRows = (groups: ReadonlyArray<Group>, comparing: boolean, limit: number): DigestRow[] => {
  const rows = groups.flatMap(({ stage, realm, base, candidate }) =>
    [...new Set([...candidate.keys(), ...base.keys()])].map((key) => {
      const cost = candidate.get(key) ?? base.get(key);
      return {
        stage,
        realm,
        key,
        label: cost?.label ?? key,
        package: cost?.package ?? '',
        ...(cost?.source ? { source: cost.source } : {}),
        candidate: candidate.get(key)?.selfMs ?? 0,
        ...(comparing ? { base: base.get(key)?.selfMs ?? 0 } : {}),
      };
    }),
  );
  const weight = (row: DigestRow) => (comparing ? Math.abs(row.candidate - (row.base ?? 0)) : row.candidate);
  return rows.sort((left, right) => weight(right) - weight(left)).slice(0, limit);
};

/**
 * A function's name and file, without line or chunk: a dev server's capture and a production
 * scenario's profiles name the same function the same way only at this grain.
 */
export const functionIdentity = ({ label, source }: Pick<FunctionCost, 'label' | 'source'>): string => {
  const [name, location = ''] = label.split(' ');
  const file = (source ?? location.split(':')[0]).split('/').pop() ?? '';
  return file ? `${name}@${file}` : name;
};

/** The functions with the most self time across every stage and realm, natives and idle frames excluded. */
export const topFunctions = (
  groups: ReadonlyArray<Group>,
  limit: number,
): Array<{ identity: string; selfMs: number }> => {
  const totals = new Map<string, number>();
  for (const { candidate } of groups) {
    for (const cost of candidate.values()) {
      if (cost.label.startsWith('(') || !cost.label.includes(' ')) {
        continue;
      }
      const identity = functionIdentity(cost);
      totals.set(identity, (totals.get(identity) ?? 0) + cost.selfMs);
    }
  }
  return [...totals]
    .map(([identity, selfMs]) => ({ identity, selfMs }))
    .sort((left, right) => right.selfMs - left.selfMs)
    .slice(0, limit);
};
