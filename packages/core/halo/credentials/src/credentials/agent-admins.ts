//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { type PublicKey } from '@dxos/keys';
import { fromPublicKey, toDate, toPublicKey } from '@dxos/protocols/buf';
import { type AgentAdmins, AgentAdminsSchema, type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { specificCredential } from './assertions.ts';
import { type CredentialSigner } from './credential-factory.ts';
import { verifyCredential } from './verifier.ts';

/**
 * Issues an agent's list of its admins. The signer's issuer must be the agent's identity, which signs the list about
 * itself, so the list holds wherever the agent's HALO is read, whatever space memberships say.
 */
export const createAgentAdminsCredential = (signer: CredentialSigner, adminKeys: PublicKey[]): Promise<Credential> => {
  const agentKey = signer.getIssuer();
  return signer.createCredential({
    subject: agentKey,
    assertion: create(AgentAdminsSchema, {
      agentKey: fromPublicKey(agentKey),
      adminKeys: adminKeys.map((key) => fromPublicKey(key)),
    }),
  });
};

export type AgentAdminsFailure = 'malformed' | 'invalid-signature' | 'wrong-agent';

export type VerifiedAgentAdmins = {
  agentKey: PublicKey;
  adminKeys: PublicKey[];
  issuedAt: Date;
  assertion: AgentAdmins;
};

export type AgentAdminsVerification =
  | { kind: 'pass'; admins: VerifiedAgentAdmins }
  | { kind: 'fail'; reason: AgentAdminsFailure; errors?: string[] };

/**
 * Verifies an agent's list of its admins: the signature (and any delegation chain) must hold, and `agentKey` must
 * have issued it about itself, so a list another identity signed cannot name the agent's admins.
 */
export const verifyAgentAdmins = async (
  credential: Credential,
  agentKey: PublicKey,
): Promise<AgentAdminsVerification> => {
  const specific = specificCredential<AgentAdmins>(credential, 'dxos.halo.credentials.AgentAdmins');
  const issuer = toPublicKey(credential.issuer);
  const subject = toPublicKey(credential.subject?.id);
  const assertedAgent = toPublicKey(specific?.assertion.agentKey);
  const issuedAt = toDate(credential.issuanceDate);
  if (!specific || !issuer || !subject || !assertedAgent || !issuedAt) {
    return { kind: 'fail', reason: 'malformed' };
  }
  const adminKeys: PublicKey[] = [];
  for (const key of specific.assertion.adminKeys) {
    const adminKey = toPublicKey(key);
    if (!adminKey) {
      return { kind: 'fail', reason: 'malformed' };
    }
    adminKeys.push(adminKey);
  }

  const result = await verifyCredential(credential);
  if (result.kind === 'fail') {
    return { kind: 'fail', reason: 'invalid-signature', errors: result.errors };
  }
  if (!issuer.equals(agentKey) || !subject.equals(agentKey) || !assertedAgent.equals(agentKey)) {
    return { kind: 'fail', reason: 'wrong-agent' };
  }

  return {
    kind: 'pass',
    admins: { agentKey, adminKeys, issuedAt, assertion: specific.assertion },
  };
};
