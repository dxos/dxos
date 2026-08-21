//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { SpaceOperation } from '#types';

export const key = 'org.dxos.skill.space';

/**
 * The skill's verbs; listing them here is what makes them reachable (the skill definition is the
 * atomic unit of projection).
 *
 * TODO(wittjosiah): Fold `whoami` in as an operation here — it is the last tool an MCP host writes
 *   by hand, and it answers the same session question `querySpaces` does. It needs the session's
 *   identity to reach a handler as a service first: EDGE resolves it from an OAuth grant in its MCP
 *   worker, not from a client in the worker that runs operations.
 */
export const operations = [SpaceOperation.QuerySpaces];

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Space',
    description: 'Find the spaces available to work in, and which one a call should target.',
    agentCanEnable: true,
    mcpPrompt: true,
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        A space is a container of objects, shared with the people who are members of it. Objects
        live in exactly one space, so every read or write is addressed to one.

        # Choosing a space
        - Query the spaces before the first space-addressed call of a session; you cannot guess an id.
        - Refer to a space by name when talking to the user, and pass its id when calling a tool.
        - A member count above one means the space is shared: what you write there is visible to
          the other members.
        - Ask the user which space to use when the request does not name one and more than one fits.
      `,
    }),
  });
