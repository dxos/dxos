//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Skill from '@dxos/compute/Skill';
import { Obj } from '@dxos/echo';

import { BrainSkill } from '#skills';

import { ANALYSES, DECK, makeProject } from './community-findings.ts';

describe('community findings project template', () => {
  test('scaffolds five analyses and a deck that waits for them, with no artifacts', ({ expect }) => {
    const project = makeProject();
    const tasks = (project.taskSet?.target?.tasks ?? []).map((ref) => ref.target);

    expect(tasks.map((task) => task?.title)).toEqual([...ANALYSES, DECK].map(({ title }) => title));
    expect(tasks.every((task) => task?.status === 'todo' && (task.artifacts ?? []).length === 0)).toBe(true);
    expect(project.artifacts).toHaveLength(0);

    // Only the deck waits, and it waits for every analysis.
    const deck = tasks.at(-1);
    const analyses = tasks.slice(0, -1);
    expect(deck?.dependsOn?.map((ref) => ref.target?.id).sort()).toEqual(analyses.map((task) => task?.id).sort());
    expect(analyses.every((task) => (task?.dependsOn ?? []).length === 0)).toBe(true);
    expect(tasks.every((task) => task && Obj.getParent(task) === project.taskSet?.target)).toBe(true);
  });

  test('binds the Brain skill to the project instructions', ({ expect }) => {
    const project = makeProject('Cloudflare community');
    expect(project.name).toBe('Cloudflare community');
    const skills = project.instructions?.target?.skills.map((ref) => ref.uri) ?? [];
    expect(skills).toContain(Skill.registryURI(BrainSkill.key));
  });
});
