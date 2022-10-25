//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

debug.log = console.log.bind(console);

export const log = (...args) => {
  console.log(args.map((arg) => arg.toString()).join(' '));
};

export const logError = (str) => {
  if (typeof str.message === 'string') {
    str = `Error: ${str.message.replace('\n', '')}`;
  } else if (str instanceof Error) {
    str = String(str);
  } else if (typeof str === 'object') {
    str = JSON.stringify(str);
  } else if (typeof str === 'string') {
    str = str.replace('\n', '');
  }

  console.error(`\n${str}`);
};

/**
 * Creates debug and error logs.
 *
 * @param {string} name
 * @return {{ log: debug, error: debug }}
 */
// TODO(burdon): Rename.
export const logs = (name) => {
  const log = debug(name);
  log.log = console.log.bind(console);

  const error = debug(`${name}:error`);
  error.log = console.error.bind(console);

  return {
    log,

    error: (err, ...rest) => {
      if (err instanceof Error) {
        const { name, message } = err;
        error(`${name}: ${message}`);

        // TODO(burdon): Source-map support?
        // https://www.npmjs.com/package/stacktracey
        // https://www.npmjs.com/package/source-map-support
        console.error(err);
      } else {
        error(err, ...rest);
      }
    }
  };
};

/**
 * Expose 'debug' module's selective log namespace capabilities by delegation.
 * Allows runtime enable/disable of individual namespaces, or regexes thereof.
 */

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 */
export const enable = (namespaces) => {
  debug.enable(namespaces);
};

/**
 * Disable all namespaces, return previously enabled namespaces.
 *
 * @return {String} namespaces
 */
export const disable = () => debug.disable();
