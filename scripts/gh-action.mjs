#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import { Octokit } from '@octokit/rest';
import { item } from '@1password/op-js';
import AdmZip from 'adm-zip';
import chalk from 'chalk';
import Table from 'cli-table3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import yargs from 'yargs';
import { log } from 'console';
import { execSync } from 'child_process';

// TODO(burdon): Reconcile with tools/x.

const OP_GITHUB_ITEM = 'GitHub';
const OP_GITHUB_FIELD = 'credential';

const REPO_ROOT = process.cwd();

let username = process.env.GITHUB_USERNAME;

const argv = yargs(process.argv.slice(2))
  .option('repo', {
    type: 'string',
    default: process.env.GITHUB_REPOSITORY || 'dxos/dxos',
    description: 'Repository',
  })
  .option('period', {
    type: 'number',
    default: 12 * 60,
    description: 'Period in minutes',
  })
  .option('filter', {
    type: 'string',
    default: 'Check',
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
  .option('summary', {
    type: 'boolean',
    default: false,
    description: 'Summary mode',
  })
  .option('interval', {
    type: 'number',
    default: 20000,
    description: 'Polling interval in milliseconds',
  })
  .option('username', {
    type: 'string',
    default: process.env.GITHUB_USERNAME,
    description: 'Username',
  })
  .option('me', {
    type: 'boolean',
    default: true,
    description: 'Current user',
  })
  .option('verbose', {
    type: 'boolean',
    default: false,
    description: 'Verbose mode',
  })
  .option('verify', {
    type: 'boolean',
    default: false,
    description: 'Verify mode: exit 0 if all OK, 1 if errors, 2 if pending workflows',
  }).argv;

const command = argv._[0];

switch (command) {
  case 'action':
  default: {
    if (argv.verify) {
      await verifyWorkflows();
    } else if (argv.watch) {
      while (true) {
        const done = await checkResults();
        if (done) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, argv.interval));
      }
    } else {
      await checkResults();
    }
    break;
  }
}

/**
 * Check for first available results.
 */
async function checkResults() {
  const runs = await listWorkflowRunsForRepo(true);
  if (!runs) {
    return false;
  }

  // Find first run that completed with success or failure.
  for (const run of runs) {
    if (run.status === 'queued' || run.status === 'in_progress') {
      return false;
    }

    if (run.status === 'completed' && (run.conclusion === 'success' || run.conclusion === 'failure')) {
      await showWorkflowRunReport(run);
      return true;
    }
  }

  return false;
}

/**
 * Verify workflows and exit with appropriate code.
 */
async function verifyWorkflows() {
  if (argv.watch) {
    // Watch mode: wait for workflows to complete
    while (true) {
      const result = await checkWorkflowStatus();
      
      if (result.status === 'pending') {
        if (argv.verbose) {
          console.log(chalk.yellow('Workflows still pending, waiting...'));
        }
        await new Promise((resolve) => setTimeout(resolve, argv.interval));
        continue;
      }
      
      // Workflows completed, check final status
      if (result.status === 'success') {
        console.log(chalk.green('✓ All workflows completed successfully'));
        process.exit(0);
      } else if (result.status === 'failure') {
        console.log(chalk.red('✗ Workflows completed with errors:'));
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(error => console.log(chalk.red(`  - ${error}`)));
        }
        
        // Display logs for failed workflows
        if (result.failedRuns && result.failedRuns.length > 0) {
          for (const failedRun of result.failedRuns) {
            await displayWorkflowLogs(failedRun);
          }
        }
        
        process.exit(1);
      }
    }
  } else {
    // Single check mode
    const result = await checkWorkflowStatus();
    
    if (result.status === 'pending') {
      console.log(chalk.yellow('⏳ Workflows are still pending'));
      process.exit(2);
    } else if (result.status === 'success') {
      console.log(chalk.green('✓ All workflows completed successfully'));
      process.exit(0);
    } else if (result.status === 'failure') {
      console.log(chalk.red('✗ Workflows completed with errors:'));
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => console.log(chalk.red(`  - ${error}`)));
      }
      
      // Display logs for failed workflows
      if (result.failedRuns && result.failedRuns.length > 0) {
        for (const failedRun of result.failedRuns) {
          await displayWorkflowLogs(failedRun);
        }
      }
      
      process.exit(1);
    }
  }
}

/**
 * Check workflow status and return summary.
 */
async function checkWorkflowStatus() {
  const runs = await listWorkflowRunsForRepo(false); // Don't display table in verify mode
  if (!runs || runs.length === 0) {
    return { status: 'success', errors: [], failedRuns: [] };
  }

  let hasPending = false;
  let hasFailures = false;
  const errors = [];
  const failedRuns = [];

  for (const run of runs) {
    if (run.status === 'queued' || run.status === 'in_progress') {
      hasPending = true;
    } else if (run.status === 'completed' && run.conclusion === 'failure') {
      hasFailures = true;
      errors.push(`${run.name} (${run.head_branch}): ${run.conclusion}`);
      failedRuns.push(run);
    }
  }

  if (hasPending) {
    return { status: 'pending', errors, failedRuns: [] };
  } else if (hasFailures) {
    return { status: 'failure', errors, failedRuns };
  } else {
    return { status: 'success', errors: [], failedRuns: [] };
  }
}

/**
 * Parse task logs from GitHub Actions logs.
 * Extracts task-specific logs and identifies failed tasks.
 */
function parseTaskLogs(logs) {
  const logLines = logs.split('\n');
  const tasks = new Map();
  const failedTasks = [];
  
  // Regex to match task log lines: timestamp | task_name | content
  const taskLogRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s+([^|]+)\s*\|(.*)$/;
  
  for (const line of logLines) {
    const match = line.match(taskLogRegex);
    
    if (match) {
      const taskName = match[1].trim();
      const logContent = match[2].trim();
      
      // Initialize task if not seen before
      if (!tasks.has(taskName)) {
        tasks.set(taskName, {
          name: taskName,
          logs: [],
          status: 'running',
          failed: false
        });
      }
      
      const task = tasks.get(taskName);
      task.logs.push(line);
      
      // Check for failure marker
      if (logContent.includes(`Task ${taskName} failed to run.`)) {
        task.failed = true;
        task.status = 'failed';
      }
    } else {
      // Check for generic failure patterns in non-task lines
      if (line.includes('failed to run.')) {
        const failureMatch = line.match(/Task ([^\s]+) failed to run\./); 
        if (failureMatch) {
          const taskName = failureMatch[1];
          if (tasks.has(taskName)) {
            const task = tasks.get(taskName);
            task.failed = true;
            task.status = 'failed';
            task.logs.push(line);
          }
        }
      }
    }
  }
  
  // Collect only failed tasks
  for (const task of tasks.values()) {
    if (task.failed) {
      failedTasks.push(task);
    }
  }
  
  return failedTasks;
}

/**
 * Fetch and display logs for a failed workflow run.
 */
async function displayWorkflowLogs(run) {
  try {
    const { octokit, owner, repo } = getOctokit();
    
    console.log(chalk.yellow(`\n📋 Fetching logs for workflow: ${run.name} (${run.head_branch})...`));
    
    // Get jobs for the workflow run
    const { data: { jobs } } = await octokit.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: run.id,
    });
    
    for (const job of jobs) {
      if (job.conclusion === 'failure') {
        console.log(chalk.red(`\n❌ Failed Job: ${job.name}`));
        console.log(chalk.gray(`   Started: ${job.started_at}`));
        console.log(chalk.gray(`   Completed: ${job.completed_at}`));
        console.log(chalk.gray(`   URL: ${job.html_url}`));
        
        try {
          // Get job logs
          const logsResponse = await octokit.actions.downloadJobLogsForWorkflowRun({
            owner,
            repo,
            job_id: job.id,
          });
          
          if (logsResponse.url) {
            const response = await fetch(logsResponse.url);
            const logs = await response.text();
            
            const failedTasks = parseTaskLogs(logs);
            
            if (failedTasks.length > 0) {
              console.log(chalk.gray('\n--- Failed Tasks ---'));
              
              for (const task of failedTasks) {
                console.log(chalk.red(`\n❌ Task: ${task.name}`));
                console.log(chalk.gray(`   Status: ${task.status}`));
                console.log(chalk.gray(`   Log lines: ${task.logs.length}`));
                
                // Display task logs with color coding
                task.logs.forEach(line => {
                  if (line.includes('error') || line.includes('Error') || line.includes('ERROR')) {
                    console.log(chalk.red(line));
                  } else if (line.includes('warning') || line.includes('Warning') || line.includes('WARN')) {
                    console.log(chalk.yellow(line));
                  } else {
                    console.log(line);
                  }
                });
              }
              
              // Summary
              console.log(chalk.yellow(`\n📊 Summary: ${failedTasks.length} failed task(s)`));
              failedTasks.forEach(task => {
                console.log(chalk.red(`  - ${task.name}: ${task.status}`));
              });
            } else {
              console.log(chalk.gray('\n--- Job Logs ---'));
              console.log(chalk.yellow('No failed tasks found, showing raw logs...'));
              
              // Fallback to original log display if no tasks detected
              const logLines = logs.split('\n');
              const displayLines = logLines.slice(-500);
              
              displayLines.forEach(line => {
                if (line.includes('error') || line.includes('Error') || line.includes('ERROR')) {
                  console.log(chalk.red(line));
                } else if (line.includes('warning') || line.includes('Warning') || line.includes('WARN')) {
                  console.log(chalk.yellow(line));
                } else {
                  console.log(line);
                }
              });
            }
          }
        } catch (logErr) {
          console.log(chalk.red(`   Failed to fetch logs: ${logErr.message}`));
        }
      }
    }
  } catch (err) {
    console.error(chalk.red(`Failed to fetch workflow logs: ${err.message}`));
  }
}

/**
 * Get PRs.
 */
async function getPullRequests() {
  try {
    const { octokit, owner, repo } = getOctokit();

    // Get pull requests.
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state: 'open',
    });

    return data;
  } catch (err) {
    console.error('Failed to fetch pull requests:', err);
    process.exit(1);
  }
}

/**
 * List GH actions.
 */
async function listWorkflowRunsForRepo(watch = false, displayTable = true) {
  try {
    const { octokit, owner, repo } = getOctokit();
    const actor = argv.me ? await getUsername() : argv.username;
    if (argv.verbose) {
      console.log(chalk.gray(`Getting workflow runs for ${owner}/${repo}...`));
    }

    // Get workflow runs.
    const {
      data: { workflow_runs },
    } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      created: `>${new Date(Date.now() - argv.period * 60 * 1000).toISOString()}`,
      name: argv.filter,
    });
    if (workflow_runs.length === 0) {
      console.log('No workflow runs found.');
      return;
    }

    const rows = workflow_runs
      .filter((run) => (!actor || run.actor?.login === actor) && (!argv.filter || run.name.match(argv.filter)))
      .sort(({ created_at: a }, { created_at: b }) => new Date(b) - new Date(a));

    if (displayTable) {
      // Output as cli-table3
      const table = new Table({
        head: ['Run', 'Workflow', 'Actor', 'Branch', 'Created', 'Duration', 'Status'],
        style: { head: ['gray'], compact: true },
      });

      rows.forEach((run) => {
        const now = new Date(new Date().toISOString());
        const created = new Date(run.created_at);
        const updated = new Date(run.updated_at);

        const diff = (run.status === 'completed' ? updated : now) - created;
        const mm = Math.floor((diff / 1000 / 60) % 60);
        const ss = Math.floor((diff / 1000) % 60);
        const humanReadable = `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;

        table.push([
          chalk.blueBright(link(run.html_url, run.id)),
          run.name,
          run.actor?.login,
          chalk.magenta(run.head_branch),
          run.created_at,
          { hAlign: 'right', content: humanReadable },
          run.status === 'completed'
            ? run.conclusion === 'failure'
              ? chalk.red(run.conclusion)
              : run.conclusion === 'success'
                ? chalk.green(run.conclusion)
                : chalk.yellow(run.conclusion)
            : chalk.yellow(run.status),
        ]);
      });

      if (watch && !argv.verbose) {
        console.clear();
      }

      console.log(table.toString());
    }
    return rows;
  } catch (err) {
    console.error('Failed to fetch workflow runs:', err);
    process.exit(1);
  }
}

/**
 * Show vite report for workflow run.
 */
async function showWorkflowRunReport(run) {
  try {
    const { octokit, owner, repo } = getOctokit();

    // Get artifacts for the workflow run.
    const {
      data: { artifacts },
    } = await octokit.actions.listWorkflowRunArtifacts({ owner, repo, run_id: run.id });
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

    // Output as cli-table3
    const table = new Table({
      head: argv.summary ? ['Dir', 'Package', 'Status'] : ['Dir', 'Package', 'Status', 'Name'],
      style: { head: ['gray'], compact: argv.summary },
    });

    const stats = {
      failed: 0,
      total: 0,
    };

    // Get sorted entries.
    let entries = [];
    {
      for (const entry of zip.getEntries()) {
        const packageName = '@' + repo + '/' + entry.entryName.split('/').at(-2);
        const directory = entry.entryName.split('/').slice(0, -1).join('/');
        const parent = directory.split('/').slice(0, -1).join('/');
        const { testResults } = JSON.parse(zip.readAsText(entry));
        entries.push({ parent, directory, packageName, testResults });
      }

      entries.sort((a, b) => {
        const s = comparePathStrings(a.parent, b.parent);
        return s === 0 ? a.packageName.localeCompare(b.packageName) : s;
      });
    }

    const errors = [];
    for (const { parent, directory, packageName, testResults } of entries) {
      let i = 0;
      stats.total += testResults.length;
      const rows = testResults.filter((data) => argv.all || data.status === 'failed');
      const rowSpan = rows.length;
      for (const result of rows) {
        const idx = result.name.indexOf(directory);
        const filename = result.name.slice(idx + directory.length + 1);
        const row = [result.status === 'passed' ? chalk.green(result.status) : chalk.red(result.status), filename];
        if (result.status === 'failed') {
          errors.push([directory, packageName, filename, result]);
          stats.failed++;
        }

        if (argv.summary) {
          const failed = rows.find((r) => r.status !== 'passed');
          table.push([
            { content: chalk.gray(parent) },
            { content: chalk.magenta(packageName) },
            failed ? chalk.red(failed.status) : chalk.green('passed'),
          ]);
          break;
        }

        if (i++ === 0) {
          table.push([
            { content: chalk.gray(parent), rowSpan },
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
      for (const [directory, packageName, name, result] of errors) {
        console.log();
        console.log(`[${chalk.magenta(packageName)}] ${chalk.blueBright(path.join(REPO_ROOT, directory, name))}`);

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
                const highlight = where?.indexOf(argv.repo) !== -1 && where?.indexOf('node_modules') === -1;
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

    {
      const table = new Table({
        head: ['Workflow', 'Passed', 'Failed', 'Total', 'URL'],
        style: { head: ['gray'], compact: true },
      });
      table.push([
        run.name,
        chalk.green(stats.total - stats.failed),
        chalk.red(stats.failed),
        stats.total,
        chalk.blueBright(run.html_url),
      ]);
      console.log(table.toString());
    }

    return stats;
  } catch (err) {
    console.error('Failed to fetch artifact', err);
    process.exit(1);
  }
}

function getOctokit() {
  const token = getGithubToken();
  const [owner, repo] = argv.repo.split('/');
  if (!token || !owner || !repo) {
    console.error('Missing GITHUB_TOKEN or GITHUB_REPOSITORY environment variables.');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });
  return { octokit, owner, repo };
}

async function getUsername() {
  if (username) {
    return username;
  }

  const { octokit } = getOctokit();
  const { data } = await octokit.users.getAuthenticated();
  username = data.login;
  return data.login;
}

/**
 * https://github.com/settings/apps
 */
function getGithubToken() {
  // First priority: environment variable
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }

  // Second priority: GitHub CLI auth status
  try {
    execSync('gh auth status', { stdio: 'pipe' });
    // If gh auth status succeeds, get the token
    const token = execSync('gh auth token', { encoding: 'utf8' }).trim();
    if (token) {
      return token;
    }
  } catch (err) {
    // GitHub CLI is not authenticated, continue to 1Password fallback
    if (argv.verbose) {
      console.log(chalk.gray('GitHub CLI not authenticated, trying 1Password...'));
    }
  }

  // Third priority: 1Password fallback
  try {
    const token = item.get(OP_GITHUB_ITEM);
    const field = token?.fields.find((f) => f.label === OP_GITHUB_FIELD);
    return field?.value;
  } catch (err) {
    console.error('Failed to fetch GITHUB_TOKEN from 1Password:', err.message);
    process.exit(1);
  }
}

function chalkJson(obj) {
  return JSON.stringify(obj, null, 2)
    .replace(/"([^"]+)":/g, (_, key) => chalk.green(`"${key}":`)) // keys
    .replace(/: "(.*?)"/g, (_, val) => `: ${chalk.yellow(`"${val}"`)}`) // strings
    .replace(/: (\d+)/g, (_, val) => `: ${chalk.cyan(val)}`) // numbers
    .replace(/: (true|false)/g, (_, val) => `: ${chalk.magenta(val)}`); // booleans
}

function link(url, text) {
  return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
}

function comparePathStrings(a, b) {
  const segA = a.split('/');
  const segB = b.split('/');

  for (let i = 0; i < Math.max(segA.length, segB.length); i++) {
    const partA = segA[i] ?? '';
    const partB = segB[i] ?? '';
    const cmp = partA.localeCompare(partB, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp;
  }

  return segA.length - segB.length;
}
