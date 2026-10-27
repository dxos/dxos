//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { Requirement } from '@dxos/permission';

import * as InboxOperation from './InboxOperation.ts';
import * as InboxPermission from './InboxPermission.ts';

describe('InboxPermission', () => {
  test('SendReply declares a consentable requirement the permission system decodes', ({ expect }) => {
    const [declared, ...rest] = Operation.getRequirements(InboxOperation.SendReply);
    expect(rest).toHaveLength(0);
    const requirement = Schema.decodeUnknownSync(Requirement.Requirement)(declared);
    expect(requirement).toEqual(Requirement.make(InboxPermission.SendEmail.command, { consentable: true }));
  });
});
