//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** The Research names no lighthouse connection, or its connection has no credential. */
export class LighthouseNotConnectedError extends BaseError.extend(
  'LighthouseNotConnectedError',
  'Connect lighthouse first: add a Lighthouse connection in Settings → Connections.',
) {}

/** No client is registered for the connection's URL. */
export class LighthouseNoClientError extends BaseError.extend(
  'LighthouseNoClientError',
  'No lighthouse client handles this server URL.',
) {}

/** The Research has not started its session yet. */
export class ResearchNotStartedError extends BaseError.extend('ResearchNotStartedError', 'Run the research first.') {}

/** The Research has no goal to hand to a session. */
export class ResearchGoalMissingError extends BaseError.extend(
  'ResearchGoalMissingError',
  'Write a goal for the research first.',
) {}
