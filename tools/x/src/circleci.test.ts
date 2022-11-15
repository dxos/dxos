//
// Copyright 2022 DXOS.org
//

/* eslint-disable camelcase */

import { expect } from 'chai';

// TODO(burdon): Disable tests from CI?

// Pipelines (for project (e.g., dxos))
//  -> Workflow (e.g., main)
//    -> Jobs (e.g., 'Spin up environment')

describe('CI tests', function () {
  const config = {
    vcs: 'gh',
    username: 'dxos',
    project: 'dxos'
  };

  const projectSlug = `${config.vcs}/${config.username}/${config.project}`;

  const headers = {
    'Circle-Token': '85b5f69e4bf1abbad3f13a48cf55bc5ad49bb2c8'
  };

  // TODO(burdon): Don't run tests in CI.
  // TODO(burdon): Find broken test and chain together.

  it('gets pipelines', async function () {
    // https://circleci.com/docs/api/v2/index.html#tag/Pipeline
    const endpoint = 'https://circleci.com/api/v2/pipeline';
    const params = new URLSearchParams({ 'org-slug': 'gh/dxos' });
    const url = `${endpoint}?${params.toString()}`;
    const response = await fetch(url, { headers });
    expect(response.status).to.eq(200);
    const { items } = await response.json();
    console.log('pipeline', items[0]);

    // TODO(burdon): Detect if new pipeline.
  });

  it('gets workflows', async function () {
    // https://circleci.com/docs/api/v2/index.html#operation/listWorkflowsByPipelineId
    const endpoint = 'https://circleci.com/api/v2/pipeline';
    const pipelineId = 'ae27ce0c-75a9-4e26-a310-d903b3cea61d';
    const url = `${endpoint}/${pipelineId}/workflow`;
    const response = await fetch(url, { headers });
    expect(response.status).to.eq(200);
    const { items } = await response.json();
    console.log('workflow', items[0]);

    const { status } = items[0];
    expect(status).to.eq('failed');
  });

  it('gets jobs', async function () {
    // https://circleci.com/docs/api/v2/index.html#operation/listWorkflowJobs
    const endpoint = 'https://circleci.com/api/v2/workflow';
    const workflowId = '656b5af0-d453-4b5f-8650-4c37b404e194';
    const url = `${endpoint}/${workflowId}/job`;
    const response = await fetch(url, { headers });
    expect(response.status).to.eq(200);
    const { items } = await response.json();
    console.log('job', items[0]);

    const { status } = items[0];
    expect(status).to.eq('failed');
  });

  // NOTE: Community question: https://discuss.circleci.com/t/downloading-build-logs-with-v2-api/44780
  it.only('gets log', async function () {
    // https://circleci.com/docs/api/v1/index.html#single-job
    const endpoint = 'https://circleci.com/api/v1.1/project';
    const jobNumber = 3378; // NOTE: The terms `job` and `build` are used interchangeably.
    const url = `${endpoint}/${projectSlug}/${jobNumber}`;
    console.log(url);
    const response = await fetch(url, { headers });
    expect(response.status).to.eq(200);
    const results = await response.json();
    const { subject, steps, start_time, stop_time, outcome, fail_reason } = results;
    console.log('job', { subject, start_time, stop_time, outcome, fail_reason });
    console.log();

    // TODO(burdon): Find first action to fail.
    expect(outcome).to.eq('failed');
    for (const step of steps) {
      const { actions } = step;
      for (const action of actions) {
        const { name, status, start_time, end_time, output_url } = action;
        if (status === 'failed') {
          console.log('action', { name, status, start_time, end_time, output_url });

          // Logs.
          const response = await fetch(output_url);
          const data = await response.json();
          const { message, time, type } = data[0];
          console.log('log', { time, type });
          console.log();
          console.log(message);
        }
      }
    }
  });
});
