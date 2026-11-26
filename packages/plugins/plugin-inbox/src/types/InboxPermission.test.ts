//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { Requirement } from '@dxos/permission';

import * as InboxOperation from './InboxOperation.ts';
import * as InboxPermission from './InboxPermission.ts';

describe('InboxPermission', () => {
  test('SendReply declares the consentable send-email requirement', ({ expect }) => {
    expect(Operation.getRequirements(InboxOperation.SendReply)).toEqual([Requirement.make(InboxPermission.SendEmail)]);
    expect(InboxPermission.SendEmailRequirement.consentable).toBe(true);
  });
});
