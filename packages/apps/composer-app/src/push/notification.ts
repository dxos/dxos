//
// Copyright 2026 DXOS.org
//

// Runs in the service worker, which holds no keys and imports no host code, so every contract here is a copy:
// - `PushMessage` from `@dxos/protocols` (`edge/push.ts`), what EDGE pushes;
// - the envelope fields from `dxos/halo/inbox.proto`;
// - the invitation block from `@dxos/types` (`SpaceInvitationMessage`).
// Keep them in sync. Nothing is verified here: the signature is checked by the client, which
// shows the notice again in the app.

export type PushMessage = {
  v: 1;
  id: string;
  senderDid: string;
  sentAt: number;
  /** Base64 of a binary `InboxEnvelope`; absent when EDGE could not fit it. */
  payload?: string;
  test?: true;
};

export type NoticeNotification = {
  title: string;
  body: string;
  /** Collapses repeats of the same notice (or invitations to the same space) into one notification. */
  tag: string;
  /** Opened on click. */
  url: string;
};

const INBOX_MESSAGE_TYPE = 'org.dxos.inbox.message';
const SPACE_INVITATION_ROLE = 'org.dxos.role.spaceInvitation';

// `InboxEnvelope` and `InboxEnvelopeHeader` field numbers.
const ENVELOPE_VERSION = 16;
const ENVELOPE_HEADER = 17;
const HEADER_TYPE = 2;
const HEADER_PAYLOAD = 6;

/** Sender-written text is capped so a long name cannot crowd out the rest of the notification. */
const MAX_NAME_LENGTH = 60;
const MAX_BODY_LENGTH = 140;

const WIRE_VARINT = 0;
const WIRE_FIXED64 = 1;
const WIRE_LENGTH_DELIMITED = 2;
const WIRE_FIXED32 = 5;

/**
 * The top-level fields of one protobuf message: varints as numbers, length-delimited fields as bytes,
 * the last occurrence winning. Returns undefined for bytes that are not a well-formed message.
 */
const readFields = (bytes: Uint8Array): Map<number, number | Uint8Array> | undefined => {
  const fields = new Map<number, number | Uint8Array>();
  let offset = 0;
  const readVarint = (): number | undefined => {
    let value = 0;
    for (let shift = 0; shift < 64 && offset < bytes.length; shift += 7) {
      const byte = bytes[offset++];
      value += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) {
        return value;
      }
    }
    return undefined;
  };

  while (offset < bytes.length) {
    const key = readVarint();
    if (key === undefined) {
      return undefined;
    }
    const field = Math.floor(key / 8);
    switch (key % 8) {
      case WIRE_VARINT: {
        const value = readVarint();
        if (value === undefined) {
          return undefined;
        }
        fields.set(field, value);
        break;
      }
      case WIRE_LENGTH_DELIMITED: {
        const length = readVarint();
        if (length === undefined || offset + length > bytes.length) {
          return undefined;
        }
        fields.set(field, bytes.subarray(offset, offset + length));
        offset += length;
        break;
      }
      case WIRE_FIXED64:
        offset += 8;
        break;
      case WIRE_FIXED32:
        offset += 4;
        break;
      default:
        return undefined;
    }
  }
  return offset === bytes.length ? fields : undefined;
};

const decodeBase64 = (value: string): Uint8Array | undefined => {
  try {
    return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  } catch {
    return undefined;
  }
};

const text = (value: number | Uint8Array | undefined) =>
  value instanceof Uint8Array ? new TextDecoder().decode(value) : undefined;

/** The type and payload an envelope's header carries, or undefined for anything else (a legacy credential). */
export const readEnvelope = (payload: string): { type?: string; payload?: string } | undefined => {
  const bytes = decodeBase64(payload);
  const envelope = bytes && readFields(bytes);
  const version = envelope?.get(ENVELOPE_VERSION);
  const header = envelope?.get(ENVELOPE_HEADER);
  if (typeof version !== 'number' || version === 0 || !(header instanceof Uint8Array)) {
    return undefined;
  }
  const fields = readFields(header);
  return fields && { type: text(fields.get(HEADER_TYPE)), payload: text(fields.get(HEADER_PAYLOAD)) };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const clean = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  // oxlint-disable-next-line no-control-regex
  const trimmed = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
};

const fallback = (message: PushMessage): NoticeNotification => ({
  title: 'Composer',
  body: 'You have a new notification.',
  tag: message.id,
  url: '/',
});

/** What to show for a push, from whatever of the notice can be read without the client. */
export const describePushMessage = (message: PushMessage): NoticeNotification => {
  if (message.test) {
    return {
      title: 'Notifications are on',
      body: 'This is how Composer will tell you about invitations and messages.',
      tag: message.id,
      url: '/',
    };
  }

  const envelope = message.payload === undefined ? undefined : readEnvelope(message.payload);
  if (envelope?.type !== INBOX_MESSAGE_TYPE || envelope.payload === undefined) {
    return fallback(message);
  }

  let body: unknown;
  try {
    body = JSON.parse(envelope.payload);
  } catch {
    return fallback(message);
  }
  if (!isRecord(body)) {
    return fallback(message);
  }

  const sender = isRecord(body.sender) ? clean(body.sender.name, MAX_NAME_LENGTH) : undefined;
  const blocks = Array.isArray(body.blocks) ? body.blocks.filter(isRecord) : [];

  const invitation = blocks.find((block) => block._tag === 'surface' && block.role === SPACE_INVITATION_ROLE);
  const data = isRecord(invitation?.data) ? invitation.data : undefined;
  const spaceKey = typeof data?.spaceKey === 'string' && /^[0-9a-f]+$/i.test(data.spaceKey) ? data.spaceKey : undefined;
  if (spaceKey) {
    const spaceName = clean(data?.spaceName, MAX_NAME_LENGTH);
    return {
      title: spaceName ? `Invitation to ${spaceName}` : 'Space invitation',
      body: `${sender ?? 'A contact'} invited you to join.`,
      tag: `space-invitation:${spaceKey}`,
      url: `/?spaceKey=${spaceKey}`,
    };
  }

  const subject = isRecord(body.properties) ? clean(body.properties.subject, MAX_BODY_LENGTH) : undefined;
  const firstText = clean(blocks.find((block) => block._tag === 'text')?.text, MAX_BODY_LENGTH);
  return {
    title: sender ?? 'New message',
    body: subject ?? firstText ?? 'You have a new message.',
    tag: message.id,
    url: '/',
  };
};

/** The push message in a push event's data, or undefined when it is not one. */
export const parsePushMessage = (data: unknown): PushMessage | undefined =>
  isRecord(data) && data.v === 1 && typeof data.id === 'string' && typeof data.senderDid === 'string'
    ? {
        v: 1,
        id: data.id,
        senderDid: data.senderDid,
        sentAt: typeof data.sentAt === 'number' ? data.sentAt : 0,
        payload: typeof data.payload === 'string' ? data.payload : undefined,
        test: data.test === true ? true : undefined,
      }
    : undefined;
