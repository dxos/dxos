//
// Copyright 2026 DXOS.org
//

/**
 * Discord Worker — Cloudflare Worker that handles Discord interaction webhooks.
 *
 * Slash commands:
 *   /connect <space-key> — Binds the current Discord guild/channel to a DXOS space.
 *   /track               — Posts the current thread as a Markdown document to the space.
 *
 * Authentication:
 *   Stateless DID-in-header. The Worker includes the bot DID in requests to EDGE.
 *   EDGE validates that the DID is a member of the target space.
 *
 * Future:
 *   - Add HALO request signing for stronger auth.
 *   - Fetch bot config from the space via EDGE (eliminating env-var configuration).
 */

// TODO(burdon): Integrate with EDGE webhook gateway.

//
// Types
//

export interface Env {
  /** Discord application public key for verifying interaction signatures. */
  DISCORD_PUBLIC_KEY: string;
  /** Discord bot token for API calls (fetching thread messages). */
  BOT_TOKEN: string;
  /** Bot DID for authenticating to EDGE. */
  BOT_DID: string;
  /** DXOS EDGE endpoint. */
  EDGE_ENDPOINT: string;
}

/** Discord interaction payload from webhook. */
interface DiscordInteraction {
  type: number;
  id: string;
  token: string;
  application_id: string;
  guild_id?: string;
  channel_id?: string;
  guild?: { name?: string };
  channel?: { name?: string };
  data?: {
    name?: string;
    options?: Array<{ name: string; value: string }>;
  };
}

/** Discord message from the REST API. */
interface DiscordMessage {
  id: string;
  content: string;
  timestamp: string;
  author?: { username?: string };
}

//
// Constants
//

/** Discord interaction types. */
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
} as const;

/** Discord interaction response types. */
const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
} as const;

/** Flags for ephemeral messages (only visible to the invoking user). */
const EPHEMERAL_FLAG = 1 << 6;

const DISCORD_API = 'https://discord.com/api/v10';

//
// Helpers
//

/**
 * Verifies the Discord interaction request signature.
 */
const verifyDiscordSignature = async (request: Request, publicKey: string): Promise<boolean> => {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  if (!signature || !timestamp) {
    return false;
  }

  const body = await request.clone().text();
  const key = await crypto.subtle.importKey(
    'raw',
    hexToUint8Array(publicKey),
    { name: 'Ed25519', namedCurve: 'Ed25519' },
    false,
    ['verify'],
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(timestamp + body);
  const sig = hexToUint8Array(signature);

  return crypto.subtle.verify('Ed25519', key, sig, data);
};

/**
 * Converts a hex string to Uint8Array.
 */
const hexToUint8Array = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let idx = 0; idx < hex.length; idx += 2) {
    bytes[idx / 2] = parseInt(hex.substring(idx, idx + 2), 16);
  }
  return bytes;
};

/**
 * Sends a followup message to a deferred interaction.
 */
const sendFollowup = async (applicationId: string, interactionToken: string, content: string): Promise<void> => {
  const response = await fetch(`${DISCORD_API}/webhooks/${applicationId}/${interactionToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, flags: EPHEMERAL_FLAG }),
  });

  if (!response.ok) {
    console.error('[worker] Failed to send followup:', response.status, await response.text());
  }
};

/**
 * Creates a deferred ephemeral response (shows "thinking..." in Discord).
 */
const deferredResponse = (): Response =>
  Response.json({
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: EPHEMERAL_FLAG },
  });

/**
 * Creates an ephemeral Discord response.
 */
const ephemeralResponse = (content: string): Response =>
  Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      flags: EPHEMERAL_FLAG,
    },
  });

/**
 * Fetches all messages from a Discord channel, paginating through results.
 */
const fetchAllMessages = async (channelId: string, botToken: string): Promise<DiscordMessage[]> => {
  const allMessages: DiscordMessage[] = [];
  let beforeId: string | undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = new URL(`${DISCORD_API}/channels/${channelId}/messages`);
    url.searchParams.set('limit', '100');
    if (beforeId) {
      url.searchParams.set('before', beforeId);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Discord API error ${response.status}: ${text}`);
    }

    const batch: DiscordMessage[] = await response.json();
    if (batch.length === 0) {
      break;
    }

    allMessages.push(...batch);
    beforeId = batch[batch.length - 1].id;

    if (batch.length < 100) {
      break;
    }
  }

  return allMessages;
};

/**
 * Formats messages as Markdown (chronological order).
 */
const formatMessagesAsMarkdown = (messages: DiscordMessage[]): string => {
  // Messages come newest-first from Discord API; reverse for chronological order.
  const chronological = [...messages].reverse();
  return chronological
    .map((msg) => {
      const timestamp = new Date(msg.timestamp).toISOString();
      const author = msg.author?.username ?? 'Unknown';
      return `**${author}** (${timestamp})\n${msg.content}`;
    })
    .join('\n\n---\n\n');
};

//
// Command handlers
//

/**
 * Handles the /connect slash command.
 * Forwards guild/channel binding to EDGE.
 */
const handleConnect = async (interaction: DiscordInteraction, env: Env): Promise<void> => {
  const spaceKey = interaction.data?.options?.find((option) => option.name === 'space-key')?.value;
  if (!spaceKey) {
    await sendFollowup(interaction.application_id, interaction.token, 'Error: Missing space-key argument.');
    return;
  }

  const guildId = interaction.guild_id;
  const guildName = interaction.guild?.name ?? 'Unknown';
  const channelId = interaction.channel_id;

  console.log('[worker] /connect', { spaceKey, guildId, guildName, channelId });

  // TODO(burdon): Forward to EDGE once the endpoint is available.
  if (!env.EDGE_ENDPOINT || env.EDGE_ENDPOINT === 'https://edge.dxos.network') {
    await sendFollowup(
      interaction.application_id,
      interaction.token,
      `Connected guild **${guildName}** to space \`${spaceKey}\` (channel: ${channelId}).\n` +
        `_Note: EDGE integration pending — connection not persisted._`,
    );
    return;
  }

  try {
    const response = await fetch(`${env.EDGE_ENDPOINT}/discord/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-DID': env.BOT_DID,
      },
      body: JSON.stringify({ did: env.BOT_DID, guildId, guildName, channelId, spaceKey }),
    });

    if (!response.ok) {
      const text = await response.text();
      await sendFollowup(interaction.application_id, interaction.token, `Error: Failed to connect: ${text}`);
      return;
    }

    await sendFollowup(
      interaction.application_id,
      interaction.token,
      `Connected guild **${guildName}** to space \`${spaceKey}\`.`,
    );
  } catch (err) {
    await sendFollowup(
      interaction.application_id,
      interaction.token,
      `Error: Connection failed: ${err instanceof Error ? err.message : 'unknown error'}`,
    );
  }
};

/**
 * Handles the /track slash command.
 * Fetches thread messages and posts them as Markdown to EDGE.
 */
const handleTrack = async (interaction: DiscordInteraction, env: Env): Promise<void> => {
  const channelId = interaction.channel_id;
  if (!channelId) {
    await sendFollowup(interaction.application_id, interaction.token, 'Error: No channel context.');
    return;
  }

  console.log('[worker] /track', { channelId });

  try {
    const messages = await fetchAllMessages(channelId, env.BOT_TOKEN);
    const markdown = formatMessagesAsMarkdown(messages);
    const threadName = interaction.channel?.name ?? `Discord thread ${channelId}`;

    console.log('[worker] Captured', messages.length, 'messages from', threadName);

    // TODO(burdon): Forward to EDGE once the endpoint is available.
    if (!env.EDGE_ENDPOINT || env.EDGE_ENDPOINT === 'https://edge.dxos.network') {
      await sendFollowup(
        interaction.application_id,
        interaction.token,
        `Thread **${threadName}** tracked — ${messages.length} messages captured.\n` +
          `_Note: EDGE integration pending — document not created in space._`,
      );
      return;
    }

    const response = await fetch(`${env.EDGE_ENDPOINT}/discord/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-DID': env.BOT_DID,
      },
      body: JSON.stringify({
        did: env.BOT_DID,
        spaceKey: '', // Resolved by EDGE from the guild binding.
        markdown,
        threadName,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      await sendFollowup(interaction.application_id, interaction.token, `Error: Failed to track thread: ${text}`);
      return;
    }

    await sendFollowup(
      interaction.application_id,
      interaction.token,
      `Thread **${threadName}** tracked — ${messages.length} messages captured.`,
    );
  } catch (err) {
    console.error('[worker] Track error:', err);
    await sendFollowup(
      interaction.application_id,
      interaction.token,
      `Error: Track failed: ${err instanceof Error ? err.message : 'unknown error'}`,
    );
  }
};

//
// Worker entry point
//

export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      console.log('[worker] Verifying signature...');
      const isValid = await verifyDiscordSignature(request, env.DISCORD_PUBLIC_KEY);
      if (!isValid) {
        console.log('[worker] Invalid signature');
        return new Response('Invalid signature', { status: 401 });
      }

      const interaction = (await request.json()) as DiscordInteraction;
      console.log('[worker] Interaction type:', interaction.type, 'command:', interaction.data?.name);

      if (interaction.type === InteractionType.PING) {
        return Response.json({ type: InteractionResponseType.PONG });
      }

      if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        const commandName = interaction.data?.name;

        // Return deferred response immediately, then process asynchronously.
        // Discord enforces a 3-second deadline for the initial response.
        switch (commandName) {
          case 'connect':
            ctx.waitUntil(handleConnect(interaction, env));
            return deferredResponse();
          case 'track':
            ctx.waitUntil(handleTrack(interaction, env));
            return deferredResponse();
          default:
            return ephemeralResponse(`Error: Unknown command: ${commandName}`);
        }
      }

      return new Response('Unknown interaction type', { status: 400 });
    } catch (err) {
      console.error('[worker] Unhandled error:', err);
      return ephemeralResponse(`Error: Internal error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};
