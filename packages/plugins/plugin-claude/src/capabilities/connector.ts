//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import {
  API_KEY_PREFIX,
  CLAUDE_CODE_CONNECTOR_ID,
  CLAUDE_CODE_TOKEN_SOURCE,
  OAUTH_TOKEN_PREFIX,
} from '../constants.ts';
import { ClaudeCodeTokenInvalidError } from '../errors.ts';

const LABEL = 'Claude Code';

// The form shows the description as the field's placeholder, so it stays short enough to read whole.
const TokenForm = ConnectorSpec.TokenForm({
  title: 'Token from `claude setup-token`',
  description: 'Run it in a terminal, then paste the token here',
});

/**
 * Only the token's shape is checked: the token is an OAuth bearer for Claude Code, which a direct call from
 * the browser cannot exercise, and an API key pasted here belongs in the Anthropic connector instead.
 */
const validate = (token: string): Effect.Effect<void, ClaudeCodeTokenInvalidError> =>
  token.startsWith(OAUTH_TOKEN_PREFIX)
    ? Effect.void
    : Effect.fail(
        new ClaudeCodeTokenInvalidError(
          token.startsWith(API_KEY_PREFIX)
            ? {
                message:
                  'This is an Anthropic API key; connect it as Anthropic instead. For Claude Code, run ' +
                  '`claude setup-token` in a terminal and paste the token it prints.',
              }
            : undefined,
        ),
      );

/**
 * Claude Code on a Claude subscription: a long-lived token from `claude setup-token`, kept apart from the
 * Anthropic API key under its own source so it is only ever sent as a bearer.
 */
export const ClaudeCodeConnector: ConnectorSpec.ConnectorEntry = {
  id: CLAUDE_CODE_CONNECTOR_ID,
  source: CLAUDE_CODE_TOKEN_SOURCE,
  label: LABEL,
  credentialForm: {
    schema: TokenForm,
    defaultValues: { token: '' },
    onValidate: ({ values }) => validate(values.token.trim()),
    onSubmit: ({ values, connector }) =>
      Effect.sync(() => {
        const accessToken = Obj.make(AccessToken.AccessToken, {
          source: CLAUDE_CODE_TOKEN_SOURCE,
          token: values.token.trim(),
        });
        const connection = Obj.make(Connection.Connection, {
          name: connector.label ?? LABEL,
          connectorId: connector.id,
          accessToken: Ref.make(accessToken),
        });
        return { kind: 'complete' as const, accessToken, connection };
      }),
  },
  describeConnection: () => [{ label: 'Kind', value: 'Claude subscription token (claude setup-token)' }],
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(ConnectorSpec.Connector, [ClaudeCodeConnector])),
);
