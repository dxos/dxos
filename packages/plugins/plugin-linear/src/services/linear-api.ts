//
// Copyright 2026 DXOS.org
//

// TODO(wittjosiah): Refactor to use a dfx-style Effect-native client.

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientError from '@effect/platform/HttpClientError';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ParseResult from 'effect/ParseResult';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import { Database, type Ref } from '@dxos/echo';
import { Connection } from '@dxos/plugin-connector';

import { LINEAR_API_URL } from '../constants';
import { LinearGraphQLError } from '../errors';

/** Stored as `AccessToken.token`; sent as `Authorization: Bearer <token>`. */
type LinearCredentialsValue = {
  token: string;
};

const USER_AGENT = '@dxos/plugin-linear';

//
// Subset schemas for the responses we care about
//

const ViewerSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.NullOr(Schema.String).pipe(Schema.optional),
});
export type Viewer = Schema.Schema.Type<typeof ViewerSchema>;

const TeamSchema = Schema.Struct({
  id: Schema.String,
  key: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String).pipe(Schema.optional),
});
export type Team = Schema.Schema.Type<typeof TeamSchema>;

const ProjectSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String).pipe(Schema.optional),
});
export type Project = Schema.Schema.Type<typeof ProjectSchema>;

/**
 * Linear workflow state types group user-defined states into a fixed set of
 * categories. We map by category, not by name, so renamed states keep working.
 * `triage` exists in some workspaces; treat it as backlog.
 */
const StateTypeSchema = Schema.Literal('triage', 'backlog', 'unstarted', 'started', 'completed', 'canceled');
export type StateType = Schema.Schema.Type<typeof StateTypeSchema>;

const IssueStateSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: StateTypeSchema,
});

const IssueAssigneeSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});

const IssueProjectRefSchema = Schema.Struct({
  id: Schema.String,
});

const IssueSchema = Schema.Struct({
  id: Schema.String,
  identifier: Schema.String,
  title: Schema.String,
  description: Schema.NullOr(Schema.String).pipe(Schema.optional),
  priority: Schema.Number.pipe(Schema.optional),
  estimate: Schema.NullOr(Schema.Number).pipe(Schema.optional),
  state: IssueStateSchema,
  assignee: Schema.NullOr(IssueAssigneeSchema).pipe(Schema.optional),
  project: Schema.NullOr(IssueProjectRefSchema).pipe(Schema.optional),
  createdAt: Schema.NullOr(Schema.String).pipe(Schema.optional),
  updatedAt: Schema.NullOr(Schema.String).pipe(Schema.optional),
});
export type Issue = Schema.Schema.Type<typeof IssueSchema>;

const PageInfoSchema = Schema.Struct({
  hasNextPage: Schema.Boolean,
  endCursor: Schema.NullOr(Schema.String).pipe(Schema.optional),
});

//
// Credentials service
//

/**
 * Layer-based credentials service. Mirrors plugin-github's pattern: every API
 * call pulls the token from this service rather than threading it through as
 * an explicit parameter.
 */
export class LinearCredentials extends Context.Tag('@dxos/plugin-linear/LinearCredentials')<
  LinearCredentials,
  LinearCredentialsValue
>() {
  static fromConnection = (connectionRef: Ref.Ref<Connection.Connection>) =>
    Layer.effect(
      LinearCredentials,
      Effect.gen(function* () {
        const connection = yield* Database.load(connectionRef);
        const accessToken = yield* Database.load(connection.accessToken);
        return { token: accessToken.token };
      }),
    );
}

//
// Request pipeline
//

type LinearEffect<T> = Effect.Effect<
  T,
  HttpClientError.HttpClientError | ParseResult.ParseError | Cause.TimeoutException | LinearGraphQLError,
  HttpClient.HttpClient | LinearCredentials
>;

const shouldRetry = (
  error: HttpClientError.HttpClientError | ParseResult.ParseError | Cause.TimeoutException | LinearGraphQLError,
): boolean => {
  if (error instanceof ParseResult.ParseError || LinearGraphQLError.is(error)) {
    return false;
  }
  if (Cause.isTimeoutException(error)) {
    return true;
  }
  if (error._tag === 'RequestError') {
    return true;
  }
  if (error.reason !== 'StatusCode') {
    return true;
  }
  const status = error.response.status;
  return status === 429 || (status >= 500 && status <= 599);
};

const withAuth = (req: HttpClientRequest.HttpClientRequest, creds: LinearCredentialsValue) =>
  req.pipe(
    HttpClientRequest.setHeader('Authorization', `Bearer ${creds.token}`),
    HttpClientRequest.setHeader('Content-Type', 'application/json'),
    HttpClientRequest.setHeader('User-Agent', USER_AGENT),
  );

const GraphQLEnvelope = <T>(dataSchema: Schema.Schema<T>) =>
  Schema.Struct({
    data: Schema.NullOr(dataSchema).pipe(Schema.optional),
    errors: Schema.Array(Schema.Struct({ message: Schema.String })).pipe(Schema.optional),
  });

/**
 * POST a GraphQL operation to Linear. Returns the typed `data` payload on
 * success, or fails with {@link LinearGraphQLError} when Linear replies 200 OK
 * with a non-empty `errors` array (which it does for permission/validation
 * issues — these are NOT transport-level failures).
 */
const linearGraphQL = <T>(
  query: string,
  variables: Record<string, unknown>,
  dataSchema: Schema.Schema<T>,
): LinearEffect<T> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const creds = yield* LinearCredentials;
    const clientNoTracer = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));
    const request = withAuth(HttpClientRequest.post(LINEAR_API_URL), creds).pipe(
      HttpClientRequest.bodyUnsafeJson({ query, variables }),
    );
    const envelopeSchema = GraphQLEnvelope(dataSchema);
    return yield* clientNoTracer.execute(request).pipe(
      Effect.flatMap((res) => Effect.flatMap(res.json, Schema.decodeUnknown(envelopeSchema))),
      Effect.flatMap((envelope) => {
        if (envelope.errors && envelope.errors.length > 0) {
          return Effect.fail(new LinearGraphQLError({ context: { messages: envelope.errors.map((e) => e.message) } }));
        }
        if (envelope.data == null) {
          return Effect.fail(new LinearGraphQLError({ context: { messages: ['empty data'] } }));
        }
        return Effect.succeed(envelope.data);
      }),
      Effect.timeout('15 seconds'),
      Effect.retry({
        schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.compose(Schedule.recurs(3))),
        while: shouldRetry,
      }),
      Effect.scoped,
    );
  });

//
// Pagination
//

/**
 * Linear list connections expose `nodes` + `pageInfo { hasNextPage endCursor }`.
 * Walk pages by re-issuing the query with `after: endCursor` until the server
 * reports no more pages or we hit `MAX_PAGES`.
 */
const MAX_PAGES = 20;
const PAGE_SIZE = 100;

const paginate = <T>(
  query: string,
  baseVariables: Record<string, unknown>,
  selectConnection: (data: any) => {
    nodes: readonly T[];
    pageInfo: { hasNextPage: boolean; endCursor?: string | null };
  },
  dataSchema: Schema.Schema<any, any>,
): LinearEffect<readonly T[]> =>
  Effect.gen(function* () {
    const out: T[] = [];
    let after: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const data = yield* linearGraphQL(
        query,
        { ...baseVariables, first: PAGE_SIZE, after },
        dataSchema as Schema.Schema<any>,
      );
      const conn = selectConnection(data);
      out.push(...conn.nodes);
      if (!conn.pageInfo.hasNextPage || !conn.pageInfo.endCursor) {
        break;
      }
      after = conn.pageInfo.endCursor;
    }
    return out;
  });

//
// API surface
//

const VIEWER_QUERY = /* GraphQL */ `
  query Viewer {
    viewer {
      id
      name
      email
    }
  }
`;

/** GET-equivalent — authenticated user profile for `onTokenCreated`. */
export const fetchViewer = (): LinearEffect<Viewer> =>
  linearGraphQL(VIEWER_QUERY, {}, Schema.Struct({ viewer: ViewerSchema })).pipe(Effect.map((d) => d.viewer));

const TEAMS_QUERY = /* GraphQL */ `
  query Teams($first: Int!, $after: String) {
    teams(first: $first, after: $after) {
      nodes {
        id
        key
        name
        description
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const TeamsConnectionSchema = Schema.Struct({
  teams: Schema.Struct({
    nodes: Schema.Array(TeamSchema),
    pageInfo: PageInfoSchema,
  }),
});

/** List teams reachable from the integration's token. */
export const fetchTeams = (): LinearEffect<readonly Team[]> =>
  paginate(TEAMS_QUERY, {}, (d) => d.teams, TeamsConnectionSchema);

const TEAM_PROJECTS_QUERY = /* GraphQL */ `
  query TeamProjects($teamId: String!, $first: Int!, $after: String) {
    team(id: $teamId) {
      projects(first: $first, after: $after) {
        nodes {
          id
          name
          description
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const TeamProjectsSchema = Schema.Struct({
  team: Schema.Struct({
    projects: Schema.Struct({
      nodes: Schema.Array(ProjectSchema),
      pageInfo: PageInfoSchema,
    }),
  }),
});

/** List projects for a team. */
export const fetchTeamProjects = (teamId: string): LinearEffect<readonly Project[]> =>
  paginate(TEAM_PROJECTS_QUERY, { teamId }, (d) => d.team.projects, TeamProjectsSchema);

/**
 * List issues for a team. `since` is an optional ISO timestamp; when set,
 * filters the GraphQL connection to issues with `updatedAt >= since`. When
 * unset (default), pulls every issue Linear returns for the team.
 */
const TEAM_ISSUES_QUERY = /* GraphQL */ `
  query TeamIssues($teamId: String!, $first: Int!, $after: String, $filter: IssueFilter) {
    team(id: $teamId) {
      issues(first: $first, after: $after, filter: $filter) {
        nodes {
          id
          identifier
          title
          description
          priority
          estimate
          state {
            id
            name
            type
          }
          assignee {
            id
            name
          }
          project {
            id
          }
          createdAt
          updatedAt
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const TeamIssuesSchema = Schema.Struct({
  team: Schema.Struct({
    issues: Schema.Struct({
      nodes: Schema.Array(IssueSchema),
      pageInfo: PageInfoSchema,
    }),
  }),
});

export const fetchTeamIssues = (teamId: string, options: { since?: string } = {}): LinearEffect<readonly Issue[]> => {
  const filter = options.since ? { updatedAt: { gte: options.since } } : undefined;
  return paginate(TEAM_ISSUES_QUERY, { teamId, filter }, (d) => d.team.issues, TeamIssuesSchema);
};

//
// Mappers
//

/**
 * Map a Linear workflow-state category to a {@link Task} status. Linear has
 * five categories (plus an optional `triage`); the Task model has three. The
 * mapping is intentionally lossy and one-way — we don't push status back, so
 * round-trip ambiguity isn't an issue in pull-only mode.
 */
export const stateTypeToTaskStatus = (type: StateType): 'todo' | 'in-progress' | 'done' => {
  switch (type) {
    case 'started':
      return 'in-progress';
    case 'completed':
    case 'canceled':
      return 'done';
    case 'triage':
    case 'backlog':
    case 'unstarted':
    default:
      return 'todo';
  }
};

/**
 * Linear priorities are 0–4 (0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low).
 * Map to `Task.priority`'s string enum. Returns undefined for No priority so
 * the field stays empty rather than reading as "none" deliberately set.
 */
export const priorityNumberToTaskPriority = (
  priority: number | undefined,
): 'low' | 'medium' | 'high' | 'urgent' | undefined => {
  switch (priority) {
    case 1:
      return 'urgent';
    case 2:
      return 'high';
    case 3:
      return 'medium';
    case 4:
      return 'low';
    default:
      return undefined;
  }
};

/**
 * Reverse of {@link priorityNumberToTaskPriority}. Used when pushing local
 * priority edits back to Linear. We never produce 0 (No priority) on push —
 * the Task model treats absent as "no opinion", so a round-tripped issue
 * keeps whatever priority it had on Linear if local has none.
 */
export const taskPriorityToPriorityNumber = (
  priority: 'none' | 'low' | 'medium' | 'high' | 'urgent' | undefined,
): 1 | 2 | 3 | 4 | undefined => {
  switch (priority) {
    case 'urgent':
      return 1;
    case 'high':
      return 2;
    case 'medium':
      return 3;
    case 'low':
      return 4;
    case 'none':
    default:
      return undefined;
  }
};

/**
 * Reverse of {@link stateTypeToTaskStatus}. Used to pick a Linear workflow
 * state when pushing a local status change. The Task → state-type mapping is
 * lossy in one direction (canceled and completed both map to `done`), so on
 * push we pick a single canonical Linear state-type per Task status:
 *
 * - `todo`        → `unstarted`
 * - `in-progress` → `started`
 * - `done`        → `completed`
 *
 * Callers resolve the resulting state-type to an actual workflow-state ID via
 * {@link fetchTeamWorkflowStates} per team.
 */
export const taskStatusToStateType = (status: 'todo' | 'in-progress' | 'done'): StateType => {
  switch (status) {
    case 'in-progress':
      return 'started';
    case 'done':
      return 'completed';
    case 'todo':
    default:
      return 'unstarted';
  }
};

//
// Workflow states (needed to map Task.status → Linear state ID on push)
//

const WorkflowStateSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: StateTypeSchema,
});
export type WorkflowState = Schema.Schema.Type<typeof WorkflowStateSchema>;

const TEAM_WORKFLOW_STATES_QUERY = /* GraphQL */ `
  query TeamWorkflowStates($teamId: String!, $first: Int!, $after: String) {
    team(id: $teamId) {
      states(first: $first, after: $after) {
        nodes {
          id
          name
          type
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const TeamWorkflowStatesSchema = Schema.Struct({
  team: Schema.Struct({
    states: Schema.Struct({
      nodes: Schema.Array(WorkflowStateSchema),
      pageInfo: PageInfoSchema,
    }),
  }),
});

/**
 * List workflow states (Backlog, In Progress, Done, etc.) for a team. Each
 * state has a `type` (the cross-workspace category) plus an `id` we can pass
 * to `issueUpdate(stateId: ...)`. State names are workspace-customisable; we
 * never match by name on push.
 */
export const fetchTeamWorkflowStates = (teamId: string): LinearEffect<readonly WorkflowState[]> =>
  paginate(TEAM_WORKFLOW_STATES_QUERY, { teamId }, (d) => d.team.states, TeamWorkflowStatesSchema);

//
// Mutations
//

const ISSUE_UPDATE_MUTATION = /* GraphQL */ `
  mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        id
      }
    }
  }
`;

const IssueUpdateResponseSchema = Schema.Struct({
  issueUpdate: Schema.Struct({
    success: Schema.Boolean,
    issue: Schema.NullOr(Schema.Struct({ id: Schema.String })).pipe(Schema.optional),
  }),
});

/**
 * Update fields on a Linear issue. All input fields are optional; only fields
 * explicitly set are sent (so `description: undefined` is dropped, vs. `null`
 * or empty string which Linear treats as a clear).
 *
 * `stateId` must be a state from the issue's team — see
 * {@link fetchTeamWorkflowStates}. `priority` is the 0–4 numeric form (use
 * {@link taskPriorityToPriorityNumber}); `estimate` is the team's estimate
 * unit (typically points).
 *
 * Fails with {@link LinearGraphQLError} when Linear returns `success: false`
 * or the GraphQL envelope contains errors (e.g. token lacks `write` scope).
 */
/**
 * `description`, `priority`, and `estimate` accept `null` to clear the field
 * on Linear. `undefined` means "leave unchanged" — Linear treats the two
 * distinctly. `title` and `stateId` cannot meaningfully be cleared.
 */
export type IssueUpdateInput = {
  title?: string;
  description?: string | null;
  stateId?: string;
  priority?: number | null;
  estimate?: number | null;
};

export const updateIssue = (id: string, input: IssueUpdateInput): LinearEffect<void> =>
  Effect.gen(function* () {
    const response = yield* linearGraphQL(ISSUE_UPDATE_MUTATION, { id, input }, IssueUpdateResponseSchema);
    if (!response.issueUpdate.success) {
      return yield* Effect.fail(
        new LinearGraphQLError({
          context: { messages: [`issueUpdate(${id}) returned success=false`], variables: { id, input } },
        }),
      );
    }
  });

const PROJECT_UPDATE_MUTATION = /* GraphQL */ `
  mutation ProjectUpdate($id: String!, $input: ProjectUpdateInput!) {
    projectUpdate(id: $id, input: $input) {
      success
      project {
        id
      }
    }
  }
`;

const ProjectUpdateResponseSchema = Schema.Struct({
  projectUpdate: Schema.Struct({
    success: Schema.Boolean,
    project: Schema.NullOr(Schema.Struct({ id: Schema.String })).pipe(Schema.optional),
  }),
});

export type ProjectUpdateInput = {
  name?: string;
  description?: string | null;
};

/** Update fields on a Linear project. Same semantics as {@link updateIssue}. */
export const updateProject = (id: string, input: ProjectUpdateInput): LinearEffect<void> =>
  Effect.gen(function* () {
    const response = yield* linearGraphQL(PROJECT_UPDATE_MUTATION, { id, input }, ProjectUpdateResponseSchema);
    if (!response.projectUpdate.success) {
      return yield* Effect.fail(
        new LinearGraphQLError({
          context: { messages: [`projectUpdate(${id}) returned success=false`], variables: { id, input } },
        }),
      );
    }
  });
