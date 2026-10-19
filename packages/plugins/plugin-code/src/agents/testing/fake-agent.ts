//
// Copyright 2026 DXOS.org
//

import * as acp from '@agentclientprotocol/sdk';

/**
 * A scripted ACP agent for tests, driven by words in the prompt:
 * `tool` makes a tool call, `permission` asks to run one and reports the answer, `slow` waits until
 * cancelled, `crash` asks to run one and fails without waiting, and every turn ends by echoing the
 * prompt in two chunks of one message. Reloading a session it never hosted fails as Claude Code's does.
 * Each session's `_meta`, from opening or reloading it, is pushed to `opened`.
 */
export const makeFakeAgent = ({ opened = [] }: { opened?: unknown[] } = {}): acp.AgentApp => {
  let sessions = 0;
  const history = new Map<string, string[]>();
  const cancellers = new Map<string, () => void>();

  return acp
    .agent({ name: 'fake-agent' })
    .onRequest(acp.methods.agent.initialize, () => ({
      protocolVersion: acp.PROTOCOL_VERSION,
      agentCapabilities: { loadSession: true },
    }))
    .onRequest(acp.methods.agent.session.new, ({ params }) => {
      opened.push(params._meta);
      const sessionId = `fake-${++sessions}`;
      history.set(sessionId, []);
      return {
        sessionId,
        modes: {
          currentModeId: 'default',
          availableModes: [
            { id: 'default', name: 'Default' },
            { id: 'acceptEdits', name: 'Accept edits' },
          ],
        },
      };
    })
    .onRequest(acp.methods.agent.session.load, async ({ params, client }) => {
      opened.push(params._meta);
      const lines = history.get(params.sessionId);
      if (!lines) {
        throw acp.RequestError.resourceNotFound(params.sessionId);
      }
      for (const line of lines) {
        await client.notify(acp.methods.client.session.update, {
          sessionId: params.sessionId,
          update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: line } },
        });
      }
      return {};
    })
    .onRequest(acp.methods.agent.session.setMode, () => ({}))
    .onNotification(acp.methods.agent.session.cancel, ({ params }) => {
      cancellers.get(params.sessionId)?.();
    })
    .onRequest(acp.methods.agent.session.prompt, async ({ params, client }) => {
      const { sessionId } = params;
      const text = params.prompt.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
      const update = (update: acp.SessionUpdate) =>
        client.notify(acp.methods.client.session.update, { sessionId, update });

      if (text.includes('slow')) {
        await new Promise<void>((resolve) => cancellers.set(sessionId, resolve));
        cancellers.delete(sessionId);
        return { stopReason: 'cancelled' };
      }

      if (text.includes('tool')) {
        await update({
          sessionUpdate: 'tool_call',
          toolCallId: 'tool-1',
          title: 'Preparing file…',
          name: 'Write',
          kind: 'edit',
          status: 'pending',
          rawInput: { path: 'note.txt' },
        });
        await update({ sessionUpdate: 'tool_call_update', toolCallId: 'tool-1', title: 'Write note.txt' });
        await update({
          sessionUpdate: 'tool_call_update',
          toolCallId: 'tool-1',
          status: 'completed',
          content: [{ type: 'content', content: { type: 'text', text: 'wrote 1 line' } }],
        });
      }

      if (text.includes('crash')) {
        // Asked and abandoned: the turn fails before any answer, which nothing here waits for.
        void client
          .request(acp.methods.client.session.requestPermission, {
            sessionId,
            toolCall: { toolCallId: 'tool-3', title: 'Delete everything', kind: 'delete', status: 'pending' },
            options: [{ optionId: 'allow', name: 'Yes', kind: 'allow_once' }],
          })
          .catch(() => undefined);
        throw new Error('agent crashed');
      }

      if (text.includes('permission')) {
        await update({
          sessionUpdate: 'tool_call',
          toolCallId: 'tool-2',
          title: 'Run pnpm test',
          name: 'Bash',
          kind: 'execute',
          status: 'pending',
        });
        const answer = await client.request(acp.methods.client.session.requestPermission, {
          sessionId,
          toolCall: { toolCallId: 'tool-2', title: 'Run pnpm test', kind: 'execute', status: 'pending' },
          options: [
            { optionId: 'allow', name: 'Yes', kind: 'allow_once' },
            { optionId: 'reject', name: 'No', kind: 'reject_once' },
          ],
        });
        const outcome = answer.outcome.outcome === 'selected' ? answer.outcome.optionId : 'cancelled';
        await update({
          sessionUpdate: 'tool_call_update',
          toolCallId: 'tool-2',
          status: outcome === 'allow' ? 'completed' : 'failed',
          content: [{ type: 'content', content: { type: 'text', text: outcome } }],
        });
      }

      const reply = `echo: ${text}`;
      const messageId = `message-${sessionId}-${(history.get(sessionId) ?? []).length}`;
      await update({ sessionUpdate: 'agent_message_chunk', messageId, content: { type: 'text', text: 'echo: ' } });
      await update({ sessionUpdate: 'agent_message_chunk', messageId, content: { type: 'text', text } });
      history.get(sessionId)?.push(reply);
      return { stopReason: 'end_turn', usage: { inputTokens: 3, outputTokens: 5, totalTokens: 8 } };
    });
};
