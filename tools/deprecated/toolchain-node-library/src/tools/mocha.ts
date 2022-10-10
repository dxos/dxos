//
// Copyright 2021 DXOS.org
//

import { Config } from '../config.js';
import { execTool } from './common.js';

export interface ExecMochaOpts {
  config: Config
  forceClose?: boolean
  userArgs?: string[]
  jsdom?: boolean
}

/**
 * https://mochajs.org/#command-line-usage
 * https://mochajs.org/#reporters
 * E.g., `rushx test ./src/database/** -w --reporter min
 *
 * @param config
 * @param userArgs
 * @param forceClose
 * @param jsdom
 */
export const execMocha = async ({
  config,
  userArgs = [],
  forceClose,
  jsdom = false
}: ExecMochaOpts) => {
  const {
    tests: {
      src: defaultSources,
      spec: defaultSpec
    }
  } = config;

  //
  // Sources
  // Assume first args are either a glob or expanded glob of sources.
  //

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

  //
  // Options
  // NOTE: --no-diff is ignored since the `expect` package generates the output.
  //

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
  // console.log('Options:', JSON.stringify(options, undefined, 2));

  const requires = jsdom ? ['-r', 'jsdom-global/register'] : [];
  await execTool('mocha', [
    ...requires,
    '-r', '@swc-node/register',
    // Causes performance issues when loaded. Enable manually when needed.
    // '-r', require.resolve('./util/wtfnode.js'),
    '-r', require.resolve('./util/catch-unhandled-rejections.js'),
    ...options
  ], {
    stdio: ['inherit', 'inherit', process.stdout] // Redirect stderr > stdout.
  });
};
