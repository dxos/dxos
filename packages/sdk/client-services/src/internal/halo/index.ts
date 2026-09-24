//
// Copyright 2026 DXOS.org
//

import * as LayerSpec from '@dxos/compute/LayerSpec';

import { EdgeAgentManagerSpec } from './agents/edge-agent-manager.ts';
import { EdgeAgentServiceRegistrationSpec, EdgeAgentServiceSpec } from './agents/edge-agent-service.ts';
import { DevicesServiceRegistrationSpec, DevicesServiceSpec } from './devices/devices-service.ts';
import { ContactsServiceRegistrationSpec, ContactsServiceSpec } from './identity/contacts-service.ts';
import { IdentityLifecycleSpec } from './identity/identity-lifecycle.ts';
import { IdentityManagerSpec, IdentityProviderSpec } from './identity/identity-manager.ts';
import { EdgeIdentityRecoverySpec } from './identity/identity-recovery-manager.ts';
import { IdentityServiceRegistrationSpec, IdentityServiceSpec } from './identity/identity-service.ts';
import { type Options } from './interface.ts';
import { InvitationFactoriesSpec } from './invitations/invitation-factories.ts';
import { InvitationsHandlerSpec } from './invitations/invitations-handler.ts';
import { InvitationsManagerSpec } from './invitations/invitations-manager.ts';
import { InvitationsServiceRegistrationSpec, InvitationsServiceSpec } from './invitations/invitations-service.ts';

export * from './interface.ts';

/**
 * Identity, devices and invitations, and the services over them.
 */
export const specs = (options: Options): LayerSpec.LayerSpec[] => [
  IdentityManagerSpec(options),
  IdentityProviderSpec,
  EdgeIdentityRecoverySpec,
  IdentityLifecycleSpec,
  InvitationsHandlerSpec(options),
  InvitationsManagerSpec,
  InvitationFactoriesSpec,
  EdgeAgentManagerSpec(options),

  IdentityServiceSpec,
  IdentityServiceRegistrationSpec,
  ContactsServiceSpec,
  ContactsServiceRegistrationSpec,
  InvitationsServiceSpec,
  InvitationsServiceRegistrationSpec,
  DevicesServiceSpec,
  DevicesServiceRegistrationSpec,
  EdgeAgentServiceSpec,
  EdgeAgentServiceRegistrationSpec,
];
