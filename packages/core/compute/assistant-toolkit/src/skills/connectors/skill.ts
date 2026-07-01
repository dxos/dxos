//
// Copyright 2026 DXOS.org
//

import { Skill } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

const SKILL_KEY = 'org.dxos.skill.connectors';

/**
 * Instructs the model to surface a connector prompt when a request needs a service the user has not
 * connected, rather than failing silently. The prompt is rendered inline in the conversation by the
 * `integration-prompt` surface, which offers to authenticate the matching connector.
 */
const instructions = trim`
  Users connect external services (such as Gmail, Slack, GitHub, Linear, and Discord) through connectors.
  A service is available to you only when a connection to it already exists in the current space.

  When a request needs a service that is not connected, DO NOT fail, refuse, or apologize. Instead, render
  a connector prompt so the user can connect it inline. Emit a self-closing surface tag with the
  'integration-prompt' role and the service's domain:

  <surface role='integration-prompt' data='{"service":"gmail.com"}' />

  Use the service's domain as the 'service' value (for example 'gmail.com', 'slack.com', 'github.com').
  Emit the surface once, then briefly tell the user that connecting the service will let you continue.
`;

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Connectors',
    description: 'Prompt the user to connect external services when a connector is required but unavailable.',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
