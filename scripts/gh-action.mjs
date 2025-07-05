#!/usr/bin/env node

import { Octokit } from '@octokit/rest';
import { item } from '@1password/op-js';
import chalk from 'chalk';
import chalkTable from 'chalk-table';
import yargs from 'yargs';

const OP_GITHUB_ITEM = 'GitHub';
const OP_GITHUB_FIELD = 'credential';

const PERIOD = 12 * 60 * 60 * 1000;

const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY ?? 'dxos/dxos';

// TODO(burdon): Yargs.

const argv = yargs(process.argv.slice(2))
  .option('period', {
    type: 'number',
    default: PERIOD,
    description: 'Period in milliseconds',
  })
  .option('watch', {
    type: 'boolean',
    default: false,
    description: 'Watch and poll for updates',
  })
  .option('interval', {
    type: 'number',
    default: 3_000,
    description: 'Polling interval in milliseconds',
  }).argv;

const command = argv._[0];

switch (command) {
  case 'list':
  default: {
    if (argv.watch) {
      while (true) {
        const data = await listActions(true);
        const failure = data.find((run) => run.conclusion === 'failure' || run.conclusion === 'failed');
        if (failure) {
          console.log(JSON.stringify(Object.keys(failure), null, 2));
          await printReport(failure.run_number);
          // await printLog(fail.run_number);
          process.exit(1);
        }

        await new Promise((r) => setTimeout(r, argv.interval));
      }
    } else {
      await listActions();
    }
    break;
  }
}

/**
 * List GH actions.
 */
async function listActions(watch = false) {
  const { octokit, owner, repo } = getOctokit();

  try {
    const { data } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      actor: process.env.GITHUB_ACTOR,
      created: `>${new Date(Date.now() - PERIOD).toISOString()}`,
    });
    if (data.workflow_runs.length === 0) {
      console.log('No workflow runs found.');
      return;
    }

    // Output as chalk table
    const tableData = data.workflow_runs.map((run) => ({
      Number: chalk.cyan(run.run_number),
      Name: run.name,
      Status: run.status === 'completed' ? chalk.yellow(run.status) : run.status,
      Conclusion:
        run.conclusion === 'failure' || run.conclusion === 'failed'
          ? chalk.red(run.conclusion)
          : chalk.green(run.conclusion),
      URL: chalk.blue(run.html_url),
    }));

    const tableOptions = {
      columns: [
        { field: 'Number', name: 'Number' },
        { field: 'Name', name: 'Name' },
        { field: 'Status', name: 'Status' },
        { field: 'Conclusion', name: 'Conclusion' },
        { field: 'URL', name: 'URL' },
      ],
    };

    if (watch) {
      console.clear();
    }
    console.log(chalkTable(tableOptions, tableData));
    return data.workflow_runs;
  } catch (err) {
    console.error('Failed to fetch workflow runs:', err);
    process.exit(1);
  }
}

async function printReport(runNumber) {
  const { octokit, owner, repo } = getOctokit();

  // Find the workflow run by run_number.
  // const {
  //   data: { workflow_runs },
  // } = await octokit.actions.listWorkflowRunsForRepo({ owner, repo });
  // const run = workflow_runs.find((r) => r.run_number === runNumber);
  // if (!run) {
  //   console.error(chalk.red(`No workflow run found for run_number: ${runNumber}`));
  //   return;
  // }

  // List artifacts for the workflow run.
  console.log('Getting job: ', runNumber);
  const {
    data: { artifacts },
  } = await octokit.actions.listWorkflowRunArtifacts({ owner, repo, run_id: runNumber });
  console.log(artifacts);
  const artifact = artifacts.find((a) => a.name.includes('results'));
  if (!artifact) {
    console.error(chalk.red('No results artifact found.'));
    return;
  }

  // Download the artifact zip.
  const { url } = await octokit.actions.downloadArtifact({
    owner,
    repo,
    artifact_id: artifact.id,
    archive_format: 'zip',
  });
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  console.log(buffer);

  // Extract the results.json file
  // const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-'));
  // const zipPath = path.join(tmpDir, 'artifact.zip');
  // fs.writeFileSync(zipPath, buffer);
  // const zip = new AdmZip(zipPath);
  // const targetPath = '__w/dxos/dxos/test-results/packages/plugins/plugin-sheet/results.json';
  // const entry = zip.getEntry(targetPath);
  // if (!entry) {
  //   console.error(chalk.red(`results.json not found in artifact zip at ${targetPath}`));
  //   return;
  // }
  // const json = JSON.parse(zip.readAsText(entry));
  // console.log(chalk.green('results.json contents:'), json);
}

async function printLog(runNumber) {
  const { octokit, owner, repo } = getOctokit();

  // Find the workflow run by run_number
  const {
    data: { workflow_runs },
  } = await octokit.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 100 });
  const run = workflow_runs.find((r) => r.run_number === runNumber);
  if (!run) {
    console.error(chalk.red(`No workflow run found for run_number: ${runNumber}`));
    return;
  }

  // Get jobs for the workflow run
  const {
    data: { jobs },
  } = await octokit.actions.listJobsForWorkflowRun({ owner, repo, run_id: run.id });
  for (const job of jobs) {
    console.log(chalk.bold(`\nJob: ${job.name}`));
    // Get the log for this job
    const { url } = await octokit.actions.downloadJobLogsForWorkflowRun({ owner, repo, job_id: job.id });
    // Fetch log content from the URL
    const res = await fetch(url);
    const log = await res.text();
    console.log(log);
  }
}

function getOctokit() {
  const token = getGithubToken();
  const [owner, repo] = GITHUB_REPOSITORY.split('/');
  if (!token || !owner || !repo) {
    console.error('Missing GITHUB_TOKEN or GITHUB_REPOSITORY environment variables.');
    process.exit(1);
  }

  return { octokit: new Octokit({ auth: token }), owner, repo };
}

/**
 * https://github.com/settings/apps
 */
function getGithubToken() {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }

  try {
    const token = item.get(OP_GITHUB_ITEM);
    const field = token?.fields.find((f) => f.label === OP_GITHUB_FIELD);
    return field?.value;
  } catch (err) {
    console.error('Failed to fetch GITHUB_TOKEN from 1Password:', err.message);
    process.exit(1);
  }
}
