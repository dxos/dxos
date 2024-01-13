# Discord Bot

## Set-up

- Open Discord developer portal: https://discord.com/developers/applications
- Create a new application
  - Create a bot
    - Make private
    - Enable intents
    - Get token (add to .env file)
  - OAuth > URL Generator
    - Scopes: 'bot' + 'applications.commands'
    - Permissions: 'Send Messages' + 'Embed Links' + 'Read Message History'
    - Copy URL and paste in browser
    - Authorize bot (should be offline)
  - Ensure bot has permission to test channel (dev-null)

