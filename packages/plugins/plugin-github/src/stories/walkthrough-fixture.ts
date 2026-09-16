//
// Copyright 2026 DXOS.org
//

/**
 * A pull-request walkthrough: one markdown document whose prose, headings and ```diff fences read as
 * a single narrative. Written out rather than generated so the story exercises the cases that matter
 * visually — a pure insertion, a replacement, a removal, several hunks in one file, and a fence with
 * no metadata at all.
 */
export const WALKTHROUGH = `# MCP latency probe

Adds a latency probe to the assistant eval harness. One shared MCP connection serves a whole probe
set: connect, list tools, warm up, then run timed iterations whose statistics the scorer reads
instead of a thrown eval.

## Harness wiring

### Harness API surface

\`ClaudeHarnessOptions.target\` plus harness fields for \`target\`, \`url\`, and a \`latency\` callback that
dials the same surface the agent uses, on a separate connection.

\`\`\`diff file=packages/core/compute/assistant-evals/src/claude-harness.ts lines=66-99 lang=typescript
@@ -64,7 +66,16 @@ export type ClaudeHarnessOptions = {
   allowedTools?: string[];
   model?: string;
   turnTimeout?: number;
+  /**
+   * Which MCP surface to drive: the in-process host, or one of the deployed
+   * \`mcp-space-service\` workers. Defaults to \`DX_EVAL_MCP_TARGET\`, and to
+   * \`local\` without it.
+   */
+  target?: McpTarget;
+
+  /** Called once per probe set with the measured connect and call latencies. */
+  latency?: (report: LatencyReport) => void;
 };
\`\`\`

### Dial remote or host

The dial is the only place that knows which surface is in play, so the rest of the harness keeps
taking a client rather than a target.

\`\`\`diff file=packages/core/compute/assistant-evals/src/claude-harness.ts lines=118-140 lang=typescript
@@ -118,12 +120,16 @@ const connect = async (options: ClaudeHarnessOptions) => {
-  const client = await createLocalClient(options);
-  await client.connect();
-  return client;
+  const target = options.target ?? (process.env.DX_EVAL_MCP_TARGET as McpTarget) ?? 'local';
+  const client = target === 'local' ? await createLocalClient(options) : await createRemoteClient(target);
+  await client.connect();
+  return client;
 };
\`\`\`

## Probe runner

One shared connection for the whole probe set: warmup, then timed iterations. Connect and listTools
failures and per-call throws become errored samples; a cleanup failure must not discard a completed
report.

\`\`\`diff file=packages/core/compute/assistant-evals/src/McpLatency.ts lines=160-181 lang=typescript
@@ -158,6 +160,24 @@ export const probe = async ({ target, probes, iterations }: ProbeOptions) => {
+    // The client may never have connected, and closing one that did not is not
+    // an error worth losing the report over.
+    connectMillis ??= Date.now() - connectStarted;
+    for (const probe of probes) {
+      samples.push({ tool: probe.tool, label: labelOf(probe), millis: Date.now() - connectStarted, isError: true });
+    }
+  } finally {
+    await client.close().catch(() => {});
+  }
+
+  return { target, url, connectMillis: connectMillis ?? 0, samples, stats: summarize(samples) };
 };
\`\`\`

## Eval scenario

### Scorers

A failing probe is now a low score with a reason, not a thrown error, so one unreachable worker no
longer voids the run.

\`\`\`diff file=packages/core/compute/assistant-evals/src/mcp-server.eval.ts lines=40-58 lang=typescript
@@ -40,9 +40,13 @@ const scorers = [
   {
     name: 'latency',
-    score: ({ output }) => {
-      throw new Error('not implemented');
-    },
+    score: ({ output }) => ({
+      score: output.stats.p95 < BUDGET_MILLIS ? 1 : 0,
+      metadata: { p95: output.stats.p95, budget: BUDGET_MILLIS },
+    }),
   },
 ];
\`\`\`

## Documentation

The README gains the environment variable and what the probe reports. A fence needs no metadata when
the prose above it has already said which file is in play.

\`\`\`diff
@@ -12,3 +12,7 @@
 Run the suite with \`moon run assistant-evals:test\`.
+
+Set \`DX_EVAL_MCP_TARGET\` to \`local\`, \`staging\` or \`production\` to choose the
+MCP surface the latency probe dials. The probe reports connect time, per-tool
+p50 and p95, and the error rate across the probe set.
\`\`\`
`;
