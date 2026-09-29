#!/usr/bin/env bun
// Scrapes every human inline PR-review comment on dxos/dxos from the last 12 months,
// along with the metadata of every PR those comments belong to. Idempotent: a rerun
// resumes from the newest `created_at` already in `comments.jsonl` instead of
// re-fetching everything. Writes `comments.jsonl` and `prs.jsonl` atomically at the end.

import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const commentsPath = join(scriptDirectory, 'comments.jsonl');
const prsPath = join(scriptDirectory, 'prs.jsonl');

const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) {
  console.error('GITHUB_TOKEN is not set.');
  process.exit(1);
}

const repositoryOwner = 'dxos';
const repositoryName = 'dxos';
const commentsPerPage = 100;
const maxCommentsTotal = 8000;
const rateLimitFloor = 50;
const maxRetries = 5;

const apiHeaders = {
  'Authorization': `Bearer ${githubToken}`,
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'dxos-architecture-rules-dataset-scraper',
};

/** A GitHub user/actor reference as embedded in a review comment or PR payload. */
type GitHubUser = { login?: string; type?: string };

/** One review comment record kept in `comments.jsonl`. */
type CommentRecord = {
  id: number;
  pr: number;
  url: string;
  author: string;
  created_at: string;
  path: string;
  line: number | null;
  /** Line the comment was made on, in the file at `original_commit_id`; stable once outdated. */
  original_line: number | null;
  side: string | undefined;
  commit_id: string | undefined;
  original_commit_id: string | undefined;
  in_reply_to_id: number | null;
  diff_hunk: string | undefined;
  body: string;
};

/** One PR metadata record kept in `prs.jsonl`. */
type PrRecord = {
  number: number;
  title: string;
  author: string;
  merged: boolean;
  base: string;
  created_at: string;
  html_url: string;
};

/** The GitHub review-comment payload fields this script reads. */
type RawComment = {
  id: number;
  pull_request_url?: string;
  html_url: string;
  user?: GitHubUser;
  created_at: string;
  path: string;
  line?: number;
  original_line?: number;
  side?: string;
  commit_id?: string;
  original_commit_id?: string;
  in_reply_to_id?: number;
  diff_hunk?: string;
  body: string;
};

/** The GitHub pull-request payload fields this script reads. */
type RawPr = {
  number: number;
  title: string;
  user?: GitHubUser;
  merged_at?: string | null;
  base: { ref: string };
  created_at: string;
  html_url: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Validates a decoded review-comment payload against the fields this script reads. */
const isRawComment = (value: unknown): value is RawComment =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.html_url === 'string' &&
  typeof value.created_at === 'string' &&
  typeof value.path === 'string' &&
  typeof value.body === 'string';

/** Validates a decoded pull-request payload against the fields this script reads. */
const isRawPr = (value: unknown): value is RawPr =>
  isRecord(value) &&
  typeof value.number === 'number' &&
  typeof value.title === 'string' &&
  isRecord(value.base) &&
  typeof value.base.ref === 'string' &&
  typeof value.created_at === 'string' &&
  typeof value.html_url === 'string';

// Drop automated reviewers (coderabbitai, codecov, github-actions, etc.).
const isBotAuthor = (user: GitHubUser | undefined): boolean =>
  user?.type === 'Bot' || (user?.login ?? '').endsWith('[bot]');

const sleep = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

const parsePullRequestNumber = (pullRequestUrl: string | undefined): number => {
  const match = pullRequestUrl?.match(/\/pulls\/(\d+)$/);
  if (!match) {
    throw new Error(`Could not parse PR number from ${pullRequestUrl}`);
  }
  return Number(match[1]);
};

// GitHub's Link header points at the numeric-ID form (`/repositories/{id}/...`),
// which the egress proxy rejects; rebuild the next-page URL against the
// canonical `repos/{owner}/{repo}/...` path instead, keeping its query string.
const parseNextLinkFromHeader = (linkHeader: string | null): string | undefined => {
  if (!linkHeader) {
    return undefined;
  }
  for (const part of linkHeader.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) {
      const nextUrl = new URL(match[1]);
      return `https://api.github.com/repos/${repositoryOwner}/${repositoryName}/pulls/comments${nextUrl.search}`;
    }
  }
  return undefined;
};

const isSecondaryRateLimitBody = (body: string): boolean =>
  /secondary rate limit/i.test(body) || /abuse detection/i.test(body);

// Fetches one URL, honouring primary rate limits (sleep until reset) and retrying
// 5xx / secondary-rate-limit responses with exponential backoff. A 401/403 that is
// not a secondary rate limit is fatal and reported verbatim by the caller.
const fetchWithRetry = async (url: string): Promise<Response> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, { headers: apiHeaders });
    const remaining = Number(response.headers.get('x-ratelimit-remaining') ?? 'NaN');
    const reset = Number(response.headers.get('x-ratelimit-reset') ?? 'NaN');

    if (
      response.status >= 500 ||
      (response.status === 403 && isSecondaryRateLimitBody(await response.clone().text()))
    ) {
      if (attempt === maxRetries) {
        return response;
      }
      const backoffMs = 2 ** attempt * 1000;
      console.error(
        `Retrying ${url} after ${response.status} (attempt ${attempt + 1}/${maxRetries}, backoff ${backoffMs}ms)`,
      );
      await sleep(backoffMs);
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      return response;
    }

    if (!Number.isNaN(remaining) && remaining < rateLimitFloor && !Number.isNaN(reset)) {
      const waitMs = Math.max(0, reset * 1000 - Date.now()) + 1000;
      console.error(`Rate limit low (remaining=${remaining}); sleeping ${Math.round(waitMs / 1000)}s until reset.`);
      await sleep(waitMs);
    }

    return response;
  }
  throw new Error('unreachable');
};

const failFatally = async (response: Response, context: string): Promise<never> => {
  const body = await response.text();
  console.error(`Fatal: ${context} returned ${response.status}.`);
  console.error(body);
  process.exit(1);
};

const loadExistingJsonl = <T>(path: string): T[] => {
  if (!existsSync(path)) {
    return [];
  }
  const raw = readFileSync(path, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T);
};

const writeJsonlAtomically = <T>(path: string, records: T[]): void => {
  const tempPath = `${path}.tmp`;
  const content = records.map((record) => JSON.stringify(record)).join('\n') + (records.length > 0 ? '\n' : '');
  writeFileSync(tempPath, content, 'utf8');
  renameSync(tempPath, path);
};

const toCommentRecord = (raw: RawComment): CommentRecord => ({
  id: raw.id,
  pr: parsePullRequestNumber(raw.pull_request_url),
  url: raw.html_url,
  author: raw.user?.login ?? 'ghost',
  created_at: raw.created_at,
  path: raw.path,
  line: raw.line ?? raw.original_line ?? null,
  original_line: raw.original_line ?? null,
  side: raw.side,
  commit_id: raw.commit_id,
  original_commit_id: raw.original_commit_id,
  in_reply_to_id: raw.in_reply_to_id ?? null,
  diff_hunk: raw.diff_hunk,
  body: raw.body,
});

const scrapeComments = async (
  sinceIso: string,
  existingById: Map<number, CommentRecord>,
): Promise<Map<number, CommentRecord>> => {
  const commentsById = new Map(existingById);
  let page = 0;
  let url: string | undefined =
    `https://api.github.com/repos/${repositoryOwner}/${repositoryName}/pulls/comments?since=${encodeURIComponent(sinceIso)}&sort=created&direction=asc&per_page=${commentsPerPage}`;
  let stoppedEarly = false;

  while (url) {
    page += 1;
    const response = await fetchWithRetry(url);
    if (response.status === 401 || response.status === 403) {
      await failFatally(response, `GET ${url}`);
    }
    if (!response.ok) {
      await failFatally(response, `GET ${url}`);
    }

    const batch: unknown = await response.json();
    for (const raw of Array.isArray(batch) ? batch : []) {
      if (!isRawComment(raw) || isBotAuthor(raw.user)) {
        continue;
      }
      commentsById.set(raw.id, toCommentRecord(raw));
    }

    const remaining = response.headers.get('x-ratelimit-remaining');
    console.error(`page ${page}: kept ${commentsById.size} comments so far (rate-limit remaining ${remaining})`);

    if (commentsById.size >= maxCommentsTotal) {
      stoppedEarly = true;
      break;
    }

    url = parseNextLinkFromHeader(response.headers.get('link'));
  }

  if (stoppedEarly) {
    console.error(`Reached ${maxCommentsTotal} comments; stopped paging early (more may remain).`);
  }

  return commentsById;
};

const fetchPullRequest = async (prNumber: number): Promise<PrRecord> => {
  const url = `https://api.github.com/repos/${repositoryOwner}/${repositoryName}/pulls/${prNumber}`;
  const response = await fetchWithRetry(url);
  if (response.status === 401 || response.status === 403) {
    await failFatally(response, `GET ${url}`);
  }
  if (!response.ok) {
    await failFatally(response, `GET ${url}`);
  }
  const raw: unknown = await response.json();
  if (!isRawPr(raw)) {
    throw new Error(`GET ${url} returned a pull-request payload missing an expected field`);
  }
  return {
    number: raw.number,
    title: raw.title,
    author: raw.user?.login ?? 'ghost',
    merged: Boolean(raw.merged_at),
    base: raw.base.ref,
    created_at: raw.created_at,
    html_url: raw.html_url,
  };
};

const main = async (): Promise<void> => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setUTCFullYear(twelveMonthsAgo.getUTCFullYear() - 1);
  twelveMonthsAgo.setUTCHours(0, 0, 0, 0);
  const defaultSinceIso = twelveMonthsAgo.toISOString();

  const existingComments = loadExistingJsonl<CommentRecord>(commentsPath);
  const existingById = new Map(existingComments.map((comment) => [comment.id, comment]));

  let sinceIso = defaultSinceIso;
  if (existingComments.length > 0) {
    const newestCreatedAt = existingComments.reduce(
      (max, comment) => (comment.created_at > max ? comment.created_at : max),
      existingComments[0].created_at,
    );
    sinceIso = newestCreatedAt;
    console.error(`Resuming from existing ${commentsPath} (${existingComments.length} comments); since=${sinceIso}`);
  } else {
    console.error(`Starting fresh scrape; since=${sinceIso}`);
  }

  const commentsById = await scrapeComments(sinceIso, existingById);
  const commentRecords = [...commentsById.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));

  console.error(`Scraped ${commentRecords.length} human comments total.`);

  const existingPrs = loadExistingJsonl<PrRecord>(prsPath);
  const prsByNumber = new Map(existingPrs.map((pr) => [pr.number, pr]));

  const distinctPrNumbers = [...new Set(commentRecords.map((comment) => comment.pr))];
  const missingPrNumbers = distinctPrNumbers.filter((number) => !prsByNumber.has(number));

  console.error(`Fetching metadata for ${missingPrNumbers.length} PRs (of ${distinctPrNumbers.length} distinct).`);
  for (const [index, prNumber] of missingPrNumbers.entries()) {
    const pr = await fetchPullRequest(prNumber);
    prsByNumber.set(prNumber, pr);
    if ((index + 1) % 25 === 0 || index + 1 === missingPrNumbers.length) {
      console.error(`fetched PR metadata ${index + 1}/${missingPrNumbers.length}`);
    }
  }

  const prRecords = [...prsByNumber.values()]
    .filter((pr) => distinctPrNumbers.includes(pr.number))
    .sort((a, b) => a.number - b.number);

  writeJsonlAtomically(commentsPath, commentRecords);
  writeJsonlAtomically(prsPath, prRecords);

  console.error(`Wrote ${commentRecords.length} comments to ${commentsPath}`);
  console.error(`Wrote ${prRecords.length} PRs to ${prsPath}`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
