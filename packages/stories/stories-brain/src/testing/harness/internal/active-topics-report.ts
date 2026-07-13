//
// Copyright 2026 DXOS.org
//

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { type ActiveTopic, type ActiveTopicsResult, populatedChecklist, topicSlug } from './active-topics';

// Morning-review artifacts for the Active Topics experiment (spec 2026-07-13). The string renderers
// are pure (unit-tested); `writeActiveTopicsReports` performs the filesystem writes.

const check = (value: boolean): string => (value ? '✓' : '✗');

const pct = (value: number): string => `${Math.round(value * 100)}%`;

/** The `index.md` overview: active + suggested tables with confidence, rationale, and a field checklist. */
export const renderIndex = ({ active, suggested }: ActiveTopicsResult): string => {
  const lines: string[] = ['# Active Topics', ''];

  lines.push(`## Active (${active.length})`, '');
  if (active.length === 0) {
    lines.push('_None cleared the activity threshold._', '');
  } else {
    lines.push('| Topic | Confidence | Status | Facts | Tasks | Drafts | Why |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const topic of active) {
      const done = populatedChecklist(topic);
      lines.push(
        `| [${topic.label}](${topicSlug(topic.label)}.md) | ${pct(topic.confidence)} | ${check(done.status)} | ${check(done.facts)} | ${check(done.tasks)} | ${check(done.drafts)} | ${topic.rationale} |`,
      );
    }
    lines.push('');
  }

  lines.push(`## Suggested (${suggested.length})`, '');
  if (suggested.length === 0) {
    lines.push('_No lower-confidence suggestions._', '');
  } else {
    lines.push('| Topic | Confidence | Threads | Participants | Why |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const topic of suggested) {
      lines.push(
        `| ${topic.label} | ${pct(topic.confidence)} | ${topic.threadCount} | ${topic.participantCount} | ${topic.rationale} |`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
};

/** A per-active-topic report: status · threads · task outline · facts · drafts. */
export const renderTopicReport = (topic: ActiveTopic): string => {
  const lines: string[] = [`# ${topic.label}`, '', `_Confidence ${pct(topic.confidence)} — ${topic.rationale}_`, ''];

  lines.push('## Status', '', topic.status.trim().length > 0 ? topic.status.trim() : '_(none)_', '');

  lines.push('## Threads', '');
  lines.push(...(topic.threadIds.length > 0 ? topic.threadIds.map((thread) => `- ${thread}`) : ['_(none)_']));
  lines.push('', `Participants: ${topic.participants.length > 0 ? topic.participants.join(', ') : '_(none)_'}`, '');

  const tasks = (topic.tasks.content.target?.content ?? '').trim();
  lines.push('## Tasks', '', tasks.length > 0 ? tasks : '_(none)_', '');

  lines.push('## Facts', '');
  lines.push(...(topic.facts.length > 0 ? topic.facts.map((fact) => `- ${fact}`) : ['_(none)_']));
  lines.push('');

  lines.push('## Draft responses', '');
  if (topic.drafts.length === 0) {
    lines.push('_(none)_', '');
  } else {
    for (const { threadId, draft } of topic.drafts) {
      lines.push(`### ${threadId}`, '', draft.trim(), '');
    }
  }

  return lines.join('\n');
};

/** JSON-serializable view (inlines each Outline's Text content). */
export const serializeActiveTopics = ({ active, suggested }: ActiveTopicsResult) => ({
  active: active.map((topic) => ({
    label: topic.label,
    summary: topic.summary,
    threadIds: [...topic.threadIds],
    participants: [...topic.participants],
    keywords: [...topic.keywords],
    status: topic.status,
    facts: [...topic.facts],
    tasks: topic.tasks.content.target?.content ?? '',
    drafts: topic.drafts.map((entry) => ({ ...entry })),
    confidence: topic.confidence,
    rationale: topic.rationale,
    kind: topic.kind,
  })),
  suggested: suggested.map((topic) => ({ ...topic })),
});

/** Writes `index.md`, one `<slug>.md` per active topic, and `active-topics.json` into `dir`. */
export const writeActiveTopicsReports = (dir: string, result: ActiveTopicsResult): void => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.md'), renderIndex(result));
  for (const topic of result.active) {
    writeFileSync(join(dir, `${topicSlug(topic.label)}.md`), renderTopicReport(topic));
  }
  writeFileSync(join(dir, 'active-topics.json'), JSON.stringify(serializeActiveTopics(result), null, 2));
};
