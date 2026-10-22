---
'@dxos/plugin-assistant': minor
---

Light threads: with the assistant's new **Parallel threads** setting on, a prompt sent while the agent works starts a thread that runs in parallel instead of waiting. The new thread starts with a transcript of every running thread and can wait for one with the `thread_wait` tool; finished threads join the conversation. The chat colours each thread's gutter, collapses a thread still working in the background into a card that follows its tail, and echoes a background thread's answer when it finishes. Another installed agent can share the chat (**Parallel thread agents**): a prompt starting with `@<agent>` runs on that agent, in a lane of its own. `@dxos/trajectory` adds the `light` thread mode, `threadWait`, `Compact.closure` and lanes in `Reducer.thread` (`thread@2`).
