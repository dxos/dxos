---
'@dxos/deus': minor
'@dxos/plugin-projects': minor
---

A spec's views open in Structure, Decisions and Review companion tabs beside its text, each view ships with the dialect it reads (the software views with plugin-code, the Video package with plugin-video), and a nested spec is picked from the Specs tab's dropdown instead of the nav tree. Breaking: `Spec` moves to 0.4.0 and its migration rewrites a spec's dialects to `org.dxos.spec.software`; `ProjectSurface.Level`, `ProjectSurface.LevelOverview` and `ProjectGraph.makeLevelNode` are removed.
