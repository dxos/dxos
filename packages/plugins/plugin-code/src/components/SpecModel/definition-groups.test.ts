//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { UNSHARED_CLUSTER_ID, groupDefinitions, rolesOf } from './definition-groups.ts';
import { buildDefinitionGraph } from './spec-model.ts';

const block = (...lines: string[]) => ['```mdl', ...lines, '```'];

const SPEC = [
  ...block('type Project'),
  ...block('type File', '  fields:', '    project: Ref<Project>'),
  ...block('type Theme'),
  ...block('op build: Builds a project.', '  input: { project: Ref<Project> }'),
  ...block('op lint: Lints a file.', '  input: { file: Ref<File> }'),
  ...block('feat F-1: Build', '  req F-1.1: op:build compiles a Project.'),
  ...block('feat F-2: Lint', '  req F-2.1: op:lint checks each File of a Project.'),
  ...block('feat F-3: Watch', '  req F-3.1: Rebuilds on save, as F-1 does.'),
  ...block('scenario T-1: Build runs', '  when: op:build is invoked', '  then: it succeeds'),
].join('\n');

const graph = buildDefinitionGraph(SPEC);

describe('definition groups', () => {
  test('takes features as anchors and scenarios as checks unless the spec declares otherwise', ({ expect }) => {
    const roles = rolesOf(graph);
    expect([roles.get('feat'), roles.get('scenario'), roles.get('type')]).toEqual([
      'anchor',
      'verification',
      'structure',
    ]);
    expect(rolesOf(graph, { type: 'anchor' }).get('type')).toBe('anchor');
  });

  test('groups each anchor with what it names, owned or shared, and clusters groups on what they share', ({
    expect,
  }) => {
    const { groups, clusters, ungrouped } = groupDefinitions(graph);
    const byId = new Map(groups.map((group) => [group.id, group]));
    expect(byId.get('F-1')).toMatchObject({ owned: ['build'], shared: ['Project'], verifiedBy: ['T-1'] });
    expect(byId.get('F-2')).toMatchObject({ owned: ['lint', 'File'], shared: ['Project'] });
    expect(byId.get('F-3')).toMatchObject({ owned: [], shared: [], buildsOn: ['F-1'] });
    // F-3 shares nothing, so it joins the cluster of the feature it builds on.
    expect(clusters.map(({ hub, groups, shared }) => ({ hub, groups, shared }))).toEqual([
      { hub: 'Project', groups: ['F-1', 'F-2', 'F-3'], shared: ['Project'] },
    ]);
    expect(ungrouped).toEqual(['Theme']);
  });

  test('groups a spec with no anchors around its root structure', ({ expect }) => {
    const { groups, clusters } = groupDefinitions(
      buildDefinitionGraph(
        [...block('type Project'), ...block('type File', '  fields:', '    project: Ref<Project>')].join('\n'),
      ),
    );
    expect(groups.map(({ id, owned }) => ({ id, owned }))).toEqual([{ id: 'File', owned: ['Project'] }]);
    expect(clusters.map(({ id }) => id)).toEqual([UNSHARED_CLUSTER_ID]);
  });
});
