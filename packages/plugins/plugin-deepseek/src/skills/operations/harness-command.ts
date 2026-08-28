//
// Copyright 2026 DXOS.org
//

/**
 * Quotes a value for `sh -c`: the command reaches the sandbox as a single string, so an
 * unquoted prompt would be split on whitespace and its metacharacters executed.
 */
export const shellQuote = (value: string): string => `'${value.replaceAll("'", `'\\''`)}'`;

/** Installs the harness CLI globally so the run command finds it on PATH. */
export const buildInstallCommand = (harnessPackage: string): string =>
  `npm install --global --no-fund --no-audit ${shellQuote(harnessPackage)}`;

/**
 * Builds the harness invocation: the prompt is the final positional argument, and everything
 * else (model, API key, host) travels as environment rather than as flags this plugin would
 * have to guess for a CLI it does not ship.
 */
export const buildRunCommand = ({
  bin,
  prompt,
  args = [],
}: {
  bin: string;
  prompt: string;
  args?: readonly string[];
}): string => [bin, ...args.map(shellQuote), shellQuote(prompt)].join(' ');
