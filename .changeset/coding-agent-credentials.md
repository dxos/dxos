---
'@dxos/plugin-code': minor
'@dxos/plugin-claude': patch
---

Claude Code (cloud) lends each turn's credentials as the environment the agent runs with, through one `provideCredentials` call: the Claude subscription token as `CLAUDE_CODE_OAUTH_TOKEN` (or the Anthropic key as `ANTHROPIC_API_KEY`) and the space's GitHub token as `GITHUB_TOKEN`/`GH_TOKEN`, so the agent can clone private repositories, push and open pull requests with `gh`. `EdgeAgent`'s definition takes a single `credentials` effect in place of `credential` and `gitCredential`, and `EdgeAgent.githubCredentials` replaces `githubCredential`.
