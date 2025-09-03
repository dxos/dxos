import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { DatabaseService, defineFunction } from '@dxos/functions';
import { failedInvariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';
import { FetchHttpClient, HttpClient } from '@effect/platform';
import { Array, Effect, Order, pipe, Predicate, Schema } from 'effect';
import { apiKeyAuth, graphqlRequestBody } from '../../util';

const query = `
query Team($teamId: String!, $after: DateTimeOrDuration!) {
  team(id: $teamId) {
    id
    name


   issues(last: 50, orderBy: updatedAt, filter: {
    updatedAt: { gt: $after }
   }) {
    edges {
        node {
            id
            title
            createdAt
            updatedAt
            description
            assignee { name }
            state { 
                name
            }
            project {
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
  project: { name: string };
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

    const { objects: existingTasks } = yield* DatabaseService.runQuery(Query.type(DataType.Task));
    log.info('existing tasks', { count: existingTasks.length });
    const after = pipe(
      existingTasks,
      Array.filter((task) => Obj.getKeys(task, LINEAR_TEAM_ID_KEY).at(0)?.id === data.team),
      Array.map((task) => Obj.getKeys(task, LINEAR_UPDATED_AT_KEY).at(0)?.id),
      Array.filter((x) => x !== undefined),
      Array.reduce('2025-01-01T00:00:00.000Z', (acc: string, x: string) => (x > acc ? x : acc)),
    );
    log.info('will fetch', { after });

    const response = yield* client.post('https://api.linear.app/graphql', {
      body: yield* graphqlRequestBody(query, {
        teamId: data.team,
        after,
      }),
    });
    const json: any = yield* response.json;
    const tasks = json.data.team.issues.edges.map((edge: any) =>
      mapLinearIssue(edge.node as LinearIssue, { teamId: data.team }),
    );
    log.info('Fetched tasks', { count: tasks.length });

    // for (const task of tasks) {
    //   if (task.assignee?.target) {
    //     // TODO(dmaretskyi): Handle refs inside `syncObjects`.
    //     const [assignee] = yield* syncObjects([task.assignee.target], { foreignKeyId: LINEAR_ID_KEY });
    //     task.assignee = Ref.make(assignee);
    //   }
    // }
    return yield* syncObjects(tasks, { foreignKeyId: LINEAR_ID_KEY });
  }, Effect.provide(FetchHttpClient.layer)),
});

// TODO(dmaretskyi): Extract as a generic sync function.
const syncObjects: (
  objs: Obj.Any[],
  opts: { foreignKeyId: string },
) => Effect.Effect<Obj.Any[], never, DatabaseService> = Effect.fn('syncObjects')(function* (objs, { foreignKeyId }) {
  return yield* Effect.forEach(
    objs,
    Effect.fnUntraced(function* (obj) {
      const schema = Obj.getSchema(obj) ?? failedInvariant('No schema.');
      const foreignId = Obj.getKeys(obj, foreignKeyId)[0]?.id ?? failedInvariant('No foreign key.');
      const {
        objects: [existing],
      } = yield* DatabaseService.runQuery(
        Query.select(Filter.foreignKeys(schema, [{ source: foreignKeyId, id: foreignId }])),
      );
      log('sync object', { type: Obj.getTypename(obj), foreignId, existing: existing?.id });
      if (!existing) {
        yield* DatabaseService.add(obj);
        return obj;
      } else {
        copyObjectData(existing, obj);
        return existing;
      }
    }),
    { concurrency: 1 },
  );
});

const copyObjectData = (existing: Obj.Any, newObj: Obj.Any) => {
  for (const key of Object.keys(newObj)) {
    if (typeof key !== 'string' || key === 'id') continue;
    (existing as any)[key] = (newObj as any)[key];
  }
  for (const key of Object.keys(existing)) {
    if (typeof key !== 'string' || key === 'id') continue;
    if (!(key in newObj)) {
      delete (existing as any)[key];
    }
  }
  for (const foreignKey of Obj.getMeta(newObj).keys) {
    Obj.deleteKeys(existing, foreignKey.source);
    // TODO(dmaretskyi): Doesn't work: `Obj.getMeta(existing).keys.push(foreignKey);`
    Obj.getMeta(existing).keys.push({ ...foreignKey });
  }
};

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
    // assigned: !issue.assignee ? undefined : Ref.make(mapLinearPerson(issue.assignee)),
    // state: issue.state.name,
    // project: issue.project.name,
  });
