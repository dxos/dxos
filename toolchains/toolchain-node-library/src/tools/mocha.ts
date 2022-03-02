//
// Copyright 2021 DXOS.org
//

import { execTool } from './common';

export interface ExecMochaOpts {
  forceClose?: boolean
  userArgs?: string[]
  jsdom?: boolean
}

/**
 * https://mochajs.org/#command-line-usage
 * E.g., `rushx test ./src/database/** -w --reporter min
 *
 * @param userArgs
 * @param forceClose
 * @param jsdom
 */
export async function execMocha ({ userArgs = [], forceClose, jsdom = false }: ExecMochaOpts) {
  const defaultSpec = './src/**/*.test.*';
  const defaultSources = './src/**/*';

  // TODO(burdon): Assume first args are either a glob or expanded glob of sources.
  const sources = [];
  {
    while (userArgs?.length) {
      const arg = userArgs.shift()!;
      if (arg.charAt(0) === '-') {
        userArgs.unshift(arg);
        break;
      } else {
        sources.push(arg);
      }
    }

    if (!sources.length) {
      sources.push(defaultSpec);
    }
  }

  const options = [
    ...sources,
    forceClose ? '--exit' : '--no-exit',
    '-t', '15000',
    ...userArgs
  ];

  // Set defaults.
  {
    let watchFiles = false;
    let shouldWatch = false;
    for (const arg of userArgs) {
      if (arg === '-w' || arg === '--watch') {
        shouldWatch = true;
      } else if (arg === '--watch-files') {
        watchFiles = true;
      }
    }

    if (shouldWatch && !watchFiles) {
      options.push(`--watch-files="${defaultSources}"`);
    }
  }

  // TODO(burdon): Verbose option.
  console.log('Options:', JSON.stringify(options, undefined, 2));

  const requires = jsdom ? ['-r', 'jsdom-global/register'] : [];
  await execTool('mocha', [
    ...requires,
    '-r', '@swc-node/register',
    '-r', require.resolve('./wtfnode.js'),
    '-r', require.resolve('./catch-unhandled-rejections.js'),
    ...options
  ], {
    stdio: ['inherit', 'inherit', process.stdout] // Redirect stderr > stdout.
  });
}
