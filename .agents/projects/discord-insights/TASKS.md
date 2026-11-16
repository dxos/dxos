# Discord insights: Cloudflare community analytics

Goal (from the call, 2026-11-16): show Cloudflare that feeds ingest their own large dataset into ECHO and that we can
query it and draw conclusions they don't have today — who their superstar users are, what keeps being asked, and how
people feel about their products. Data quality over UI: query headlessly from a CLI, iterate on the extractor.

Dataset: Cloudflare Developers Discord (`595317990191398933`), exports in `~/.local/share/dxos/discord-export/`,
fact stores in `~/.local/share/dxos/discord-pipeline/`. Fixtures catalog: `tools/fixtures/CATALOG.md`.

## Ideas from the call

1. **Right channels.** `#general` is spam and account questions ("why is my verification email not coming"); the signal
   is in the product channels (`#workers-and-pages`, `#durable-objects`, `#d1-database`, `#workers-ai`, `#agents`, …)
   and the help forums. Re-scan and crawl product channels only, two months back.
2. **Histograms first.** Questions per channel, per product, per week; messages per user (long tail); answers per
   user; first-response time. Cheap SQL/SPARQL over the store, no model.
3. **Categorize users.** Inside or outside Cloudflare (staff badge, how often they answer), and expertise
   (asks / answers / both). The interesting cut: external users who answer others — the "10 power users".
4. **Mini profiles of interesting users.** For the top external helpers and frequent askers: products they use, what
   they built, questions asked and answered, sentiment. A throwaway report a sales team would want.
5. **Category analysis of questions (system two).** Have the model propose an ontology of question kinds over a sample,
   then classify every question into it; histogram the kinds per product.
6. **FAQ for agents, not users.** Cluster recurring questions to show where the docs break down — "what everybody keeps
   asking that we don't have a solution for".
7. **Product sentiment.** Per message: which Cloudflare products it mentions and the sentiment toward each; trend per
   product per week, so a launch (new AI or database offering) shows up as a spike in talk and its tone.
8. **Blog as the timeline.** Ingest the Cloudflare blog (and the Workers changelog) as dated launch events, so product
   sentiment can be read against announcements.
9. **Answered threads we could have answered.** Find threads a human answered and show the answer was derivable from
   earlier answers or docs (a later demo; the call ranked it below analytics).
10. **Feeds → ECHO → dashboard.** The demo's point is the pipeline: feeds ingest a large dataset and map it onto ECHO;
    the dashboard (histograms, a spreadsheet of users) is the evidence. Keep the CLI output table-shaped so it can feed
    one.
11. **Quality over volume.** Extraction from `#general`-style chatter yields low-value facts; prefer fewer, typed facts
    (product, issue, sentiment, role) over open triples.

## Tasks

- [ ] Headless SPARQL / report CLI over a facts DB.
- [ ] Re-scan channels; classify product vs general vs social; crawl product channels and forums, 60 days.
- [ ] Per-message classification stage: products mentioned, sentiment per product, message kind (question, answer,
      bug report, feature request, praise, complaint).
- [ ] User roles: staff / external, asker / helper / both, from message and reply structure.
- [ ] Blog ingest: Cloudflare blog RSS as dated product announcements.
- [ ] Reports: histograms, top helpers with mini profiles, question categories, recurring questions, product sentiment
      by week against blog launches.
