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

const REPO_ROOT = process.cwd();

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
  .option('truncate', {
    type: 'boolean',
    default: false,
    description: 'Truncate trace (skip non package files)',
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
        if (data[0].status === 'in_progress') {
          await new Promise((r) => setTimeout(r, argv.interval));
          continue;
        } else {
          const check = data.find((run) => run.status === 'completed');
          if (check) {
            await showWorkflowRunReport(check.id);
            break;
          }
        }
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

    // Get workflow runs.
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

    const rows = workflow_runs.filter((run) => !argv.filter || run.name === argv.filter);
    rows.forEach((run) => {
      const created = new Date(run.created_at);
      const updated = new Date(run.updated_at);
      const diff = updated - created;
      const mm = Math.floor((diff / 1000 / 60) % 60);
      const ss = Math.floor((diff / 1000) % 60);
      const humanReadable = `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
      table.push([
        chalk.cyan(run.id),
        run.name,
        run.created_at,
        { hAlign: 'right', content: humanReadable },
        run.status === 'completed' ? chalk.yellow(run.status) : run.status,
        run.conclusion === 'failure' ? chalk.red(run.conclusion) : chalk.green(run.conclusion),
        chalk.blue(run.html_url),
      ]);
    });

    if (watch) {
      console.clear();
    }
    console.log(table.toString());
    return rows;
  } catch (err) {
    console.error('Failed to fetch workflow runs:', err);
    process.exit(1);
  }
}

async function showWorkflowRunReport(id) {
  try {
    const { octokit, owner, repo } = getOctokit();

    // Get artifacts for the workflow run.
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
    const errors = [];
    for (const { packageName, directory, testResults } of entries) {
      let i = 0;
      const rows = testResults.filter((data) => argv.all || data.status === 'failed');
      const rowSpan = rows.length;
      for (const result of rows) {
        const idx = result.name.indexOf(directory);
        const name = result.name.slice(idx + directory.length);
        const row = [result.status === 'passed' ? chalk.green(result.status) : chalk.red(result.status), name];
        if (result.status === 'failed') {
          errors.push([packageName, directory, name, result]);
        }

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

    if (errors.length > 0) {
      let i = 0;
      for (const [packageName, directory, name, result] of errors) {
        console.log();
        console.log(`[${chalk.magenta(packageName)}] ${chalk.blueBright(path.join(REPO_ROOT, directory, name))}`);
        // console.log(result);

        for (const { duration, title, failureMessages, ancestorTitles } of result.assertionResults) {
          console.log();
          console.log(
            `[${++i}]`,
            ancestorTitles.join(' > '),
            `"${chalk.green(title)}"`,
            chalk.gray(`(${Math.round(duration)}ms)`),
          );

          for (const message of failureMessages) {
            const [first, ...lines] = message.split('\n');
            console.log();
            console.log(chalk.yellow(first));

            const prefix = `/__w/${owner}/${repo}`;
            for (const line of lines) {
              const str = line.replace(prefix, REPO_ROOT);
              const match = str.match(/(\s+at) (?:([^.]+)\s+)?(.*)/);
              if (match) {
                const [_, prefix, method, where] = match;
                const highlight = where?.indexOf(GITHUB_REPOSITORY) !== -1 && where?.indexOf('node_modules') === -1;
                if (!highlight && argv.truncate) {
                  break;
                }

                console.log(
                  [
                    chalk.gray(prefix),
                    highlight ? chalk.white(method ?? '') : chalk.gray(method ?? ''),
                    chalk.gray(where),
                  ]
                    .filter(Boolean)
                    .join(' '),
                );
              } else {
                console.log(line);
              }
            }
          }
        }
      }
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
