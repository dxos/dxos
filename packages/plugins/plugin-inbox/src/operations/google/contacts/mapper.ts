//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { Person } from '@dxos/types';

import { GooglePeople } from '../../../apis';
import { GOOGLE_INTEGRATION_SOURCE } from '../../../constants';

/**
 * Maps a Google People API `Person` response to a DXOS `Person` object shape,
 * keyed by the Google resource name so subsequent syncs can find-or-update.
 */
export const mapGooglePerson = (
  remote: GooglePeople.Person,
): Obj.MakeProps<typeof Person.Person> & { [Obj.Meta]: { keys: { source: string; id: string }[] } } => {
  const primaryName = remote.names?.[0];
  const fullName = primaryName?.displayName ?? undefined;

  const emails =
    remote.emailAddresses
      ?.filter((e) => e.value)
      .map((e) => ({ label: e.formattedType ?? e.type ?? undefined, value: e.value! })) ?? undefined;

  const phoneNumbers =
    remote.phoneNumbers
      ?.filter((p) => p.value)
      .map((p) => ({ label: p.formattedType ?? p.type ?? undefined, value: p.value! })) ?? undefined;

  const addresses =
    remote.addresses
      ?.filter((a) => a.streetAddress || a.city || a.country)
      .map((a) => ({
        label: a.formattedType ?? a.type ?? undefined,
        value: {
          street: a.streetAddress ?? undefined,
          locality: a.city ?? undefined,
          region: a.region ?? undefined,
          postalCode: a.postalCode ?? undefined,
          country: a.country ?? undefined,
        },
      })) ?? undefined;

  const urls =
    remote.urls
      ?.filter((u) => u.value)
      .map((u) => ({ label: u.formattedType ?? u.type ?? undefined, value: u.value! })) ?? undefined;

  const primaryOrg = remote.organizations?.[0];
  const primaryBio = remote.biographies?.find((b) => b.contentType === 'TEXT_PLAIN') ?? remote.biographies?.[0];
  const primaryPhoto = remote.photos?.find((p) => p.metadata?.primary)?.url ?? remote.photos?.[0]?.url ?? undefined;

  const birthdayEntry = remote.birthdays?.[0];
  let birthday: string | undefined;
  if (birthdayEntry?.text) {
    birthday = birthdayEntry.text;
  } else if (birthdayEntry?.date) {
    const { year, month, day } = birthdayEntry.date;
    if (year && month && day) {
      birthday = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else if (month && day) {
      birthday = `--${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return {
    [Obj.Meta]: { keys: [{ source: GOOGLE_INTEGRATION_SOURCE, id: remote.resourceName }] },
    fullName,
    jobTitle: primaryOrg?.title ?? undefined,
    department: primaryOrg?.department ?? undefined,
    notes: primaryBio?.value ?? undefined,
    image: primaryPhoto,
    birthday,
    ...(emails && emails.length > 0 ? { emails } : {}),
    ...(phoneNumbers && phoneNumbers.length > 0 ? { phoneNumbers } : {}),
    ...(addresses && addresses.length > 0 ? { addresses } : {}),
    ...(urls && urls.length > 0 ? { urls } : {}),
  };
};
