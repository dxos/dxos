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
  // TODO(linear): migrate to the AccessToken/credential-store pattern used by
  // plugin-inbox so the API key isn't exposed to XSS via localStorage. Tracked
  // in plans/adopt-access-token-for-sync-plugins.md.
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
  // Read body as text first so a non-JSON error page (rate-limit HTML, proxy,
  // auth gateway) surfaces the real HTTP status instead of a SyntaxError from
  // response.json().
  const text = await response.text();
  let body: { data?: T; errors?: { message: string }[] } = {};
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`linear ${response.status}: ${text.slice(0, 200)}`);
    }
  }
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
      // Fetch stable `type` enum (backlog/unstarted/started/completed/
      // canceled/triage) rather than user-editable `name`. Teams routinely
      // rename states ("Done" → "Shipped") which silently broke status mapping.
      state: { type: string } | null;
      team: { key: string } | null;
      assignee: { displayName: string } | null;
      labels: { nodes: { name: string }[] } | null;
    }[];
  };
};

/** Map Linear WorkflowState.type enum to Composer Task status. */
const mapStatus = (linearStateType: string | undefined): 'todo' | 'in-progress' | 'done' | undefined => {
  switch (linearStateType) {
    case 'completed':
    case 'canceled':
      return 'done';
    case 'started':
      return 'in-progress';
    case 'backlog':
    case 'unstarted':
    case 'triage':
      return 'todo';
    default:
      return undefined;
  }
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
          state { type }
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
      status: mapStatus(issue.state?.type),
      priority: mapPriority(issue.priority),
    }),
  );
};

/** Reverse-map Composer Task status back to Linear workflow state name. */
const reverseMapStatus = (status: string | undefined): string | undefined => {
  switch (status) {
    case 'done': return 'Done';
    case 'in-progress': return 'In Progress';
    case 'todo': return 'Todo';
    default: return undefined;
  }
};

/** Reverse-map Composer Task priority back to Linear priority number. */
const reverseMapPriority = (priority: string | undefined): number | undefined => {
  switch (priority) {
    case 'urgent': return 1;
    case 'high': return 2;
    case 'medium': return 3;
    case 'low': return 4;
    case 'none': return 0;
    default: return undefined;
  }
};

/** Update a Linear issue's status and/or priority. */
export const updateIssue = async (
  auth: LinearAuth,
  issueId: string,
  updates: { status?: string; priority?: string; title?: string },
): Promise<void> => {
  const input: Record<string, unknown> = {};

  if (updates.priority !== undefined) {
    const mapped = reverseMapPriority(updates.priority);
    if (mapped !== undefined) {
      input.priority = mapped;
    }
  }

  if (updates.title !== undefined) {
    const raw = updates.title.replace(/^\[[\w-]+\]\s*/, '');
    input.title = raw;
  }

  if (updates.status !== undefined) {
    const stateName = reverseMapStatus(updates.status);
    if (stateName) {
      const statesQuery = `
        query IssueStates($issueId: String!) {
          issue(id: $issueId) {
            team { states { nodes { id name } } }
          }
        }
      `;
      type StatesResponse = { issue: { team: { states: { nodes: { id: string; name: string }[] } } } };
      const statesData = await graphql<StatesResponse>(auth, statesQuery, { issueId });
      const stateNode = statesData.issue.team.states.nodes.find(
        (s) => s.name.toLowerCase() === stateName.toLowerCase(),
      );
      if (stateNode) {
        input.stateId = stateNode.id;
      }
    }
  }

  if (Object.keys(input).length === 0) {
    return;
  }

  const mutation = `
    mutation UpdateIssue($issueId: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $issueId, input: $input) {
        success
      }
    }
  `;
  const result = await graphql<{ issueUpdate: { success: boolean } }>(auth, mutation, { issueId, input });
  if (!result.issueUpdate.success) {
    throw new Error(`linear: issueUpdate returned success=false for ${issueId}`);
  }
  // Log only the field names that changed, not their values — titles and
  // priority-change patterns can be sensitive in some workspaces.
  log.info('linear: updated issue', { issueId, fields: Object.keys(input) });
};

/** One-shot auth check — returns the viewer's display name on success. */
export const whoAmI = async (auth: LinearAuth): Promise<string> => {
  type Response = { viewer: { displayName: string } };
  const data = await graphql<Response>(auth, 'query { viewer { displayName } }');
  log.info('linear: authenticated');
  return data.viewer.displayName;
};
