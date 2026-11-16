//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import LAUNCH_VIDEO from '../../../../../reflect/deus/lang/examples/launch-video.mdl?raw';
import { specDeclarations } from './declarations.ts';
import { UNSHARED_CLUSTER_ID, clusterBlocks, groupDefinitions, rolesOf } from './definition-groups.ts';
import { type BuildDefinitionGraphOptions, buildDefinitionGraph } from './spec-model.ts';

/** The graph of a spec read in the software dialect, as plugin-code reads its own specs. */
const softwareGraph = (text: string, options: BuildDefinitionGraphOptions = {}) =>
  buildDefinitionGraph(text, { declarations: specDeclarations(text, ['org.dxos.spec.software']), ...options });

const block = (...lines: string[]) => ['```mdl', ...lines, '```'];

const SPEC = [
  ...block('type Project'),
  ...block('type File', '  fields:', '    project: Ref<Project>'),
  ...block('type Theme'),
  ...block('op build: Builds a project.', '  input: { project: Ref<Project> }'),
  ...block('op lint: Lints a file.', '  input: { file: Ref<File> }'),
  ...block('feat F-1: Build', '  uses: [build, Project]', '  req F-1.1: op:build compiles a Project.'),
  ...block('feat F-2: Lint', '  uses: [File, lint, Project]', '  req F-2.1: op:lint checks each File of a Project.'),
  ...block('feat F-3: Watch', '  depends: [F-1]', '  req F-3.1: Rebuilds on save, as F-1 does.'),
  ...block('scenario T-1: Build runs', '  covers: [build]', '  when: op:build is invoked', '  then: it succeeds'),
].join('\n');

const graph = softwareGraph(SPEC);

describe('definition groups', () => {
  test("takes each kind's role from its dialect, and from the spec's own ext over it", ({ expect }) => {
    const roles = rolesOf(graph);
    expect([roles.get('feat'), roles.get('scenario'), roles.get('type')]).toEqual([
      'anchor',
      'verification',
      'structure',
    ]);
    const declared = [SPEC, ...block('ext type', '  uri: org.dxos.mdl.type@1.0', '  role: anchor')].join('\n');
    expect(rolesOf(softwareGraph(declared)).get('type')).toBe('anchor');
  });

  test('groups each anchor with what it names, owned or shared, and clusters groups on what they share', ({
    expect,
  }) => {
    const { groups, clusters, ungrouped } = groupDefinitions(graph);
    const byId = new Map(groups.map((group) => [group.id, group]));
    expect(byId.get('F-1')).toMatchObject({ owned: ['build'], shared: ['Project'], verifiedBy: ['T-1'] });
    expect(byId.get('F-2')).toMatchObject({ owned: ['File', 'lint'], shared: ['Project'] });
    expect(byId.get('F-3')).toMatchObject({ owned: [], shared: [], buildsOn: ['F-1'] });
    // F-3 shares nothing, so it joins the cluster of the feature it builds on.
    expect(clusters.map(({ hub, groups, shared }) => ({ hub, groups, shared }))).toEqual([
      { hub: 'Project', groups: ['F-1', 'F-2', 'F-3'], shared: ['Project'] },
    ]);
    expect(ungrouped).toEqual(['Theme']);
  });

  test('breaks a hub tie by declaration order, whatever order an anchor names the blocks in', ({ expect }) => {
    const { clusters } = groupDefinitions(
      softwareGraph(
        [
          ...block('type A'),
          ...block('type B'),
          ...block('feat F-1: One', '  uses: [B, A]'),
          ...block('feat F-2: Two', '  uses: [A, B]'),
        ].join('\n'),
      ),
    );
    expect(clusters.map(({ hub, groups }) => ({ hub, groups }))).toEqual([{ hub: 'A', groups: ['F-1', 'F-2'] }]);
  });

  test('a group that shares nothing takes a hub through the anchors it builds on, in any declaration order', ({
    expect,
  }) => {
    const { clusters } = groupDefinitions(
      softwareGraph(
        [
          ...block('type A'),
          ...block('feat F-1: One', '  uses: [A]'),
          ...block('feat F-2: Two', '  uses: [A]'),
          ...block('feat F-3: Three', '  depends: [F-4]'),
          ...block('feat F-4: Four', '  depends: [F-1]'),
        ].join('\n'),
      ),
    );
    expect(clusters.map(({ hub, groups }) => ({ hub, groups }))).toEqual([
      { hub: 'A', groups: ['F-1', 'F-2', 'F-3', 'F-4'] },
    ]);
  });

  test('a group that builds on several anchors takes the hub of the nearest, before declaration order', ({
    expect,
  }) => {
    const { clusters } = groupDefinitions(
      softwareGraph(
        [
          ...block('type A'),
          ...block('type C'),
          ...block('feat F-1: One', '  depends: [F-4]'),
          ...block('feat F-2: Two', '  uses: [C]'),
          ...block('feat F-3: Three', '  uses: [C]'),
          ...block('feat F-4: Four', '  uses: [A]'),
          ...block('feat F-5: Five', '  uses: [A]'),
          ...block('feat F-6: Six', '  depends: [F-1, F-2]'),
        ].join('\n'),
      ),
    );
    expect(clusters.find(({ groups }) => groups.includes('F-6'))?.hub).toBe('C');
  });

  test('a context block named by groups in several clusters sits in one, and its links count', ({ expect }) => {
    const grouping = groupDefinitions(
      softwareGraph(
        [
          ...block('ext dep', '  uri: org.dxos.mdl.dep@1.0', '  desc: A library.', '  role: context'),
          ...block('dep Lib'),
          ...block('type X'),
          ...block('type Y'),
          ...block('feat F-1: One', '  uses: [X, Lib]'),
          ...block('feat F-2: Two', '  uses: [X]'),
          ...block('feat F-3: Three', '  uses: [Y, Lib]'),
          ...block('feat F-4: Four', '  uses: [Y]'),
        ].join('\n'),
      ),
    );
    expect(grouping.links).toContainEqual({ from: 'cluster:Y', to: 'cluster:X', count: 1 });
    expect(grouping.homeOf.get('Lib')).toBe('cluster:X');
    expect(clusterBlocks(grouping, 'cluster:X')).toContain('Lib');
    expect(clusterBlocks(grouping, 'cluster:Y')).not.toContain('Lib');
    expect(clusterBlocks(grouping, 'cluster:Y')).not.toContain('X');
  });

  test('groups a spec with no anchors around its root structure', ({ expect }) => {
    const { groups, clusters } = groupDefinitions(
      softwareGraph(
        [...block('type Project'), ...block('type File', '  fields:', '    project: Ref<Project>')].join('\n'),
      ),
    );
    expect(groups.map(({ id, owned }) => ({ id, owned }))).toEqual([{ id: 'File', owned: ['Project'] }]);
    expect(clusters.map(({ id }) => id)).toEqual([UNSHARED_CLUSTER_ID]);
  });

  test('groups a spec in another dialect by the roles and links it declares', ({ expect }) => {
    const { groups, clusters } = groupDefinitions(buildDefinitionGraph(LAUNCH_VIDEO));
    // Each scene is an anchor that composes its shots, voiceover and captions, which name it as `part-of`.
    expect(groups.find(({ id }) => id === 'SC-2')).toMatchObject({
      owned: expect.arrayContaining(['SH-2', 'SH-3', 'VO-1', 'CA-1']),
      buildsOn: ['SC-1'],
      verifiedBy: ['SN-1', 'SN-2'],
    });
    expect(clusters.map(({ hub, groups }) => ({ hub, groups }))).toEqual([
      { hub: 'maya', groups: ['SC-1', 'SC-2', 'SC-3'] },
      { hub: 'narrator', groups: ['SC-4'] },
    ]);
  });
});
