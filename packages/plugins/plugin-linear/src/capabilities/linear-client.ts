//
// Copyright 2026 DXOS.org
//

/**
 * Minimal Linear GraphQL client — enough to fetch recent issues for the
 * demo. Designed to be called from browser code; authentication is a
 * personal API key pulled from localStorage (`LINEAR_API_KEY`).
 *
 * Linear's GraphQL endpoint supports CORS for direct browser calls with
 * the Authorization header, so no dev-proxy is needed.
 */

import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';

import { Linear } from '../types';

const LINEAR_GRAPHQL = 'https://api.linear.app/graphql';

export type LinearAuth = { readonly apiKey: string };

export const readLinearAuth = (): LinearAuth | undefined => {
  const apiKey = globalThis.localStorage?.getItem('LINEAR_API_KEY');
  if (!apiKey) {
    return undefined;
  }
  return { apiKey };
};

const graphql = async <T>(auth: LinearAuth, query: string, variables?: Record<string, unknown>): Promise<T> => {
  const response = await fetch(LINEAR_GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth.apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (!response.ok || body.errors) {
    const message = body.errors?.map((entry) => entry.message).join('; ') ?? `linear ${response.status}`;
    throw new Error(message);
  }
  if (!body.data) {
    throw new Error('linear: empty response');
  }
  return body.data;
};

type RecentIssuesResponse = {
  issues: {
    nodes: {
      id: string;
      identifier: string;
      title: string;
      description: string | null;
      updatedAt: string;
      state: { name: string } | null;
      team: { key: string } | null;
      assignee: { displayName: string } | null;
      labels: { nodes: { name: string }[] } | null;
    }[];
  };
};

/**
 * Fetch the most recently updated issues across the workspace, limited to
 * `first`. Shaped for the demo's "activity feed" angle — no pagination.
 */
export const fetchRecentIssues = async (
  auth: LinearAuth,
  first = 25,
): Promise<Linear.LinearIssue[]> => {
  const query = `
    query RecentIssues($first: Int!) {
      issues(first: $first, orderBy: updatedAt) {
        nodes {
          id
          identifier
          title
          description
          updatedAt
          state { name }
          team { key }
          assignee { displayName }
          labels { nodes { name } }
        }
      }
    }
  `;
  const data = await graphql<RecentIssuesResponse>(auth, query, { first });
  return data.issues.nodes.map((issue) =>
    Obj.make(Linear.LinearIssue, {
      linearIssueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description ?? undefined,
      state: issue.state?.name?.toLowerCase(),
      teamKey: issue.team?.key,
      assignee: issue.assignee?.displayName,
      updatedAt: issue.updatedAt,
      labels: (issue.labels?.nodes ?? []).map((entry) => entry.name),
    }),
  );
};

/** One-shot auth check — returns the viewer's display name on success. */
export const whoAmI = async (auth: LinearAuth): Promise<string> => {
  type Response = { viewer: { displayName: string } };
  const data = await graphql<Response>(auth, 'query { viewer { displayName } }');
  log.info('linear: authenticated', { viewer: data.viewer.displayName });
  return data.viewer.displayName;
};
