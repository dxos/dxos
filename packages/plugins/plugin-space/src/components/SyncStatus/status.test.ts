//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { SpaceId } from '@dxos/keys';
import { type PeerSyncState } from '@dxos/react-client/echo';

import { type StatusInput, getStatus, getUploadedSpaceIds } from './status.ts';

describe('getStatus', () => {
  test('unsaved work takes precedence', () => {
    expect(getStatus(createInput({ saved: false, offline: true, stalled: true }))).toBe('saving-locally');
  });

  test('offline with nothing outstanding is persisted', () => {
    expect(getStatus(createInput({ offline: true }))).toBe('offline-persisted');
  });

  test('offline with outstanding work is disconnected', () => {
    expect(getStatus(createInput({ offline: true, needsToUpload: true }))).toBe('disconnected');
    expect(getStatus(createInput({ offline: true, needsToDownload: true }))).toBe('disconnected');
  });

  test('stalled outranks the transfer direction', () => {
    expect(getStatus(createInput({ stalled: true, needsToDownload: true }))).toBe('stalled');
  });

  test('stalled is never reported while offline', () => {
    expect(getStatus(createInput({ offline: true, stalled: true, needsToDownload: true }))).toBe('disconnected');
  });

  test('transfer direction', () => {
    expect(getStatus(createInput({ needsToDownload: true }))).toBe('downloading');
    expect(getStatus(createInput({ needsToUpload: true }))).toBe('uploading');
    expect(getStatus(createInput({ needsToUpload: true, needsToDownload: true }))).toBe('downloading');
  });

  test('nothing outstanding while online', () => {
    expect(getStatus(createInput())).toBe('remote-synced');
  });
});

describe('getUploadedSpaceIds', () => {
  test('a space with no sync-state entry is not uploaded', () => {
    expect(getUploadedSpaceIds({})).toEqual([]);
  });

  test('an entry with no local documents is not uploaded', () => {
    expect(getUploadedSpaceIds({ [SpaceId.random()]: createPeer({ localDocumentCount: 0 }) })).toEqual([]);
  });

  test('documents missing on the remote or differing hold a space back', () => {
    const state = {
      [SpaceId.random()]: createPeer({ missingOnRemote: 1 }),
      [SpaceId.random()]: createPeer({ differentDocuments: 1 }),
    };
    expect(getUploadedSpaceIds(state)).toEqual([]);
  });

  test('documents left to download do not hold a space back', () => {
    const downloading = SpaceId.random();
    const state = {
      [downloading]: createPeer({ missingOnLocal: 3 }),
      [SpaceId.random()]: createPeer({ missingOnRemote: 2 }),
    };
    expect(getUploadedSpaceIds(state)).toEqual([downloading]);
  });
});

const createPeer = (props: Partial<PeerSyncState> = {}): PeerSyncState => ({
  missingOnLocal: 0,
  missingOnRemote: 0,
  localDocumentCount: 2,
  remoteDocumentCount: 2,
  differentDocuments: 0,
  totalDocumentCount: 2,
  unsyncedDocumentCount: 0,
  ...props,
});

const createInput = (props: Partial<StatusInput> = {}): StatusInput => ({
  offline: false,
  saved: true,
  stalled: false,
  needsToUpload: false,
  needsToDownload: false,
  ...props,
});
