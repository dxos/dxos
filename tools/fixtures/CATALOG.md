# Fixture catalog

Fixtures in the `agents` scope of the private `test-fixtures` bucket, readable by the person who pushed them and by any
agent holding the agents key. How to push, pull and gate a test on them: the `private-fixtures` skill. Every push is a
new version; `pull` takes the newest.

```bash
moon run fixtures:pull -- <name> --scope agents          # → testing/fixtures/<name>-<version>.<ext>
tar -xzf testing/fixtures/<name>-<version>.tgz -C <dir>  # .tgz fixtures are directories
```

## Discord

Real public Discord servers, exported with `plugin-discord`'s exporter (bot and webhook messages kept in the export,
dropped when the pipeline reads it). They contain real usernames and messages: keep them out of the repo, PRs and logs.

| Name                            | Version         | Contents                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `discord-export-effect`         | 20261116-125918 | `effect/`: Effect Community, 30 days to 2026-11-14, 311 DiscordChatExporter JSON files, 1,232 human messages                                                                                                                                                                                                                               |
| `discord-export-cloudflare`     | 20261116-172019 | `cloudflare/`: Cloudflare Developers, 30 days to 2026-11-16, 523 JSONL files from 105 human channels and forums, 3,720 human messages, the channel scan `channels.json` and members' server roles `members.json` (1,010 lookups); the earlier version 20261116-125918 lacks `members.json`                                                 |
| `discord-export-cloudflare-60d` | 20261116-172019 | `cloudflare-60d/`: Cloudflare Developers, 60 days to 2026-11-16, 731 JSONL files from 32 product channels and 5 help forums (social channels left out), 3,625 human messages, `members.json` for 930 authors                                                                                                                               |
| `discord-db-effect`             | 20261116-125918 | `effect/`: `facts.db`, `crawl.db`, `trace.jsonl` from the basic pipeline over `discord-export-effect` (Haiku 5.5, all vocabulary packs, thinking on)                                                                                                                                                                                       |
| `discord-db-cloudflare`         | 20261116-125918 | `cloudflare/`: `facts.db`, `crawl.db`, `trace.jsonl` from the same pipeline over `discord-export-cloudflare`                                                                                                                                                                                                                               |
| `discord-db-cloudflare-60d`     | 20261116-172019 | `cloudflare-60d/`: `facts.db`, `crawl.db`, `trace.jsonl` from the same pipeline over `discord-export-cloudflare-60d` (4 extraction batches, 8 topic summaries at once)                                                                                                                                                                     |
| `discord-insights-cloudflare`   | 20261116-172019 | `discord-insights/`: the SQLite insights databases (`cf-60d.db`, `cf-30d.db`: messages, threads, members, classification, product mentions, FAQ, profiles, announcement timeline), `blog-facts.db` (facts from Cloudflare's changelog and blog), the model-call traces, and `REPORT-full.md` (named profiles; never copy it into the repo) |

Query the insights databases (`.agents/projects/discord-insights/REPORT.md` describes them):

```bash
moon run plugin-discord:facts -- sql @src/testing/insights/queries/helpers.sql --crawl <dir>/discord-insights/cf-60d.db
moon run plugin-discord:facts -- sparql 'SELECT ?s ?p ?o WHERE { GRAPH ?g { ?s ?p ?o } } LIMIT 20' --facts <dir>/discord-insights/blog-facts.db
```

Run the pipeline over an export, or browse a database:

```bash
DISCORD_EXPORT_DIR=<dir>/cloudflare DISCORD_CRAWL_DB=<out>/crawl.db DISCORD_FACTS_DB=<out>/facts.db moon run plugin-discord:crawl-export
DISCORD_FACTS_DB=<dir>/cloudflare/facts.db moon run plugin-discord:fact-server   # then the stories-brain FactExplorer story
```

## Finance

| Name         | Version         | Contents                                                                                                                                                                                                                                                                                                      |
| ------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `finance-db` | 20261116-125918 | `finance/`: `facts.db` (unified fact store, 109,356 facts), `echo/` (the source feeds), `trace.jsonl`, from `plugin-finance` over one month (2026-10-16 to 2026-11-16) of keyless sources: finance news RSS, SEC filings and Form 4/13F, central banks, Reddit, crypto news, daily prices, FINRA short volume |

```bash
FINANCE_DIR=<dir>/finance FINANCE_TICKER=META moon run plugin-finance:query
DISCORD_FACTS_DB=<dir>/finance/facts.db moon run plugin-discord:fact-server
```
