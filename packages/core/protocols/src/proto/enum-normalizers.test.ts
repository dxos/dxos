//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  normalizeAdmittedFeedDesignation,
  normalizeDeviceKind,
  normalizeInvitationKind,
  normalizeInvitationType,
  normalizeMembershipPolicy,
  normalizePlatformType,
} from './enum-normalizers.js';
import { DeviceKind, Invitation, Platform } from './gen/dxos/client/services.js';
import { AdmittedFeed, MembershipPolicy } from './gen/dxos/halo/credentials.js';

describe('enum normalizers', () => {
  test('normalizeMembershipPolicy maps legacy wire values', ({ expect }) => {
    expect(normalizeMembershipPolicy(MembershipPolicy.UNSPECIFIED)).toBe(MembershipPolicy.INVITE);
    expect(normalizeMembershipPolicy(MembershipPolicy.LEGACY_LOCKED)).toBe(MembershipPolicy.LOCKED);
    expect(normalizeMembershipPolicy(MembershipPolicy.INVITE)).toBe(MembershipPolicy.INVITE);
    expect(normalizeMembershipPolicy(MembershipPolicy.LOCKED)).toBe(MembershipPolicy.LOCKED);
  });

  test('normalizeAdmittedFeedDesignation maps legacy wire values', ({ expect }) => {
    expect(normalizeAdmittedFeedDesignation(AdmittedFeed.Designation.UNSPECIFIED)).toBe(
      AdmittedFeed.Designation.GENERAL,
    );
    expect(normalizeAdmittedFeedDesignation(AdmittedFeed.Designation.LEGACY_CONTROL)).toBe(
      AdmittedFeed.Designation.CONTROL,
    );
    expect(normalizeAdmittedFeedDesignation(AdmittedFeed.Designation.LEGACY_DATA)).toBe(AdmittedFeed.Designation.DATA);
  });

  test('normalizeInvitationType maps legacy wire values', ({ expect }) => {
    expect(normalizeInvitationType(Invitation.Type.TYPE_UNSPECIFIED)).toBe(Invitation.Type.INTERACTIVE);
    expect(normalizeInvitationType(Invitation.Type.LEGACY_DELEGATED)).toBe(Invitation.Type.DELEGATED);
    expect(normalizeInvitationType(Invitation.Type.LEGACY_MULTIUSE)).toBe(Invitation.Type.MULTIUSE);
  });

  test('normalizeInvitationKind maps legacy wire values', ({ expect }) => {
    expect(normalizeInvitationKind(Invitation.Kind.KIND_UNSPECIFIED)).toBe(Invitation.Kind.DEVICE);
    expect(normalizeInvitationKind(Invitation.Kind.LEGACY_SPACE)).toBe(Invitation.Kind.SPACE);
  });

  test('normalizeDeviceKind maps legacy wire values', ({ expect }) => {
    expect(normalizeDeviceKind(DeviceKind.UNSPECIFIED)).toBe(DeviceKind.CURRENT);
    expect(normalizeDeviceKind(DeviceKind.LEGACY_TRUSTED)).toBe(DeviceKind.TRUSTED);
  });

  test('normalizePlatformType maps legacy wire values', ({ expect }) => {
    expect(normalizePlatformType(Platform.PLATFORM_TYPE.UNSPECIFIED)).toBe(Platform.PLATFORM_TYPE.BROWSER);
    expect(normalizePlatformType(Platform.PLATFORM_TYPE.LEGACY_SHARED_WORKER)).toBe(
      Platform.PLATFORM_TYPE.SHARED_WORKER,
    );
    expect(normalizePlatformType(Platform.PLATFORM_TYPE.LEGACY_NODE)).toBe(Platform.PLATFORM_TYPE.NODE);
    expect(normalizePlatformType(Platform.PLATFORM_TYPE.LEGACY_DEDICATED_WORKER)).toBe(
      Platform.PLATFORM_TYPE.DEDICATED_WORKER,
    );
  });
});
