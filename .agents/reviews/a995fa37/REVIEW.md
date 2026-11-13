---
branch: dm/relaxed-feynman-8amkz1
commit: a995fa37f42ad52f36ebc7abafa0ac2f4b108453
base: 07723a17a957f0e1a476c5211cb40ab6d9591cde
mode: fast
createdAt: 2026-10-23T13:26:54.742Z
isFinalized: true
groups: 139
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, leaf-objects-render-as-cards, leaf-owns-its-subscription, mutate-echo-arrays-with-splice, no-casts, no-styling-wrapper-divs, ref-collections-via-query, story-for-new-ui-component, structured-logging-not-console]
reviewId: a995fa37
---

_1 error(s), 13 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a995fa37-1 - ignored - leaf-objects-render-as-cards - packages/plugins/plugin-mobile/src/components/Home/Home.tsx:63
- a995fa37-2 - ignored - leaf-objects-render-as-cards - packages/plugins/plugin-mobile/src/components/NavBranch/NavBranch.tsx:180
- a995fa37-3 - ignored - story-for-new-ui-component - packages/plugins/plugin-projects/src/components/ObjectGallery/ObjectGallery.tsx:24
- a995fa37-4 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:155
- a995fa37-5 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:215
- a995fa37-6 - ignored - ref-collections-via-query - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:311
- a995fa37-7 - resolved - leaf-objects-render-as-cards - packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:49
- a995fa37-8 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:201
- a995fa37-9 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:68
- a995fa37-10 - ignored - ref-collections-via-query - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:104
- a995fa37-11 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:116
- a995fa37-12 - ignored - no-casts - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:88
- a995fa37-13 - ignored - structured-logging-not-console - packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.stories.tsx:66
- a995fa37-14 - resolved - no-styling-wrapper-divs - packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:89

## Issues

# WARN a995fa37-1 leaf-objects-render-as-cards `packages/plugins/plugin-mobile/src/components/Home/Home.tsx:63`

System One judges this a likely violation of `leaf-objects-render-as-cards` (Every object inside a container is a card with the standard header), p=0.87. The likeliest place is lines 63-74 (`const WorkspaceTile: MosaicStackTileComponent<AppGraphNode.Node> = (props) => {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN a995fa37-2 leaf-objects-render-as-cards `packages/plugins/plugin-mobile/src/components/NavBranch/NavBranch.tsx:180`

System One judges this a likely violation of `leaf-objects-render-as-cards` (Every object inside a container is a card with the standard header), p=0.81. The likeliest place is lines 180-191 (`<Card.Header>`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN a995fa37-3 story-for-new-ui-component `packages/plugins/plugin-projects/src/components/ObjectGallery/ObjectGallery.tsx:24`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.92. The likeliest place is lines 24-35 (`export const ObjectGallery = ({ objects, onOpen, onDelete, testId }: ObjectGa...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN a995fa37-4 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:155`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 155-166 (`Effect.runFork(Fiber.interrupt(fiber));`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN a995fa37-5 mutate-echo-arrays-with-splice `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:215`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.94. The likeliest place is lines 215-226 (`(object: Obj.Unknown) => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN a995fa37-6 ref-collections-via-query `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:311`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.84. The likeliest place is lines 311-322 (`{milestoneRefs.length > 0 && (`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN a995fa37-7 leaf-objects-render-as-cards `packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:49`

System One judges this a likely violation of `leaf-objects-render-as-cards` (Every object inside a container is a card with the standard header), p=0.91. The likeliest place is lines 49-58 (`const ProfileTile = ({ data: profile }: { data: ProfileCardData }) => (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN a995fa37-8 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:201`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 201-212 (`const CompactStory = () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN a995fa37-9 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:68`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 68-79 (`export const GalleryArticle = ({ role, subject: collection, attendableId }: G...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN a995fa37-10 ref-collections-via-query `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:104`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.81. The likeliest place is lines 104-115 (`}`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN a995fa37-11 mutate-echo-arrays-with-splice `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:116`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.93. The likeliest place is lines 116-127 (`collection.objects = remaining;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a995fa37-12 no-casts `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 88-99 (`const meta = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN a995fa37-13 structured-logging-not-console `packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.stories.tsx:66`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 66-77 (`const DefaultStory = () => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN a995fa37-14 no-styling-wrapper-divs `packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:89`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 89-101 (`const TileContent = ({ item }: { item: TestItem }) => (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `07723a17a957f0e1a476c5211cb40ab6d9591cde`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 14 violations written to fragments, 189 uncertain, 659 clean, 0 unanswered
- left for an agentic reviewer: 63 batch(es)

```text
requests: 379 (99 verdicts re-asked with context the model requested)
estimated input tokens: 2462053
billed input tokens: 2330276 (cost $0.0979)
measured chars per token: 3.17
```
