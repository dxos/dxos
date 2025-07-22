#!/usr/bin/env node

import { $, chalk, argv } from 'zx';

const CONFIG = {
  usernameAlias: {
    burdon: 'richburdon',
    josh: 'wittjosiah',
  },
};

/**
 * Script to find new TODOs added in the current branch compared to origin/main.
 * Looks for TODOs in the format: // TODO(username): body
 *
 * Usage:
 *   node find-todos.mjs                 # Console output
 *   node find-todos.mjs --github        # GitHub Actions mode (post/update PR comment)
 */

// Set error handling
$.verbose = false;

// Parse command line arguments
const githubMode = argv.github || argv.g;

// GitHub API configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_EVENT_NAME = process.env.GITHUB_EVENT_NAME;
const GITHUB_REF = process.env.GITHUB_REF;

// Process username with alias mapping
function processUsername(username) {
  return CONFIG.usernameAlias[username] || username;
}

// Extract PR number from GitHub context
async function getPRNumber() {
  if (process.env.GITHUB_EVENT_PATH) {
    try {
      const { readFileSync } = await import('fs');
      const eventData = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
      return eventData.pull_request?.number || eventData.number;
    } catch (error) {
      console.warn(chalk.yellow('Could not parse GitHub event data'));
    }
  }

  // Fallback: try to extract from GITHUB_REF
  const refMatch = GITHUB_REF?.match(/refs\/pull\/(\d+)\/merge/);
  return refMatch ? parseInt(refMatch[1]) : null;
}

// Format TODOs as markdown
function formatTodosAsMarkdown(todos) {
  if (todos.length === 0) {
    return `## 📝 TODOs

✅ No new TODOs found in this PR!`;
  }

  let markdown = `## 📝 TODOs (${todos.length})\n\n`;

  // Group TODOs by file
  const todosByFile = todos.reduce((acc, todo) => {
    if (!acc[todo.filename]) {
      acc[todo.filename] = [];
    }
    acc[todo.filename].push(todo);
    return acc;
  }, {});

  Object.entries(todosByFile).forEach(([filename, fileTodos]) => {
    markdown += `### 📁 \`${filename}\`\n\n`;
    fileTodos.forEach(({ username, message }) => {
      const processedUsername = processUsername(username);
      markdown += `- **@${processedUsername}**: ${message}\n`;
    });
    markdown += '\n';
  });

  markdown += `---\n*This comment is automatically updated by the TODO tracker*`;

  return markdown;
}

// GitHub API helper
async function makeGitHubRequest(endpoint, method = 'GET', body = null) {
  const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}${endpoint}`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'DXOS-TODO-Tracker',
  };

  const options = {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Find existing TODO comment
async function findExistingTodoComment(prNumber) {
  try {
    const comments = await makeGitHubRequest(`/issues/${prNumber}/comments`);
    return comments.find(
      (comment) =>
        comment.body.includes('📝 TODOs') &&
        comment.body.includes('*This comment is automatically updated by the TODO tracker*'),
    );
  } catch (error) {
    console.warn(chalk.yellow('Could not fetch existing comments:'), error.message);
    return null;
  }
}

// Post or update GitHub comment
async function postOrUpdateGitHubComment(prNumber, markdown) {
  try {
    const existingComment = await findExistingTodoComment(prNumber);

    if (existingComment) {
      // Update existing comment
      await makeGitHubRequest(`/issues/comments/${existingComment.id}`, 'PATCH', {
        body: markdown,
      });
      console.log(chalk.green(`✅ Updated TODO comment on PR #${prNumber}`));
    } else {
      // Create new comment
      await makeGitHubRequest(`/issues/${prNumber}/comments`, 'POST', {
        body: markdown,
      });
      console.log(chalk.green(`✅ Posted new TODO comment on PR #${prNumber}`));
    }
  } catch (error) {
    console.error(chalk.red('Failed to post/update GitHub comment:'), error.message);
    throw error;
  }
}

// Validate GitHub mode requirements
async function validateGitHubMode() {
  if (!GITHUB_TOKEN) {
    console.error(chalk.red('Error: GITHUB_TOKEN environment variable is required for --github mode'));
    process.exit(1);
  }

  if (!GITHUB_REPOSITORY) {
    console.error(chalk.red('Error: GITHUB_REPOSITORY environment variable is required for --github mode'));
    process.exit(1);
  }

  const prNumber = await getPRNumber();
  if (!prNumber) {
    console.error(
      chalk.red('Error: Could not determine PR number. Make sure this is running in a GitHub Actions PR context.'),
    );
    process.exit(1);
  }

  return prNumber;
}

try {
  // Validate GitHub mode if enabled
  let prNumber = null;
  if (githubMode) {
    prNumber = await validateGitHubMode();
    console.log(chalk.blue(`Running in GitHub mode for PR #${prNumber}`));
  }

  // Fetch latest changes from origin
  await $`git fetch origin`;
  if (!githubMode) {
    console.log(chalk.blue('Fetched latest changes from origin'));
  }

  // Get the diff between current branch and origin/main with file names
  const { stdout: diff } = await $`git diff origin/main...HEAD`;

  // Split diff into files
  const files = diff.split('diff --git ');

  // Store todos with their filenames
  const todos = [];

  // Process each file in the diff
  files.forEach((file) => {
    if (!file.trim()) return;

    // Extract filename from the diff header
    const filenameMatch = file.match(/a\/(.+) b\//);
    if (!filenameMatch) return;
    const filename = filenameMatch[1];

    // Find TODOs in this file's diff
    const todoRegex = /^\+.*\/\/\s*TODO\([^)]+\):.+$/gm;
    const matches = [...file.matchAll(todoRegex)];

    matches.forEach((match) => {
      const todo = match[0].substring(1).trim();
      const usernameMatch = todo.match(/\/\/\s*TODO\(([^)]+)\):\s*(.+)/);
      if (usernameMatch) {
        todos.push({
          filename,
          username: usernameMatch[1],
          message: usernameMatch[2],
        });
      }
    });
  });

  if (githubMode) {
    // GitHub Actions mode: post/update comment
    const markdown = formatTodosAsMarkdown(todos);
    await postOrUpdateGitHubComment(prNumber, markdown);

    if (todos.length > 0) {
      console.log(chalk.blue(`Found ${todos.length} new TODO${todos.length === 1 ? '' : 's'} in PR #${prNumber}`));
    }
  } else {
    // Console mode: display results
    if (todos.length === 0) {
      console.log(chalk.yellow('No new TODOs found in this branch.'));
      process.exit(0);
    }

    console.log(chalk.green(`Found ${todos.length} new TODO${todos.length === 1 ? '' : 's'}:`));
    console.log();

    // Display todos in a single line format
    todos.forEach(({ filename, username, message }) => {
      const processedUsername = processUsername(username);
      console.log(chalk.gray(`${filename}`) + chalk.yellow(` (${processedUsername}): `) + chalk.white(message));
    });
  }
} catch (error) {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
}
