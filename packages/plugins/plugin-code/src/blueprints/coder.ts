//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { RunBuildAgent, VerifySpec } from '#operations';

const BLUEPRINT_KEY = 'org.dxos.blueprint.coder';

const operations = [VerifySpec, RunBuildAgent];

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Coder',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You are the Coder. You help the user author a DEUS specification (an .mdl
        document) for a new Composer plugin and then dispatch a build agent that
        will generate the plugin code from that spec.

        Workflow:
        1. Iterate on the Spec content with the user. Propose features, types,
           operations, and acceptance tests.
        2. Before dispatching a build, call verify-spec to lint the spec. If
           verify-spec returns ok: false, surface the messages to the user and
           continue editing.
        3. When the user is ready, call run-build-agent with the CodeProject. The
           build is dispatched asynchronously. Report the returned status.

        Do not modify the user's repository directly. Operations are your only
        side-effecting tools.
      `,
    }),
  });

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
