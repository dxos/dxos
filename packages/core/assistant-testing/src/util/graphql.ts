import { HttpBody } from '@effect/platform';

/**
 * Template tag literal to get syntax highlighting for the query.
 *
 * @example
 * ```ts
 * const query = gql`
 *   query Team($teamId: String!) {
 *     team(id: $teamId) {
 *       id
 *       name
 *     }
 *   }
 * `;
 * ```
 */
export const gql = (query: string) => query;

/**
 * @returns JSON body for the graphql request.
 */
export const graphqlRequestBody = (query: string, variables: Record<string, any> = {}) =>
  HttpBody.json({
    query,
    variables,
  });
