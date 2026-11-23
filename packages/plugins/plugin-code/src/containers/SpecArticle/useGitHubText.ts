//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import { useEffect, useState } from 'react';

import { type SourceKey } from '@dxos/deus/review';
import { BaseError, type BaseErrorOptions } from '@dxos/errors';

/** The branch read when the review names no commit. */
const DEFAULT_REF = 'main';

/** A file GitHub did not serve: `status` is the HTTP status, or undefined when the request never completed. */
export class GitHubFetchError extends BaseError.extend('GitHubFetchError', 'GitHub did not serve the file.') {
  readonly url: string;
  readonly status: number | undefined;

  constructor(context: { url: string; status?: number }, options?: BaseErrorOptions) {
    super({ context, ...options });
    this.url = context.url;
    this.status = context.status;
  }
}

/** The raw URL of a key's file at `ref`; raw.githubusercontent.com serves CORS and has no API rate limit. */
export const gitHubRawUrl = ({ owner, repo, path }: SourceKey, ref = DEFAULT_REF): string =>
  `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

/** Reads a public file from GitHub. */
export const fetchGitHubText = (url: string): Effect.Effect<string, GitHubFetchError> =>
  Effect.tryPromise({
    try: (signal) => fetch(url, { signal }),
    catch: (cause) => new GitHubFetchError({ url }, { cause }),
  }).pipe(
    Effect.flatMap((response) =>
      response.ok
        ? Effect.tryPromise({ try: () => response.text(), catch: (cause) => new GitHubFetchError({ url }, { cause }) })
        : Effect.fail(new GitHubFetchError({ url, status: response.status })),
    ),
  );

export type GitHubText =
  | { status: 'idle' }
  | { status: 'loading'; url: string }
  | { status: 'ready'; url: string; text: string }
  | { status: 'error'; url: string; error: GitHubFetchError };

/**
 * The text of a key's file read from GitHub at `ref` (the reviewed commit, else `main`), for hosts with no local
 * checkout; idle while `key` is undefined.
 */
export const useGitHubText = (key: SourceKey | undefined, ref?: string): GitHubText => {
  const url = key ? gitHubRawUrl(key, ref) : undefined;
  const [state, setState] = useState<GitHubText>({ status: 'idle' });
  useEffect(() => {
    if (!url) {
      setState({ status: 'idle' });
      return;
    }
    setState({ status: 'loading', url });
    const fiber = Effect.runFork(
      fetchGitHubText(url).pipe(
        Effect.match({
          onSuccess: (text) => setState({ status: 'ready', url, text }),
          onFailure: (error) => setState({ status: 'error', url, error }),
        }),
      ),
    );
    return () => void Effect.runFork(Fiber.interrupt(fiber));
  }, [url]);
  // A result for the previous file is not shown while the next one loads.
  return url === undefined
    ? { status: 'idle' }
    : state.status !== 'idle' && state.url === url
      ? state
      : { status: 'loading', url };
};
