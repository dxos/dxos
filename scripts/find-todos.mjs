#!/usr/bin/env node

import { $, chalk } from 'zx';

/**
 * Script to find new TODOs added in the current branch compared to origin/main.
 * Looks for TODOs in the format: // TODO(username): body
 */

// Set error handling
$.verbose = false;

try {
  // Fetch latest changes from origin
  await $`git fetch origin`;
  console.log(chalk.blue('Fetched latest changes from origin'));

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

  if (todos.length === 0) {
    console.log(chalk.yellow('No new TODOs found in this branch.'));
    process.exit(0);
  }

  console.log(chalk.green(`Found ${todos.length} new TODO${todos.length === 1 ? '' : 's'}:`));
  console.log();

  // Display todos in a single line format
  todos.forEach(({ filename, username, message }) => {
    console.log(chalk.gray(`${filename}`) + chalk.yellow(` (${username}): `) + chalk.white(message));
  });
} catch (error) {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
}
