//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type StatusInput, getStatus } from './status';

describe('getStatus', () => {
  test('unsaved work takes precedence', () => {
    expect(getStatus(createInput({ saved: false, offline: true }))).toBe('saving-locally');
  });

  test('offline with nothing outstanding is persisted', () => {
    expect(getStatus(createInput({ offline: true }))).toBe('offline-persisted');
  });

  test('offline with outstanding work is disconnected', () => {
    expect(getStatus(createInput({ offline: true, needsToUpload: true }))).toBe('disconnected');
    expect(getStatus(createInput({ offline: true, needsToDownload: true }))).toBe('disconnected');
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

const createInput = (props: Partial<StatusInput> = {}): StatusInput => ({
  offline: false,
  saved: true,
  needsToUpload: false,
  needsToDownload: false,
  ...props,
});
