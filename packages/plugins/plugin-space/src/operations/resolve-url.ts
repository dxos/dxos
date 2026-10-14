//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import * as Operation from '@dxos/compute/Operation';
import { Key, Ref } from '@dxos/echo';

import { SpaceOperation } from '#types';

import { SpaceOperationError } from './errors.ts';

// Graph-free on purpose: MCP hosts (EDGE, the CLI) have no app graph to resolve node paths against.
const handler: Operation.WithHandler<typeof SpaceOperation.ResolveUrl> = SpaceOperation.ResolveUrl.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ url }) {
      const pathname = yield* toPathname(url);
      const leading = UrlPath.readWorkspace(pathname);
      if (Option.isNone(leading)) {
        return yield* Effect.fail(
          new SpaceOperationError({ message: `Not a Composer URL (no /w/<space> path): ${url}` }),
        );
      }
      const spaceId = Key.SpaceId.isValid(leading.value) ? leading.value : undefined;
      // A non-space workspace (e.g. settings) holds no objects to reference.
      const objects = UrlPath.readReferences(pathname).flatMap(({ key, entityId, workspace }) =>
        Key.SpaceId.isValid(workspace)
          ? [{ key, object: Ref.fromURI(Key.EID.make({ spaceId: workspace, entityId })) }]
          : [],
      );
      return { ...(spaceId ? { spaceId } : {}), objects };
    }),
  ),
);

export default handler;

/**
 * The app pathname a URL addresses. A custom-scheme deep link (`composer://w/...`) parses its first
 * segment as the host, so it is put back in front of the path.
 */
const toPathname = (url: string): Effect.Effect<string, SpaceOperationError> =>
  Effect.try({
    try: () => {
      const parsed = new URL(url, 'https://composer.invalid');
      return parsed.protocol !== 'https:' && parsed.protocol !== 'http:' && parsed.hostname
        ? `/${parsed.hostname}${parsed.pathname}`
        : parsed.pathname;
    },
    catch: () => new SpaceOperationError({ message: `Invalid URL: ${url}` }),
  });
