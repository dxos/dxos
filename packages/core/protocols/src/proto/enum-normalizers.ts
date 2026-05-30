//
// Copyright 2026 DXOS.org
//

import { AdmittedFeed, MembershipPolicy } from './gen/dxos/halo/credentials.js';
import { DeviceKind, Invitation, Platform } from './gen/dxos/client/services.js';

/**
 * Normalizes pre-sentinel and unspecified wire values for {@link MembershipPolicy}.
 */
export const normalizeMembershipPolicy = (value: MembershipPolicy | undefined): MembershipPolicy => {
  switch (value) {
    case undefined:
    case MembershipPolicy.UNSPECIFIED:
    case MembershipPolicy.INVITE:
      return MembershipPolicy.INVITE;
    case MembershipPolicy.LEGACY_LOCKED:
    case MembershipPolicy.LOCKED:
      return MembershipPolicy.LOCKED;
    default:
      return MembershipPolicy.INVITE;
  }
};

/**
 * Normalizes pre-sentinel and unspecified wire values for {@link AdmittedFeed.Designation}.
 */
export const normalizeAdmittedFeedDesignation = (
  value: AdmittedFeed.Designation | undefined,
): AdmittedFeed.Designation => {
  switch (value) {
    case undefined:
    case AdmittedFeed.Designation.UNSPECIFIED:
    case AdmittedFeed.Designation.GENERAL:
      return AdmittedFeed.Designation.GENERAL;
    case AdmittedFeed.Designation.LEGACY_CONTROL:
    case AdmittedFeed.Designation.CONTROL:
      return AdmittedFeed.Designation.CONTROL;
    case AdmittedFeed.Designation.LEGACY_DATA:
    case AdmittedFeed.Designation.DATA:
      return AdmittedFeed.Designation.DATA;
    default:
      return AdmittedFeed.Designation.GENERAL;
  }
};

/**
 * Normalizes pre-sentinel and unspecified wire values for {@link Invitation.Type}.
 */
export const normalizeInvitationType = (value: Invitation.Type | undefined): Invitation.Type => {
  switch (value) {
    case undefined:
    case Invitation.Type.TYPE_UNSPECIFIED:
    case Invitation.Type.INTERACTIVE:
      return Invitation.Type.INTERACTIVE;
    case Invitation.Type.LEGACY_DELEGATED:
    case Invitation.Type.DELEGATED:
      return Invitation.Type.DELEGATED;
    case Invitation.Type.LEGACY_MULTIUSE:
    case Invitation.Type.MULTIUSE:
      return Invitation.Type.MULTIUSE;
    default:
      return Invitation.Type.INTERACTIVE;
  }
};

/**
 * Normalizes pre-sentinel and unspecified wire values for {@link Invitation.Kind}.
 */
export const normalizeInvitationKind = (value: Invitation.Kind | undefined): Invitation.Kind => {
  switch (value) {
    case undefined:
    case Invitation.Kind.KIND_UNSPECIFIED:
    case Invitation.Kind.DEVICE:
      return Invitation.Kind.DEVICE;
    case Invitation.Kind.LEGACY_SPACE:
    case Invitation.Kind.SPACE:
      return Invitation.Kind.SPACE;
    default:
      return Invitation.Kind.DEVICE;
  }
};

/**
 * Normalizes pre-sentinel and unspecified wire values for {@link DeviceKind}.
 */
export const normalizeDeviceKind = (value: DeviceKind | undefined): DeviceKind => {
  switch (value) {
    case undefined:
    case DeviceKind.UNSPECIFIED:
    case DeviceKind.CURRENT:
      return DeviceKind.CURRENT;
    case DeviceKind.LEGACY_TRUSTED:
    case DeviceKind.TRUSTED:
      return DeviceKind.TRUSTED;
    default:
      return DeviceKind.CURRENT;
  }
};

/**
 * Normalizes pre-sentinel and unspecified wire values for {@link Platform.PLATFORM_TYPE}.
 */
export const normalizePlatformType = (value: Platform.PLATFORM_TYPE | undefined): Platform.PLATFORM_TYPE => {
  switch (value) {
    case undefined:
    case Platform.PLATFORM_TYPE.UNSPECIFIED:
    case Platform.PLATFORM_TYPE.BROWSER:
      return Platform.PLATFORM_TYPE.BROWSER;
    case Platform.PLATFORM_TYPE.LEGACY_SHARED_WORKER:
    case Platform.PLATFORM_TYPE.SHARED_WORKER:
      return Platform.PLATFORM_TYPE.SHARED_WORKER;
    case Platform.PLATFORM_TYPE.LEGACY_NODE:
    case Platform.PLATFORM_TYPE.NODE:
      return Platform.PLATFORM_TYPE.NODE;
    case Platform.PLATFORM_TYPE.LEGACY_DEDICATED_WORKER:
    case Platform.PLATFORM_TYPE.DEDICATED_WORKER:
      return Platform.PLATFORM_TYPE.DEDICATED_WORKER;
    default:
      return Platform.PLATFORM_TYPE.BROWSER;
  }
};
