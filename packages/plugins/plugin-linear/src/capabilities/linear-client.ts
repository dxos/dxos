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
import { Task } from '@dxos/types';

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
      priority: number;
      state: { name: string } | null;
      team: { key: string } | null;
      assignee: { displayName: string } | null;
      labels: { nodes: { name: string }[] } | null;
    }[];
  };
};

/** Map Linear state names to Composer Task status. */
const mapStatus = (linearState: string | undefined): 'todo' | 'in-progress' | 'done' | undefined => {
  if (!linearState) {
    return undefined;
  }
  const lower = linearState.toLowerCase();
  if (lower === 'done' || lower === 'completed' || lower === 'closed' || lower === 'merged') {
    return 'done';
  }
  if (lower === 'in progress' || lower === 'started' || lower === 'in review') {
    return 'in-progress';
  }
  return 'todo';
};

/** Map Linear priority (1=urgent..4=low, 0=none) to Task priority. */
const mapPriority = (linearPriority: number | undefined): 'urgent' | 'high' | 'medium' | 'low' | 'none' => {
  switch (linearPriority) {
    case 1: return 'urgent';
    case 2: return 'high';
    case 3: return 'medium';
    case 4: return 'low';
    default: return 'none';
  }
};

/**
 * Fetch recent Linear issues and return them as Composer Task objects.
 * Each Task has a foreignKey (`source: 'linear.app'`) for 2-way sync.
 * The `identifier` (e.g. "BLU-1") is prepended to the title for context.
 */
export const fetchRecentIssues = async (
  auth: LinearAuth,
  first = 25,
): Promise<Task.Task[]> => {
  const query = `
    query RecentIssues($first: Int!) {
      issues(first: $first, orderBy: updatedAt) {
        nodes {
          id
          identifier
          title
          description
          updatedAt
          priority
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
    Task.make({
      [Obj.Meta]: {
        keys: [{ id: issue.id, source: 'linear.app' }],
      },
      title: `[${issue.identifier}] ${issue.title}`,
      description: issue.description ?? undefined,
      status: mapStatus(issue.state?.name),
      priority: mapPriority(issue.priority),
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
