#!/usr/bin/env node

import { $, cd, chalk, fs, question } from 'zx';

/**
 * Auto-fix common issues before a CI run.
 * 1. If there are any uncommitted changes, abort with error.
 * 2. Merge the latest origin/main.
 * 3. Run pnpm install and commit the changes if any.
 * 4. Run moon run :lint -- --fix. If it errors -- abort, otherwise commit changes if any.
 * 5. Push
 * 6. Run moon run :build :test
 */

// Set error handling to capture specific failures
$.verbose = true;
process.on('unhandledRejection', (err) => {
  console.error(chalk.red('Error: '), err);
  process.exit(1);
});

/**
 * Check if there are uncommitted changes in the git repository
 * @returns {Promise<boolean>} True if there are uncommitted changes, false otherwise
 */
async function hasUncommittedChanges() {
  try {
    const { stdout } = await $`git status --porcelain`;
    return stdout.trim().length > 0;
  } catch (error) {
    console.error(chalk.red('Failed to check git status:'), error);
    throw error;
  }
}

/**
 * Commit changes with a specific message
 * @param {string} message - The commit message
 */
async function commitChanges(message) {
  try {
    await $`git add .`;
    await $`git commit -m ${message}`;
    console.log(chalk.green(`Changes committed: ${message}`));
  } catch (error) {
    console.error(chalk.red('Failed to commit changes:'), error);
    throw error;
  }
}

/**
 * Main function to run the pre-CI checks and fixes
 */
async function main() {
  console.log(chalk.blue('Starting pre-CI checks and fixes...'));

  // Step 1: Check for uncommitted changes
  console.log(chalk.blue('Step 1: Checking for uncommitted changes...'));
  if (await hasUncommittedChanges()) {
    console.error(
      chalk.red(
        'Error: There are uncommitted changes in the repository. Please commit or stash them before running this script.',
      ),
    );
    process.exit(1);
  }
  console.log(chalk.green('No uncommitted changes found. Proceeding...'));

  // Step 2: Merge the latest origin/main
  console.log(chalk.blue('Step 2: Merging latest origin/main...'));
  try {
    // Fetch the latest changes from origin
    await $`git fetch origin`;
    console.log(chalk.green('Successfully fetched the latest changes from origin.'));

    // Get current branch name
    const { stdout: branchName } = await $`git rev-parse --abbrev-ref HEAD`;
    const currentBranch = branchName.trim();

    // Only try to merge if we're not already on main
    if (currentBranch !== 'main') {
      try {
        await $`git merge origin/main --no-edit`;
        console.log(chalk.green('Successfully merged origin/main into the current branch.'));
      } catch (mergeError) {
        // Check if the only conflict is in pnpm-lock.yaml
        try {
          // Get list of files with merge conflicts
          const { stdout: conflictOutput } = await $`git diff --name-only --diff-filter=U`;
          const conflictedFiles = conflictOutput.trim().split('\n').filter(Boolean);

          // If only pnpm-lock.yaml has conflicts
          if (conflictedFiles.length === 1 && conflictedFiles[0] === 'pnpm-lock.yaml') {
            console.log(chalk.yellow('Only pnpm-lock.yaml has conflicts. Letting pnpm resolve it...'));

            // Run pnpm install to resolve the conflict
            // (pnpm will see the conflict markers and regenerate the lock file)
            console.log(chalk.blue('Running pnpm install to resolve the lock file conflict...'));
            await $`pnpm install`;

            // Add the resolved lock file and complete the merge
            await $`git add pnpm-lock.yaml`;
            await $`git commit -m "chore: merge origin/main with pnpm-resolved lock file"`;
            console.log(chalk.green('Successfully merged origin/main with pnpm-resolved lock file.'));
          } else {
            // Handle other conflicts
            console.error(chalk.red('Merge conflict occurred:'), mergeError);
            await $`git merge --abort`;
            console.error(
              chalk.red(
                'Merge aborted. Please manually merge origin/main into your branch before running this script.',
              ),
            );
            process.exit(1);
          }
        } catch (conflictCheckError) {
          // If we can't check conflicts for some reason, abort
          console.error(chalk.red('Failed to check conflicted files:'), conflictCheckError);
          await $`git merge --abort`;
          console.error(
            chalk.red('Merge aborted. Please manually merge origin/main into your branch before running this script.'),
          );
          process.exit(1);
        }
      }
    } else {
      console.log(chalk.yellow('Current branch is main. Skipping merge step.'));
    }
  } catch (error) {
    console.error(chalk.red('Error fetching or identifying branch:'), error.message);
    process.exit(1);
  }

  // Step 3: Run pnpm install and commit changes if any
  console.log(chalk.blue('Step 3: Running pnpm install...'));
  try {
    await $`pnpm install`;

    if (await hasUncommittedChanges()) {
      await commitChanges('chore: update dependencies after pnpm install');
    } else {
      console.log(chalk.green('No changes after pnpm install.'));
    }
  } catch (error) {
    console.error(chalk.red('Error during pnpm install:'), error.message);
    process.exit(1);
  }

  // Step 4: Run lint with fixes and commit changes if any
  console.log(chalk.blue('Step 4: Running linting with auto-fix...'));
  try {
    await $`moon run :lint --no-bail --quiet -- --fix`;

    if (await hasUncommittedChanges()) {
      await commitChanges('style: fix linting issues');
    } else {
      console.log(chalk.green('No linting issues to fix.'));
    }
  } catch (error) {
    console.error(chalk.red('Linting failed with errors that could not be auto-fixed:'), error.message);
    process.exit(1);
  }

  // Step 5: Push changes to remote
  console.log(chalk.blue('Step 5: Pushing changes to remote...'));
  try {
    await $`git push`;
    console.log(chalk.green('Successfully pushed changes.'));
  } catch (error) {
    console.error(chalk.red('Failed to push changes:'), error.message);
    process.exit(1);
  }

  // Step 6: Run build and test
  console.log(chalk.blue('Step 6: Running build and tests...'));
  try {
    await $`moon run :build --no-bail --quiet`;
    await $`moon run :test --no-bail --quiet -- --no-file-parallelism`;
    console.log(chalk.green('Build and tests completed successfully.'));
  } catch (error) {
    console.error(chalk.red('Build or tests failed:'), error.message);
    process.exit(1);
  }

  console.log(chalk.green.bold('✅ All pre-CI checks and fixes completed successfully!'));
}

// Execute main function
main().catch((error) => {
  console.error(chalk.red('Error in pre-CI script:'), error);
  process.exit(1);
});
