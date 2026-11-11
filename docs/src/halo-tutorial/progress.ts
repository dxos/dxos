//
// Copyright 2026 DXOS.org
//

import * as client from './client.ts';
import * as contacts from './contacts.ts';
import * as devices from './devices.ts';
import * as invitations from './invitations.ts';
import * as profile from './profile.ts';
import * as recovery from './recovery.ts';
import * as spaces from './spaces.ts';
import { todoStep } from './todo.ts';

/** How far the reader has built the app, in the order the learning path builds it. */
export type Stage =
  | 'name'
  | 'spaces'
  | 'invite'
  | 'contacts'
  | 'devices'
  | 'recovery';

export const STAGES: readonly Stage[] = [
  'name',
  'spaces',
  'invite',
  'contacts',
  'devices',
  'recovery',
];

export const isStage = (value: unknown): value is Stage =>
  STAGES.some((stage) => stage === value);

/** Whether `stage` includes what `at` adds. */
export const reached = (stage: Stage, at: Stage) =>
  STAGES.indexOf(stage) >= STAGES.indexOf(at);

/** The pieces each stage needs, in learning-path order. */
const PIECES: readonly { stage: Stage; values: readonly unknown[] }[] = [
  {
    stage: 'name',
    values: [
      client.config,
      client.openHalo,
      profile.createIdentity,
      profile.me,
      profile.rename,
    ],
  },
  { stage: 'spaces', values: [spaces.createSpace, spaces.spaces] },
  {
    stage: 'invite',
    values: [
      invitations.invite,
      invitations.join,
      invitations.progress,
      invitations.authenticate,
    ],
  },
  { stage: 'contacts', values: [contacts.contacts, contacts.removeContact] },
  {
    stage: 'devices',
    values: [devices.addDevice, devices.joinIdentity, devices.devices],
  },
  {
    stage: 'recovery',
    values: [
      recovery.createRecoveryCode,
      recovery.recoveryCodes,
      recovery.revokeRecoveryCode,
      recovery.recover,
    ],
  },
];

export type Progress = {
  /** The last stage whose pieces are all written, if any. */
  stage?: Stage;
  /** The step that writes the next missing piece, if any. */
  next?: string;
};

/** Which stage the app's modules reach, and the next step to write. */
export const getProgress = (): Progress => {
  let stage: Stage | undefined;
  for (const piece of PIECES) {
    const next = piece.values.map(todoStep).find(Boolean);
    if (next) {
      return { stage, next };
    }
    stage = piece.stage;
  }
  return { stage };
};
