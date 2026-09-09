---
'@dxos/plugin-deepseek': patch
---

Name a current DeepSeek model id in the `RunHarness` tool description.

The `model` parameter's description offered `deepseek-chat` as its example, which DeepSeek
discontinued on 2026-07-24. Because that string is read by a model choosing a value, an agent would
pass an id the provider rejects — surfacing only at run time, since the value travels as
`DEEPSEEK_MODEL` into a third-party CLI. It now names `deepseek-v4-flash` / `deepseek-v4-pro` and
notes that one id serves both thinking and non-thinking mode.
