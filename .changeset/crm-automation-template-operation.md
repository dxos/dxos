---
'@dxos/plugin-crm': patch
---

The CRM automation template (`org.dxos.routine.crm`) now scaffolds a deterministic operation routine bound to `CrmOperation.ProcessMailbox` instead of an agentic instructions routine, so the mailbox's Automations companion offers the same cursored, idempotent CRM pipeline the `crmPipeline` project template does — no model between the feed trigger and the operation.
