//
// Copyright 2026 DXOS.org
//

/**
 * Script to register Discord slash commands for the bot.
 * Run with: npx tsx src/register-commands.ts
 *
 * Requires environment variables:
 *   DISCORD_APPLICATION_ID — Discord application ID.
 *   BOT_TOKEN — Discord bot token.
 */

const DISCORD_API = 'https://discord.com/api/v10';

const commands = [
  {
    name: 'connect',
    description: 'Connect this Discord guild to a DXOS space.',
    options: [
      {
        name: 'space-key',
        description: 'The DXOS space key to connect to.',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'track',
    description: 'Post the current thread as a Markdown document to the connected DXOS space.',
  },
];

const main = async () => {
  const applicationId = process.env.DISCORD_APPLICATION_ID;
  const botToken = process.env.BOT_TOKEN;

  if (!applicationId || !botToken) {
    console.error('Missing DISCORD_APPLICATION_ID or BOT_TOKEN environment variables.');
    process.exit(1);
  }

  const response = await fetch(`${DISCORD_API}/applications/${applicationId}/commands`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Failed to register commands: ${response.status} ${text}`);
    process.exit(1);
  }

  const result = await response.json();
  console.log(`Registered ${(result as any[]).length} commands.`);
};

void main();
