//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { ComputerShellError } from './errors';

/**
 * Route the dev-server middleware answers on. Same-origin, so the browser reaches it without CORS
 * and without a second process for the app (or a test run) to supervise.
 */
export const PATH = '/api/computer/exec';

/**
 * Env var naming the directory the middleware materializes its prebaked scripts into. Exported as a
 * name rather than a path because the value is decided by the host at mount time, and the script is
 * referenced through the shell's own expansion — the harness's only privileged verb stays
 * "run this script".
 */
export const SCRIPTS_ENV = 'DX_COMPUTER_SCRIPTS';

/** Prebaked editor within {@link SCRIPTS_ENV}; see `vite-plugin/apply-edits-program.ts`. */
export const APPLY_EDITS_SCRIPT = 'apply-edits.mjs';

/**
 * Env var naming the host's root, injected into every script by the middleware. Not a developer
 * setting — the vite plugin decides the root (cwd by default) and writes it here so the prebaked
 * editor can refuse paths outside it.
 */
export const ROOT_ENV = 'DX_COMPUTER_ROOT';

/** One turn of the harness: a script, and where to run it. */
export type Request = {
  /** Passed to `bash -c`; `$?`, pipes and redirections all behave as in a terminal. */
  script: string;
  /** Directory to run in, relative to the host's root (or absolute inside it). Defaults to the root. */
  cwd?: string;
  /** Written to the script's stdin and closed. Carries payloads a command line cannot quote safely. */
  stdin?: string;
  /** Milliseconds before the process group is killed; the host clamps it to its own maximum. */
  timeout?: number;
};

export type Result = {
  stdout: string;
  stderr: string;
  /** `null` when the process was killed by a signal rather than exiting on its own. */
  exitCode: number | null;
  signal?: string;
  timedOut: boolean;
  /** Either stream hit the host's output cap and was clipped at the end. */
  truncated: boolean;
  /** Absolute directory the script ran in, so the model can build absolute paths from it. */
  cwd: string;
  durationMs: number;
};

/** A single find/replace against a file, matching `Text.Edit`'s vocabulary for string edits. */
export type Edit = {
  /** Path to the file, relative to the request's `cwd`. */
  path: string;
  oldString: string;
  newString: string;
  /** Replace every occurrence instead of requiring `oldString` to be unique in the file. */
  replaceAll?: boolean;
};

/** Payload the prebaked editor reads from stdin. */
export type ApplyEditsPayload = {
  edits: readonly Edit[];
};

/** What the prebaked editor prints to stdout — the same shape whether or not it succeeded. */
export type ApplyEditsResult = {
  /** False means nothing was written at all: the batch is all-or-nothing. */
  applied: boolean;
  files: readonly { path: string; replacements: number }[];
  /** Set iff `applied` is false; names the failing edit and why it did not match. */
  error?: string;
};

export type ExecOptions = {
  signal?: AbortSignal;
  /** Defaults to {@link PATH}; override when the host is mounted elsewhere, or in a test. */
  path?: string;
};

/**
 * Runs a script on the host and resolves with its result.
 *
 * A non-zero exit is a result, not a failure — the model is expected to read `stderr` and try
 * again. Only an unreachable or non-JSON-answering host fails, which in practice means the vite
 * plugin is not mounted (a deployed Composer has no dev server at all).
 */
export const exec = async (request: Request, { signal, path = PATH }: ExecOptions = {}): Promise<Result> => {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      // The host requires this content type, which a cross-origin page cannot send without a
      // preflight it never answers — so only same-origin callers reach the shell.
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    throw new ComputerShellError({
      message: 'the computer host is unreachable; mount the computer vite plugin on the dev server',
      context: { path },
      cause: error,
    });
  }

  // A dev server that never mounted the route answers 404, which is the likeliest failure by far —
  // worth naming, since "404" on its own reads as a bug in the caller.
  if (response.status === 404) {
    throw new ComputerShellError({
      message: 'the computer host is not mounted; add the computer vite plugin to the dev server',
      context: { path },
    });
  }

  if (!response.ok) {
    throw new ComputerShellError({
      message: `the computer host refused the request (${response.status})`,
      context: { path, detail: await response.text().catch(() => response.statusText) },
    });
  }

  try {
    // Annotated rather than cast: the body is this package's own middleware answering, and the shape
    // is the contract above.
    const result: Result = await response.json();
    return result;
  } catch (error) {
    throw new ComputerShellError({
      message: 'the computer host answered with a non-JSON body',
      context: { path },
      cause: error,
    });
  }
};

/**
 * Applies a batch of find/replace edits by running the prebaked editor through {@link exec}.
 *
 * The edits travel on stdin rather than in the script, so no amount of quoting in the replacement
 * text can change what the shell runs.
 */
export const applyEdits = async (
  edits: readonly Edit[],
  { cwd, ...options }: ExecOptions & { cwd?: string } = {},
): Promise<ApplyEditsResult> => {
  const payload: ApplyEditsPayload = { edits };
  const result = await exec(
    {
      script: `node "$${SCRIPTS_ENV}/${APPLY_EDITS_SCRIPT}"`,
      cwd,
      stdin: JSON.stringify(payload),
    },
    options,
  );

  return parseApplyEditsResult(result);
};

/**
 * Reads the editor's verdict out of a completed run.
 *
 * The editor reports failure as data on stdout, so anything unparseable means it never got to run
 * (a missing node, a truncated stream) and the streams themselves are the only diagnosis available.
 */
export const parseApplyEditsResult = ({ stdout, stderr, exitCode }: Result): ApplyEditsResult => {
  try {
    const result: ApplyEditsResult = JSON.parse(stdout);
    return result;
  } catch {
    return {
      applied: false,
      files: [],
      error: (stderr || stdout).trim() || `the editor exited ${exitCode} without output`,
    };
  }
};
