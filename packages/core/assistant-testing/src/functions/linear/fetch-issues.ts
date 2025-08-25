import { CredentialsService, defineFunction, type CredentialQuery } from '@dxos/functions';
import { HttpBody, HttpClient, HttpClientRequest } from '@effect/platform';
import { Effect, Redacted, Schema } from 'effect';
import { apiKeyAuth, graphqlRequestBody } from '../../util';

const query = `
query Team($teamId: String!) {
  team(id: $teamId) {
    id
    name


   issues(first: 50, orderBy: updatedAt) {
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

export default defineFunction({
  name: 'dxos.org/function/linear/fetch-issues',
  description: 'Fetches issues from Linear.',
  inputSchema: Schema.Struct({
    team: Schema.String.annotations({
      description: 'Linear team id.',
    }),
  }),
  handler: Effect.fnUntraced(function* ({ data }) {
    const client = yield* HttpClient.HttpClient.pipe(Effect.map(apiKeyAuth({ service: 'linear.app' })));

    const response = yield* client.post('https://api.linear.app/graphql', {
      body: yield* graphqlRequestBody(query, {
        teamId: data.team,
      }),
    });
    const json: any = yield* response.json;
    return json.data.team.issues.edges.map((edge: any) => edge.node);
  }),
});
