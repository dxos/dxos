#!/usr/bin/env node

import { Octokit } from '@octokit/rest';
import { item } from '@1password/op-js';
import AdmZip from 'adm-zip';
import chalk from 'chalk';
import Table from 'cli-table3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import yargs from 'yargs';

const OP_GITHUB_ITEM = 'GitHub';
const OP_GITHUB_FIELD = 'credential';

const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY ?? 'dxos/dxos';

// TODO(burdon): Yargs.

const argv = yargs(process.argv.slice(2))
  .option('period', {
    type: 'number',
    default: 12 * 60 * 60 * 1000,
    description: 'Period in milliseconds',
  })
  .option('filter', {
    type: 'string',
    default: 'Check BuildJet',
    description: 'Job name',
  })
  .option('all', {
    type: 'boolean',
    default: false,
    description: 'List all jobs (not only failures)',
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
        const data = await listWorkflowRunsForRepo(true);
        const failure = data.find((run) => run.conclusion === 'failure' || run.conclusion === 'failed');
        // if (failure) {
        // await printReport(failure.run_number);
        // await printLog(fail.run_number);
        await showWorkflowRunReport(16083842073);
        process.exit(1);
        // }

        await new Promise((r) => setTimeout(r, argv.interval));
      }
    } else {
      await listWorkflowRunsForRepo();
    }
    break;
  }
}

/**
 * List GH actions.
 */
async function listWorkflowRunsForRepo(watch = false) {
  try {
    const { octokit, owner, repo } = getOctokit();
    const {
      data: { workflow_runs },
    } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      actor: process.env.GITHUB_ACTOR,
      created: `>${new Date(Date.now() - argv.period).toISOString()}`,
      name: argv.filter,
    });
    if (workflow_runs.length === 0) {
      console.log('No workflow runs found.');
      return;
    }

    // Output as cli-table3
    const table = new Table({
      head: ['Number', 'Name', 'Created', 'Duration', 'Status', 'Conclusion', 'URL'],
      style: { head: ['gray'], compact: true },
    });

    const tableRows = workflow_runs
      .filter((run) => !argv.filter || run.name === argv.filter)
      .map((run) => {
        const created = new Date(run.created_at);
        const updated = new Date(run.updated_at);
        const diff = updated - created;
        const mm = Math.floor((diff / 1000 / 60) % 60);
        const ss = Math.floor((diff / 1000) % 60);
        const humanReadable = `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
        return [
          chalk.cyan(run.id),
          run.name,
          run.created_at,
          { hAlign: 'right', content: humanReadable },
          run.status === 'completed' ? chalk.yellow(run.status) : run.status,
          run.conclusion === 'failure' || run.conclusion === 'failed'
            ? chalk.red(run.conclusion)
            : chalk.green(run.conclusion),
          chalk.blue(run.html_url),
        ];
      });

    table.push(...tableRows);
    if (watch) {
      console.clear();
    }
    console.log(table.toString());
    return workflow_runs;
  } catch (err) {
    console.error('Failed to fetch workflow runs:', err);
    process.exit(1);
  }
}

async function showWorkflowRunReport(id) {
  try {
    const { octokit, owner, repo } = getOctokit();

    // List artifacts for the workflow run.
    const {
      data: { artifacts },
    } = await octokit.actions.listWorkflowRunArtifacts({ owner, repo, run_id: id });
    const artifact = artifacts[0];
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

    // Extract the results.json file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-'));
    const zipPath = path.join(tmpDir, 'artifact.zip');
    fs.writeFileSync(zipPath, buffer);
    const zip = new AdmZip(zipPath);

    // Get sorted entries.
    const entries = [];
    for (const entry of zip.getEntries()) {
      const packageName = '@' + repo + '/' + entry.entryName.split('/').at(-2);
      const directory = entry.entryName.split('/').slice(0, -1).join('/');
      const { testResults } = JSON.parse(zip.readAsText(entry));
      entries.push({ packageName, directory, testResults });
    }

    entries.sort((a, b) => a.directory.localeCompare(b.directory));

    // Output as cli-table3
    const table = new Table({
      head: ['Dir', 'Package', 'Status', 'Name'],
      style: { head: ['gray'] },
    });

    // TODO(burdon): Show errors.
    for (const { packageName, directory, testResults } of entries) {
      let i = 0;
      const rows = testResults.filter((data) => argv.all || data.status === 'failed');
      const rowSpan = rows.length;
      for (const result of rows) {
        const idx = result.name.indexOf(directory);
        const name = result.name.slice(idx + directory.length);
        const row = [result.status === 'passed' ? chalk.green(result.status) : chalk.red(result.status), name];
        if (i++ === 0) {
          table.push([
            { content: chalk.gray(directory.split('/').slice(0, -1).join('/')), rowSpan },
            { content: chalk.magenta(packageName), rowSpan },
            ...row,
          ]);
        } else {
          table.push(row);
        }
      }
    }

    if (table.length > 0) {
      console.log(table.toString());
    }
  } catch (err) {
    console.error('Failed to fetch artifact', err);
    process.exit(1);
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
