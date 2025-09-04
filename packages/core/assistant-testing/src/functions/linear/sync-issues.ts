//
// Copyright 2025 DXOS.org
//

import { FetchHttpClient, HttpClient } from '@effect/platform';
import { Array, Effect, Schema, pipe } from 'effect';

import { Obj, Query, Ref, Type, Filter } from '@dxos/echo';
import { DatabaseService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { syncObjects } from '../../sync';
import { apiKeyAuth, graphqlRequestBody } from '../../util';

const queryIssues = `
query Issues($teamId: String!, $after: DateTimeOrDuration!) {
  team(id: $teamId) {
    id
    name


   issues(last: 150, orderBy: updatedAt, filter: {
    updatedAt: { gt: $after }
   }) {
    edges {
        node {
            id
            title
            createdAt
            updatedAt
            description
            assignee { id, name }
            state { 
                name
            }
            project {
                id
                name
            }
        }
        cursor
    }
    pageInfo {
        hasNextPage
        endCursor
    }
    }
  }
}
`;

type LinearIssue = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  assignee: LinearPerson;
  state: { name: string };
  project: { id: string; name: string };
};

type LinearPerson = {
  id: string;
  name: string;
};

export const LINEAR_ID_KEY = 'linear.app/id';
export const LINEAR_TEAM_ID_KEY = 'linear.app/teamId';
export const LINEAR_UPDATED_AT_KEY = 'linear.app/updatedAt';

export default defineFunction({
  name: 'dxos.org/function/linear/sync-issues',
  description: 'Sync issues from Linear.',
  inputSchema: Schema.Struct({
    team: Schema.String.annotations({
      description: 'Linear team id.',
    }),
  }),
  handler: Effect.fnUntraced(function* ({ data }) {
    const client = yield* HttpClient.HttpClient.pipe(Effect.map(apiKeyAuth({ service: 'linear.app' })));

    // Get the timestamp that was previosly synced.
    const after = yield* getLatestUpdateTimestamp(data.team, DataType.Task);
    log.info('will fetch', { after });

    // Fetch the issues that have changed since the last sync.
    const response = yield* client.post('https://api.linear.app/graphql', {
      body: yield* graphqlRequestBody(queryIssues, {
        teamId: data.team,
        after,
      }),
    });
    const json: any = yield* response.json;
    const tasks = (json.data.team.issues.edges as any[]).map((edge: any) =>
      mapLinearIssue(edge.node as LinearIssue, { teamId: data.team }),
    );
    log.info('Fetched tasks', { count: tasks.length });

    // Synchronize new objects with ECHO.
    return {
      objects: yield* syncObjects(tasks, { foreignKeyId: LINEAR_ID_KEY }),
      syncComplete: tasks.length < 150,
    };
  }, Effect.provide(FetchHttpClient.layer)),
});

const getLatestUpdateTimestamp: (
  teamId: string,
  dataType: Type.Obj.Any,
) => Effect.Effect<string, never, DatabaseService> = Effect.fnUntraced(function* (teamId, dataType) {
  const { objects: existingTasks } = yield* DatabaseService.runQuery(
    Query.type(dataType).select(Filter.foreignKeys(dataType, [{ source: LINEAR_TEAM_ID_KEY, id: teamId }])),
  );
  return pipe(
    existingTasks,
    Array.map((task) => Obj.getKeys(task, LINEAR_UPDATED_AT_KEY).at(0)?.id),
    Array.filter((x) => x !== undefined),
    Array.reduce('2025-01-01T00:00:00.000Z', (acc: string, x: string) => (x > acc ? x : acc)),
  );
});

const mapLinearPerson = (person: LinearPerson, { teamId }: { teamId: string }): DataType.Person =>
  Obj.make(DataType.Person, {
    [Obj.Meta]: {
      keys: [
        {
          id: person.id,
          source: LINEAR_ID_KEY,
        },
        {
          id: teamId,
          source: LINEAR_TEAM_ID_KEY,
        },
      ],
    },
    nickname: person.name,
  });

const mapLinearIssue = (issue: LinearIssue, { teamId }: { teamId: string }): DataType.Task =>
  Obj.make(DataType.Task, {
    [Obj.Meta]: {
      keys: [
        {
          id: issue.id,
          source: LINEAR_ID_KEY,
        },
        {
          id: issue.updatedAt,
          source: LINEAR_UPDATED_AT_KEY,
        },
        {
          id: teamId,
          source: LINEAR_TEAM_ID_KEY,
        },
      ],
    },
    title: issue.title ?? undefined,
    description: issue.description ?? undefined,
    assigned: !issue.assignee ? undefined : Ref.make(mapLinearPerson(issue.assignee, { teamId })),
    // TODO(dmaretskyi): Sync those (+ linear team as org?).
    // state: issue.state.name,

    project: !issue.project
      ? undefined
      : Ref.make(
          Obj.make(DataType.Project, {
            [Obj.Meta]: {
              keys: [
                {
                  id: issue.project.id,
                  source: LINEAR_ID_KEY,
                },
                {
                  id: teamId,
                  source: LINEAR_TEAM_ID_KEY,
                },
              ],
            },
            name: issue.project.name,
          }),
        ),
  });
