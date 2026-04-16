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

/** Discord interaction types. */
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
} as const;

/** Discord interaction response types. */
const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
} as const;

/** Flags for ephemeral messages (only visible to the invoking user). */
const EPHEMERAL_FLAG = 1 << 6;

/**
 * Verifies the Discord interaction request signature.
 */
const verifyDiscordSignature = async (request: Request, publicKey: string): Promise<boolean> => {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.clone().text();

  if (!signature || !timestamp) {
    return false;
  }

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
 * Creates an error response.
 */
const errorResponse = (content: string): Response => ephemeralResponse(`Error: ${content}`);

/**
 * Handles the /connect slash command.
 * Forwards guild/channel binding to EDGE.
 */
const handleConnect = async (interaction: any, env: Env): Promise<Response> => {
  const spaceKey = interaction.data?.options?.find((option: any) => option.name === 'space-key')?.value;

  if (!spaceKey) {
    return errorResponse('Missing space-key argument.');
  }

  const guildId = interaction.guild_id;
  const guildName = interaction.guild?.name ?? 'Unknown';
  const channelId = interaction.channel_id;

  try {
    const response = await fetch(`${env.EDGE_ENDPOINT}/discord/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-DID': env.BOT_DID,
      },
      body: JSON.stringify({
        did: env.BOT_DID,
        guildId,
        guildName,
        channelId,
        spaceKey,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return errorResponse(`Failed to connect: ${text}`);
    }

    return ephemeralResponse(`Connected guild **${guildName}** to space \`${spaceKey}\`.`);
  } catch (err) {
    return errorResponse(`Connection failed: ${err instanceof Error ? err.message : 'unknown error'}`);
  }
};

/**
 * Handles the /track slash command.
 * Fetches thread messages and posts them as Markdown to EDGE.
 */
const handleTrack = async (interaction: any, env: Env): Promise<Response> => {
  const channelId = interaction.channel_id;

  try {
    // Fetch thread messages from Discord API.
    const messagesResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=100`, {
      headers: {
        Authorization: `Bot ${env.BOT_TOKEN}`,
      },
    });

    if (!messagesResponse.ok) {
      return errorResponse('Failed to fetch thread messages.');
    }

    const messages: any[] = await messagesResponse.json();

    // Format as Markdown (messages come newest-first, reverse for chronological order).
    const reversed = [...messages].reverse();
    const markdown = reversed
      .map((msg) => {
        const timestamp = new Date(msg.timestamp).toISOString();
        const author = msg.author?.username ?? 'Unknown';
        return `**${author}** (${timestamp})\n${msg.content}`;
      })
      .join('\n\n---\n\n');

    const threadName = interaction.channel?.name ?? `Discord thread ${channelId}`;

    // Post to EDGE.
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
      return errorResponse(`Failed to track thread: ${text}`);
    }

    return ephemeralResponse(`Thread **${threadName}** tracked — ${reversed.length} messages captured.`);
  } catch (err) {
    return errorResponse(`Track failed: ${err instanceof Error ? err.message : 'unknown error'}`);
  }
};

export default {
  fetch: async (request: Request, env: Env): Promise<Response> => {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Verify Discord signature.
    const isValid = await verifyDiscordSignature(request, env.DISCORD_PUBLIC_KEY);
    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }

    const interaction = (await request.json()) as any;

    // Handle Discord ping (required for interaction URL verification).
    if (interaction.type === InteractionType.PING) {
      return Response.json({ type: InteractionResponseType.PONG });
    }

    // Handle slash commands.
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = interaction.data?.name;

      switch (commandName) {
        case 'connect':
          return handleConnect(interaction, env);
        case 'track':
          return handleTrack(interaction, env);
        default:
          return errorResponse(`Unknown command: ${commandName}`);
      }
    }

    return new Response('Unknown interaction type', { status: 400 });
  },
};
