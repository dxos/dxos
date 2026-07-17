//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Google People API types.
 * https://developers.google.com/people/api/rest/v1/people
 */

const Name = Schema.Struct({
  displayName: Schema.optional(Schema.String),
  givenName: Schema.optional(Schema.String),
  familyName: Schema.optional(Schema.String),
  middleName: Schema.optional(Schema.String),
});

const EmailAddress = Schema.Struct({
  value: Schema.optional(Schema.String),
  type: Schema.optional(Schema.String),
  formattedType: Schema.optional(Schema.String),
});

const PhoneNumber = Schema.Struct({
  value: Schema.optional(Schema.String),
  type: Schema.optional(Schema.String),
  formattedType: Schema.optional(Schema.String),
});

const Address = Schema.Struct({
  streetAddress: Schema.optional(Schema.String),
  city: Schema.optional(Schema.String),
  region: Schema.optional(Schema.String),
  country: Schema.optional(Schema.String),
  postalCode: Schema.optional(Schema.String),
  type: Schema.optional(Schema.String),
  formattedType: Schema.optional(Schema.String),
  formattedValue: Schema.optional(Schema.String),
});

const Birthday = Schema.Struct({
  date: Schema.optional(
    Schema.Struct({
      year: Schema.optional(Schema.Number),
      month: Schema.optional(Schema.Number),
      day: Schema.optional(Schema.Number),
    }),
  ),
  text: Schema.optional(Schema.String),
});

const Biography = Schema.Struct({
  value: Schema.optional(Schema.String),
  contentType: Schema.optional(Schema.String),
});

const Photo = Schema.Struct({
  url: Schema.optional(Schema.String),
  metadata: Schema.optional(Schema.Struct({ primary: Schema.optional(Schema.Boolean) })),
});

const Organization = Schema.Struct({
  name: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  department: Schema.optional(Schema.String),
  type: Schema.optional(Schema.String),
});

const Url = Schema.Struct({
  value: Schema.optional(Schema.String),
  type: Schema.optional(Schema.String),
  formattedType: Schema.optional(Schema.String),
});

/** Per-contact provenance; `sources[].updateTime` is the last-modified time used as the sync cursor. */
const PersonMetadata = Schema.Struct({
  sources: Schema.optional(Schema.Array(Schema.Struct({ updateTime: Schema.optional(Schema.String) }))),
});

export const Person = Schema.Struct({
  resourceName: Schema.String,
  etag: Schema.optional(Schema.String),
  metadata: Schema.optional(PersonMetadata),
  names: Schema.optional(Schema.Array(Name)),
  emailAddresses: Schema.optional(Schema.Array(EmailAddress)),
  phoneNumbers: Schema.optional(Schema.Array(PhoneNumber)),
  addresses: Schema.optional(Schema.Array(Address)),
  birthdays: Schema.optional(Schema.Array(Birthday)),
  biographies: Schema.optional(Schema.Array(Biography)),
  photos: Schema.optional(Schema.Array(Photo)),
  organizations: Schema.optional(Schema.Array(Organization)),
  urls: Schema.optional(Schema.Array(Url)),
});

export type Person = Schema.Schema.Type<typeof Person>;

export const ListConnectionsResponse = Schema.Struct({
  connections: Schema.optional(Schema.Array(Person)),
  nextPageToken: Schema.optional(Schema.String),
  nextSyncToken: Schema.optional(Schema.String),
  totalItems: Schema.optional(Schema.Number),
});

export type ListConnectionsResponse = Schema.Schema.Type<typeof ListConnectionsResponse>;

export const ContactGroup = Schema.Struct({
  resourceName: Schema.String,
  name: Schema.String,
  formattedName: Schema.optional(Schema.String),
  groupType: Schema.optional(Schema.String),
  memberCount: Schema.optional(Schema.Number),
});

export type ContactGroup = Schema.Schema.Type<typeof ContactGroup>;

export const ListContactGroupsResponse = Schema.Struct({
  contactGroups: Schema.optional(Schema.Array(ContactGroup)),
  nextPageToken: Schema.optional(Schema.String),
  totalItems: Schema.optional(Schema.Number),
});

export type ListContactGroupsResponse = Schema.Schema.Type<typeof ListContactGroupsResponse>;

export const ContactGroupResponse = Schema.Struct({
  resourceName: Schema.String,
  name: Schema.String,
  groupType: Schema.optional(Schema.String),
  memberCount: Schema.optional(Schema.Number),
  memberResourceNames: Schema.optional(Schema.Array(Schema.String)),
});

export type ContactGroupResponse = Schema.Schema.Type<typeof ContactGroupResponse>;

export const BatchGetPeopleResponse = Schema.Struct({
  responses: Schema.optional(
    Schema.Array(
      Schema.Struct({
        person: Schema.optional(Person),
        status: Schema.optional(Schema.Struct({ code: Schema.optional(Schema.Number) })),
      }),
    ),
  ),
});

export type BatchGetPeopleResponse = Schema.Schema.Type<typeof BatchGetPeopleResponse>;
