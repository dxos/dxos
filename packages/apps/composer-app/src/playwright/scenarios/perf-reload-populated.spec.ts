//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { type SpaceId } from '@dxos/keys';

import { SCALE, createProjectsFixture, scaleLabel } from '../perf/fixture.ts';
import { describeReplication, waitForReplication } from '../perf/replication.ts';
import { defineScenario, invokeInPage, waitForReady } from '../perf/scenario.ts';

/** Restated from `@dxos/compute`, whose module graph does not load under Playwright. */
const PROJECT_TYPENAME = 'org.dxos.type.project';

const projectPath = (spaceId: string, projectId: string): string =>
  GraphPath.getSpacePath(spaceId, GraphPath.GroupSegments.ai, PROJECT_TYPENAME, projectId);

let opened: { spaceId: SpaceId; projectId: string } | undefined;

// `pnpm perf run --scenario reload-populated` runs it; `pnpm perf scenario check reload-populated` proves it.
defineScenario({
  flow: 'reload-populated',
  reproduces:
    'After Composer reloads with a populated space open, small index queries for the visible plank wait 13 to 24 s on the dedicated worker (App Performance, 2026-10-08 debug session).',
  scale: scaleLabel(SCALE),
  // The projects fixture (~700 ms a task), replication, and the stages.
  timeoutMs: SCALE.tasks * 700 + 600_000,
  navigates: true,
  fixture: async ({ page, runId, budget }) => {
    const fixture = await createProjectsFixture(page, SCALE, runId);
    const replication = await waitForReplication(page, fixture.spaceId, { timeoutMs: 180_000 });
    if (replication.outcome === 'timeout') {
      throw new Error(describeReplication(replication));
    }
    opened = { spaceId: fixture.spaceId, projectId: fixture.projectIds[0] };
    // The state the report reloaded from: the space open, a project plank showing its tasks.
    await invokeInPage(page, 'org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${fixture.spaceId}` });
    await page.waitForURL(new RegExp(`/w/${fixture.spaceId}`), { timeout: budget });
    await invokeInPage(page, 'org.dxos.operation.appToolkit.open', {
      subject: [projectPath(fixture.spaceId, fixture.projectIds[0])],
    });
    await page.getByTestId('projectsPlugin.tab.tasks').click({ timeout: budget });
    await page.getByTestId('taskList.item').first().waitFor({ timeout: budget });
  },
  stages: async ({ page, stage, budget }) => {
    if (!opened) {
      throw new Error('fixture did not open a project');
    }
    const { spaceId, projectId } = opened;

    await stage('reload', async () => {
      await page.reload({ timeout: 120_000 });
      await waitForReady(page);
    });

    // The report's symptom: after mount, the visible plank's first queries wait on the worker.
    await stage('first-answer', async () => {
      await invokeInPage(page, 'org.dxos.operation.appToolkit.open', { subject: [projectPath(spaceId, projectId)] });
      await page.getByTestId('projectsPlugin.tab.tasks').click({ timeout: budget });
      await page.getByTestId('taskList.item').first().waitFor({ timeout: budget });
    });

    // The report's stalls continued after mount; this window's worker CPU and lag land here.
    await stage('after-reload', async () => {
      await page.waitForTimeout(10_000);
    });
  },
});
