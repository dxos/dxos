# ECHO presentation: speaking track

One section per slide, numbered as in the pager (`n / 28`). Each bullet is one spoken sentence. The slide's address
(`#id`) follows its title, so a section can be opened directly at `http://localhost:7420/#id`. Lines are paced at about
150 words a minute (2.5 words a second), starting half a second after the slide is entered, while it moves in; the
[Timing](#timing) table checks each slide against its hold in `record.mjs`. A line marked _(verify)_ makes a product
claim the code does not yet support as spoken.

The tone is upbeat, with a light touch of humour: the takeover story is told with a raised eyebrow, not doom.

## 1. Blank (`#blank`)

- _(Silence; press → to begin.)_

## 2. In the Beginning (`#beginning`)

- In the beginning, there was SaaS.

## 3. Your data lives inside SaaS (`#silo`)

- And it was good.
- Very good.

## 4. Data in both directions (`#silo-comms`)

- Nothing to install, and nothing to maintain.
- Updates just showed up, and the bill went down.

## 5. The vendor grows (`#scale`)

- Vendors could serve everyone at once.
- Soon there was an app for everything.

## 6. Your competitors (`#competitors`)

- But scale rewrote the economics of software.
- Switching got easier, so every vendor dug a moat.

## 7. Many silos (`#spread`)

- Now the average company juggles dozens of apps.

## 8. Teams and their apps (`#spread-comms`)

- Every team has its favourites, each with its own copy of your data.

## 9. A frontier lab arrives (`#frontier`)

- Then AI showed up.

## 10. Everyone talks to the lab (`#frontier-comms`)

- Your people started working with agents, and opened the gates to their data.
- Every vendor rushed out its own AI, with plugins for the frontier platforms.

## 11. The lab at the centre (`#orbit`)

- Meanwhile, the frontier labs kept shipping smarter models.
- And tools that make a lot of those apps look optional.

## 12. The apps are absorbed (`#absorb`)

- One by one, the apps get absorbed.
- And their data goes with them.

## 13. Three labs (`#rivals`)

- As the models converge, every lab needs something to set it apart.

## 14. The labs merge (`#merge-1`)

- Partnerships and acquisitions follow.
- Keep going, and you end up with one very big company.

## 15. The Final Frontier (`#final-frontier`)

- _(Silence; let the caption read.)_

## 16. The Singularity (`#engulf`)

- Which works out great.
- _(Beat, as the frame goes black.)_ Up to a point.

## 17. Don't Panic (`#dont-panic`)

- Don't panic.
- It doesn't have to be this way.

## 18. Back to your company (`#spread-again`)

- Instead of outsourcing your data and your compute,

## 19. Your data, in ECHO (`#echo-hub`)

- DXOS lets you build your own agent-driven apps, and keep the keys to your data. _(verify: replicas sync through DXOS EDGE)_

## 20. The ECHO hypergraph (`#echo-spaces`)

- With the ECHO hypergraph, teams spin up their own private spaces.
- Each one plugs into the data it needs, inside and out.

## 21. A graph of objects (`#objects`)

- Inside, a constellation of objects: documents, files, records and messages.

## 22. One object (`#object-detail`)

- Composer, the super app, brings over a hundred plugins: components, tools and agent skills.

## 23. People and agents together (`#object-thread`)

- People and agents work side by side, in real time, in the same context.
- And what they make syncs straight back into the space.

## 24. Work that builds on itself (`#object-created`)

- Where everyone else can pick it up.
- Meanwhile, agents keep the workflows moving between teams.

## 25. Everyone at work (`#echo-spaces-again`)

- DXOS becomes the operating system for your enterprise.
- And ECHO becomes its brain: flexible, secure, and yours.

## 26. Your company again (`#echo-hub-again`)

- Your compute and intelligence, back in house. _(verify: functions run on Cloudflare Workers)_

## 27. The silos fold in (`#saas-merge`)

- And over time, you rely less on outside vendors.

## 28. DXOS (`#company-fills`)

- This is DXOS.
- Your team.
- Your apps.
- Your data.

## Timing

Words and the seconds they need at 2.5 words a second, plus the half-second lead-in, against each slide's hold in
`record.mjs` (`HOLDS`). **Bold** rows run over and need the proposed hold; slide 14's hold covers both its stages
(`merge-1` runs on into `merge-2`).

| #   | Slide                | Words | Needs | Hold | Proposed |
| --- | -------------------- | ----: | ----: | ---: | -------: |
| 1   | `blank`              |     0 |     — |  1.5 |      1.5 |
| 2   | `beginning`          |     6 |   2.9 |    4 |        4 |
| 3   | `silo`               |     6 |   2.9 |  3.5 |      3.5 |
| 4   | **`silo-comms`**     |    16 |   6.9 |    5 |        7 |
| 5   | **`scale`**          |    13 |   5.7 |  4.5 |        6 |
| 6   | `competitors`        |    16 |   6.9 |  8.5 |      8.5 |
| 7   | **`spread`**         |     8 |   3.7 |  3.5 |        4 |
| 8   | **`spread-comms`**   |    13 |   5.7 |    5 |        6 |
| 9   | `frontier`           |     4 |   2.1 |  3.5 |      3.5 |
| 10  | **`frontier-comms`** |    26 |  10.9 |    5 |       11 |
| 11  | **`orbit`**          |    19 |   8.1 |    5 |      8.5 |
| 12  | `absorb`             |    13 |   5.7 |  6.5 |      6.5 |
| 13  | **`rivals`**         |    12 |   5.3 |  4.5 |      5.5 |
| 14  | `merge-1`            |    15 |   6.5 |    7 |        7 |
| 15  | `final-frontier`     |     0 |     — |    6 |        6 |
| 16  | `engulf`             |     8 |   3.7 |   12 |       12 |
| 17  | `dont-panic`         |     9 |   4.1 |    5 |        5 |
| 18  | `spread-again`       |     8 |   3.7 |    4 |        4 |
| 19  | **`echo-hub`**       |    15 |   6.5 |    4 |      6.5 |
| 20  | **`echo-spaces`**    |    22 |   9.3 |  5.5 |      9.5 |
| 21  | `objects`            |    10 |   4.5 |    5 |        5 |
| 22  | **`object-detail`**  |    14 |   6.1 |    5 |      6.5 |
| 23  | **`object-thread`**  |    24 |  10.1 |   10 |     10.5 |
| 24  | `object-created`     |    15 |   6.5 |   14 |       14 |
| 25  | `echo-spaces-again`  |    17 |   7.3 |   10 |       10 |
| 26  | `echo-hub-again`     |     7 |   3.3 |    4 |        4 |
| 27  | `saas-merge`         |     9 |   4.1 |    9 |        9 |
| 28  | `company-fills`      |     9 |   4.1 |   10 |       10 |

The current holds run 2:50.5; the proposed ones run 3:14.5. 11 slides run over
(4, 5, 7, 8, 10, 11, 13, 19, 20, 22, 23).

## 60-second cut

About 134 words, 54 seconds spoken, which leaves room for the beats. The cut keeps the slides named in bold;
each line starts as its slide is entered.

- **2. In the Beginning:** In the beginning, there was SaaS, and it was good.
- **6. Your competitors:** But scale rewrote the economics, and every vendor dug a moat.
- **7. Many silos:** Now the average company juggles dozens of apps.
- **10. Everyone talks to the lab:** Then AI showed up, and your people opened the gates to their data.
- **11. The lab at the centre:** The frontier labs made a lot of those apps look optional.
- **14. The labs merge:** Keep going, and you end up with one very big company.
- **16. The Singularity:** Which works out great. Up to a point.
- **17. Don't Panic:** Don't panic. It doesn't have to be this way.
- **19. Your data, in ECHO:** DXOS lets you build your own agent-driven apps, and keep the keys to your data.
- **20. The ECHO hypergraph:** Teams spin up private spaces, plugged into the data they need.
- **23. People and agents together:** People and agents work side by side, in real time.
- **25. Everyone at work:** And ECHO becomes the brain of your organization.
- **28. DXOS:** This is DXOS. Your team. Your apps. Your data.
