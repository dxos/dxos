---
'@dxos/echo': minor
---

The MCP `runScript` tool now answers with the text the program printed instead of a JSON object. A failed program now returns an error result, and every answer ends with a trailer after `---` giving the number of calls the program made, the time spent in them, and the total time. `ScriptResult` gains `stats` (`calls`, `callMs`), counted by both the in-process and the isolate sandbox, and `McpServer.formatScriptAnswer` renders the answer.
