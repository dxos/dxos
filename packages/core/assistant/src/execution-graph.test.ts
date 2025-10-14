//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';

import { AgentStatus } from '@dxos/ai';
import { Obj } from '@dxos/echo';
import { ObjectId } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { ExecutionGraph } from './execution-graph';

// Helper function to create valid object IDs for testing
const createTestId = () => ObjectId.random();

describe('ExecutionGraph', () => {
  describe('basic functionality', () => {
    it('should create an empty graph initially', () => {
      const graph = new ExecutionGraph();
      const result = graph.getGraph();

      expect(result.branches).toEqual([]);
      expect(result.commits).toEqual([]);
    });

    it('should add a simple user message', () => {
      const graph = new ExecutionGraph();
      const messageId = createTestId();
      const message = Obj.make(DataType.Message, {
        id: messageId,
        created: '2025-01-01T00:00:00Z',
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'text',
            text: 'Hello, world!',
          },
        ],
        properties: {},
      });

      graph.addEvents([message]);
      const result = graph.getGraph();

      expect(result.branches).toEqual(['main']);
      expect(result.commits).toHaveLength(1);
      expect(result.commits[0]).toMatchObject({
        id: `${messageId}_block_0`,
        branch: 'main',
        message: 'Processing request...',
        parents: [],
        tags: ['user'],
      });
    });

    it('should handle basic status & message processing', () => {
      const graph = new ExecutionGraph();
      const status = Obj.make(AgentStatus, {
        created: '2025-01-01T00:00:00Z',
        message: 'Running Research',
      });
      const message = Obj.make(DataType.Message, {
        created: '2025-09-29T14:29:37.860Z',
        sender: {
          role: 'user',
        },
        blocks: [
          {
            _tag: 'text',
            text: '{"id":"01K6AXZKK79H4E54RKP1YZDARK","@type":"dxn:type:dxos.org/type/Organization:0.1.0","@meta":{"keys":[]},"name":"Blue Yard","website":"https://blueyard.com"}',
          },
        ],
        properties: {},
      });

      graph.addEvents([status, message]);
      const result = graph.getGraph();
      log.info('result', result);

      expect(result.branches).toEqual(['main']);
      expect(result.commits).toHaveLength(2);
      expect(result.commits[0].branch).toEqual('main');
      expect(result.commits[0].message).toEqual('Running Research');
      expect(result.commits[0].parents).toEqual([]);
      expect(result.commits[1].branch).toEqual('main');
      expect(result.commits[1].message).toEqual('Processing request...');
      expect(result.commits[1].parents).toEqual([status.id]);
    });

    it('should add an assistant message with text', () => {
      const graph = new ExecutionGraph();
      const messageId = createTestId();
      const message = Obj.make(DataType.Message, {
        id: messageId,
        created: '2025-01-01T00:00:00Z',
        sender: { role: 'assistant' },
        blocks: [
          {
            _tag: 'text',
            text: 'Hello! How can I help you today?',
          },
        ],
        properties: {},
      });

      graph.addEvents([message]);
      const result = graph.getGraph();

      expect(result.commits).toHaveLength(1);
      expect(result.commits[0]).toMatchObject({
        id: `${messageId}_block_0`,
        branch: 'main',
        message: 'Response (7 words)',
        parents: [],
      });
    });
  });

  describe('sequential chaining within messages', () => {
    it('should chain blocks within a message', () => {
      const graph = new ExecutionGraph();
      const messageId = createTestId();
      const message = Obj.make(DataType.Message, {
        id: messageId,
        created: '2025-01-01T00:00:00Z',
        sender: { role: 'assistant' },
        blocks: [
          {
            _tag: 'text',
            text: 'First block',
          },
          {
            _tag: 'text',
            text: 'Second block',
          },
          {
            _tag: 'text',
            text: 'Third block',
          },
        ],
        properties: {},
      });

      graph.addEvents([message]);
      const result = graph.getGraph();

      expect(result.commits).toHaveLength(3);

      // First block has no parents
      expect(result.commits[0]).toMatchObject({
        id: `${messageId}_block_0`,
        parents: [],
      });

      // Second block has first block as parent
      expect(result.commits[1]).toMatchObject({
        id: `${messageId}_block_1`,
        parents: [`${messageId}_block_0`],
      });

      // Third block has second block as parent
      expect(result.commits[2]).toMatchObject({
        id: `${messageId}_block_2`,
        parents: [`${messageId}_block_1`],
      });
    });

    it('should chain across multiple messages', () => {
      const graph = new ExecutionGraph();

      // First message
      const message1Id = createTestId();
      const message1 = Obj.make(DataType.Message, {
        id: message1Id,
        created: '2025-01-01T00:00:00Z',
        sender: { role: 'user' },
        blocks: [{ _tag: 'text', text: 'Hello' }],
        properties: {},
      });

      // Second message
      const message2Id = createTestId();
      const message2 = Obj.make(DataType.Message, {
        id: message2Id,
        created: '2025-01-01T00:01:00Z',
        sender: { role: 'assistant' },
        blocks: [{ _tag: 'text', text: 'Hi there!' }],
        properties: {},
      });

      graph.addEvents([message1, message2]);
      const result = graph.getGraph();

      expect(result.commits).toHaveLength(2);

      // First message block has no parents
      expect(result.commits[0]).toMatchObject({
        id: `${message1Id}_block_0`,
        parents: [],
      });

      // Second message block has first message block as parent
      expect(result.commits[1]).toMatchObject({
        id: `${message2Id}_block_0`,
        parents: [`${message1Id}_block_0`],
      });
    });
  });

  describe('tool calls and results', () => {
    it('should handle tool calls and results with proper parent relationships', () => {
      const graph = new ExecutionGraph();

      const message1Id = createTestId();
      const message2Id = createTestId();
      const statusId = createTestId();
      const toolCallId = 'tool1';

      // Assistant message with tool call
      const toolCallMessage = Obj.make(DataType.Message, {
        id: message1Id,
        created: '2025-01-01T00:00:00Z',
        sender: { role: 'assistant' },
        blocks: [
          {
            _tag: 'text',
            text: 'I will help you with that.',
          },
          {
            _tag: 'toolCall',
            toolCallId,
            name: 'test_tool',
            input: '{"param": "value"}',
            providerExecuted: false,
          },
        ],
        properties: {},
      });

      // User message with tool result
      const toolResultMessage = Obj.make(DataType.Message, {
        id: message2Id,
        created: '2025-01-01T00:01:00Z',
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'toolResult',
            toolCallId,
            name: 'test_tool',
            result: '{"result": "success"}',
            providerExecuted: false,
          },
        ],
        properties: {},
      });

      // AgentStatus event
      const agentStatus = Obj.make(AgentStatus, {
        id: statusId,
        created: '2025-01-01T00:02:00Z',
        parentMessage: message1Id,
        toolCallId,
        message: 'Processing tool call...',
      });

      graph.addEvents([toolCallMessage, toolResultMessage, agentStatus]);
      const result = graph.getGraph();

      expect(result.commits).toHaveLength(4);

      // Text block
      expect(result.commits[0]).toMatchObject({
        id: `${message1Id}_block_0`,
        parents: [],
      });

      // Tool call block
      expect(result.commits[1]).toMatchObject({
        id: `${message1Id}_toolCall_${toolCallId}`,
        parents: [`${message1Id}_block_0`],
      });

      // Tool result should have two parents: AgentStatus and tool call
      expect(result.commits[2]).toMatchObject({
        id: `${message2Id}_toolResult_${toolCallId}`,
        parents: [statusId, `${message1Id}_toolCall_${toolCallId}`],
      });

      // AgentStatus
      expect(result.commits[3]).toMatchObject({
        id: statusId,
        parents: [`${message1Id}_toolCall_${toolCallId}`],
      });
    });

    it('should handle tool errors with proper parent relationships', () => {
      const graph = new ExecutionGraph();

      const message1Id = createTestId();
      const message2Id = createTestId();
      const statusId = createTestId();
      const toolCallId = 'tool1';

      // Assistant message with tool call
      const toolCallMessage = Obj.make(DataType.Message, {
        id: message1Id,
        created: '2025-01-01T00:00:00Z',
        sender: { role: 'assistant' },
        blocks: [
          {
            _tag: 'toolCall',
            toolCallId,
            name: 'test_tool',
            input: '{"param": "value"}',
            providerExecuted: false,
          },
        ],
        properties: {},
      });

      // User message with tool error
      const toolErrorMessage = Obj.make(DataType.Message, {
        id: message2Id,
        created: '2025-01-01T00:01:00Z',
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'toolResult',
            toolCallId,
            name: 'test_tool',
            error: 'Tool execution failed',
            providerExecuted: false,
          },
        ],
        properties: {},
      });

      // AgentStatus event
      const agentStatus = Obj.make(AgentStatus, {
        id: statusId,
        created: '2025-01-01T00:02:00Z',
        parentMessage: message1Id,
        toolCallId,
        message: 'Tool execution failed',
      });

      graph.addEvents([toolCallMessage, toolErrorMessage, agentStatus]);
      const result = graph.getGraph();

      expect(result.commits).toHaveLength(3);

      // Tool call block
      expect(result.commits[0]).toMatchObject({
        id: `${message1Id}_toolCall_${toolCallId}`,
        parents: [],
      });

      // Tool error should have two parents: AgentStatus and tool call
      expect(result.commits[1]).toMatchObject({
        id: `${message2Id}_toolResult_${toolCallId}`,
        parents: [statusId, `${message1Id}_toolCall_${toolCallId}`],
      });

      // AgentStatus
      expect(result.commits[2]).toMatchObject({
        id: statusId,
        parents: [`${message1Id}_toolCall_${toolCallId}`],
      });
    });
  });

  describe('different processing orders', () => {
    it('should handle AgentStatus processed after tool result', () => {
      const graph = new ExecutionGraph();

      const message1Id = createTestId();
      const message2Id = createTestId();
      const statusId = createTestId();
      const toolCallId = 'tool1';

      // Tool call message
      const toolCallMessage = Obj.make(DataType.Message, {
        id: message1Id,
        created: '2025-01-01T00:00:00Z',
        sender: { role: 'assistant' },
        blocks: [
          {
            _tag: 'toolCall',
            toolCallId,
            name: 'test_tool',
            input: '{}',
            providerExecuted: false,
          },
        ],
        properties: {},
      });

      // Tool result message
      const toolResultMessage = Obj.make(DataType.Message, {
        id: message2Id,
        created: '2025-01-01T00:01:00Z',
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'toolResult',
            toolCallId,
            name: 'test_tool',
            result: '{"result": "success"}',
            providerExecuted: false,
          },
        ],
        properties: {},
      });

      // AgentStatus event (processed after tool result)
      const agentStatus = Obj.make(AgentStatus, {
        id: statusId,
        created: '2025-01-01T00:00:00Z',
        parentMessage: message1Id,
        toolCallId,
        message: 'Processing...',
      });

      graph.addEvents([toolCallMessage, toolResultMessage, agentStatus]);
      const result = graph.getGraph();

      // Tool result should be updated to point to AgentStatus
      const toolResult = result.commits.find((c) => c.id === `${message2Id}_toolResult_${toolCallId}`);
      expect(toolResult?.parents).toContain(statusId);
    });

    it('should handle AgentStatus processed before tool result', () => {
      const graph = new ExecutionGraph();

      const message1Id = createTestId();
      const message2Id = createTestId();
      const statusId = createTestId();
      const toolCallId = 'tool1';

      // Tool call message
      const toolCallMessage = Obj.make(DataType.Message, {
        id: message1Id,
        created: '2025-01-01T00:00:00Z',
        sender: { role: 'assistant' },
        blocks: [
          {
            _tag: 'toolCall',
            toolCallId,
            name: 'test_tool',
            input: '{}',
            providerExecuted: false,
          },
        ],
        properties: {},
      });

      // AgentStatus event (processed before tool result)
      const agentStatus = Obj.make(AgentStatus, {
        id: statusId,
        created: '2025-01-01T00:00:00Z',
        parentMessage: message1Id,
        toolCallId,
        message: 'Processing...',
      });

      // Tool result message
      const toolResultMessage = Obj.make(DataType.Message, {
        id: message2Id,
        created: '2025-01-01T00:01:00Z',
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'toolResult',
            toolCallId,
            name: 'test_tool',
            result: '{"result": "success"}',
            providerExecuted: false,
          },
        ],
        properties: {},
      });

      graph.addEvents([toolCallMessage, agentStatus, toolResultMessage]);
      const result = graph.getGraph();

      // Tool result should point to AgentStatus
      const toolResult = result.commits.find((c) => c.id === `${message2Id}_toolResult_${toolCallId}`);
      expect(toolResult?.parents).toContain(statusId);
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple tool calls in sequence', () => {
      const graph = new ExecutionGraph();

      const msg1Id = createTestId();
      const msg2Id = createTestId();
      const msg3Id = createTestId();
      const msg4Id = createTestId();
      const msg5Id = createTestId();
      const status1Id = createTestId();
      const status2Id = createTestId();

      const events = [
        // User message
        Obj.make(DataType.Message, {
          id: msg1Id,
          created: '2025-01-01T00:00:00Z',
          sender: { role: 'user' },
          blocks: [{ _tag: 'text', text: 'Help me with two tasks' }],
          properties: {},
        }),

        // Assistant with first tool call
        Obj.make(DataType.Message, {
          id: msg2Id,
          created: '2025-01-01T00:01:00Z',
          sender: { role: 'assistant' },
          blocks: [
            { _tag: 'text', text: 'I will help with both tasks' },
            { _tag: 'toolCall', toolCallId: 'tool1', name: 'task1', input: '{}', providerExecuted: false },
          ],
          properties: {},
        }),

        // First tool result
        Obj.make(DataType.Message, {
          id: msg3Id,
          created: '2025-01-01T00:02:00Z',
          sender: { role: 'user' },
          blocks: [
            {
              _tag: 'toolResult',
              toolCallId: 'tool1',
              name: 'task1',
              result: '{"done": true}',
              providerExecuted: false,
            },
          ],
          properties: {},
        }),

        // Assistant with second tool call
        Obj.make(DataType.Message, {
          id: msg4Id,
          created: '2025-01-01T00:03:00Z',
          sender: { role: 'assistant' },
          blocks: [
            { _tag: 'text', text: 'Now for the second task' },
            { _tag: 'toolCall', toolCallId: 'tool2', name: 'task2', input: '{}', providerExecuted: false },
          ],
          properties: {},
        }),

        // Second tool result
        Obj.make(DataType.Message, {
          id: msg5Id,
          created: '2025-01-01T00:04:00Z',
          sender: { role: 'user' },
          blocks: [
            {
              _tag: 'toolResult',
              toolCallId: 'tool2',
              name: 'task2',
              result: '{"done": true}',
              providerExecuted: false,
            },
          ],
          properties: {},
        }),

        // AgentStatus events
        Obj.make(AgentStatus, {
          id: status1Id,
          created: '2025-01-01T00:05:00Z',
          parentMessage: msg2Id,
          toolCallId: 'tool1',
          message: 'Processing task 1...',
        }),

        Obj.make(AgentStatus, {
          id: status2Id,
          created: '2025-01-01T00:06:00Z',
          parentMessage: msg4Id,
          toolCallId: 'tool2',
          message: 'Processing task 2...',
        }),
      ];

      graph.addEvents(events);
      const result = graph.getGraph();

      expect(result.commits).toHaveLength(9);

      // Check sequential chaining
      expect(result.commits[0].parents).toEqual([]); // msg1_block_0
      expect(result.commits[1].parents).toEqual([`${msg1Id}_block_0`]); // msg2_block_0
      expect(result.commits[2].parents).toEqual([`${msg2Id}_block_0`]); // msg2_toolCall_tool1
      expect(result.commits[3].parents).toEqual([status1Id, `${msg2Id}_toolCall_tool1`]); // msg3_toolResult_tool1
      expect(result.commits[4].parents).toEqual([`${msg3Id}_toolResult_tool1`]); // msg4_block_0
      expect(result.commits[5].parents).toEqual([`${msg4Id}_block_0`]); // msg4_toolCall_tool2
      expect(result.commits[6].parents).toEqual([status2Id, `${msg4Id}_toolCall_tool2`]); // msg5_toolResult_tool2
    });

    it('should handle mixed block types in a message', () => {
      const graph = new ExecutionGraph();

      const messageId = createTestId();
      const message = Obj.make(DataType.Message, {
        id: messageId,
        created: '2025-01-01T00:00:00Z',
        sender: { role: 'assistant' },
        blocks: [
          { _tag: 'text', text: 'Let me help you' },
          { _tag: 'reasoning', reasoningText: 'I need to think about this' },
          { _tag: 'toolCall', toolCallId: 'tool1', name: 'analyze', input: '{}', providerExecuted: false },
          {
            _tag: 'summary',
            message: 'OK',
            duration: 1000,
            toolCalls: 1,
            usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
          },
        ],
        properties: {},
      });

      graph.addEvents([message]);
      const result = graph.getGraph();

      expect(result.commits).toHaveLength(4);

      // All blocks should be chained sequentially
      expect(result.commits[0].parents).toEqual([]); // text
      expect(result.commits[1].parents).toEqual([`${messageId}_block_0`]); // reasoning
      expect(result.commits[2].parents).toEqual([`${messageId}_block_1`]); // toolCall
      expect(result.commits[3].parents).toEqual([`${messageId}_toolCall_tool1`]); // summary
    });
  });

  describe('edge cases', () => {
    it('should handle empty text blocks', () => {
      const graph = new ExecutionGraph();

      const messageId = createTestId();
      const message = Obj.make(DataType.Message, {
        id: messageId,
        created: '2025-01-01T00:00:00Z',
        sender: { role: 'assistant' },
        blocks: [
          { _tag: 'text', text: 'Valid text' },
          { _tag: 'text', text: '' }, // Empty text should be filtered out
          { _tag: 'text', text: 'More valid text' },
        ],
        properties: {},
      });

      graph.addEvents([message]);
      const result = graph.getGraph();

      expect(result.commits).toHaveLength(2); // Empty block should be filtered out
      expect(result.commits[0].parents).toEqual([]); // First text block
      expect(result.commits[1].parents).toEqual([`${messageId}_block_0`]); // Third text block
    });

    it('should handle messages with no blocks', () => {
      const graph = new ExecutionGraph();

      const messageId = createTestId();
      const message = Obj.make(DataType.Message, {
        id: messageId,
        created: '2025-01-01T00:00:00Z',
        sender: { role: 'assistant' },
        blocks: [],
        properties: {},
      });

      graph.addEvents([message]);
      const result = graph.getGraph();

      expect(result.commits).toHaveLength(0);
    });

    it('should handle getGraph with lastRequest filter', () => {
      const graph = new ExecutionGraph();

      const msg1Id = createTestId();
      const msg2Id = createTestId();
      const msg3Id = createTestId();
      const msg4Id = createTestId();

      const events = [
        Obj.make(DataType.Message, {
          id: msg1Id,
          created: '2025-01-01T00:00:00Z',
          sender: { role: 'user' },
          blocks: [{ _tag: 'text', text: 'First request' }],
          properties: {},
        }),
        Obj.make(DataType.Message, {
          id: msg2Id,
          created: '2025-01-01T00:01:00Z',
          sender: { role: 'assistant' },
          blocks: [{ _tag: 'text', text: 'Response 1' }],
          properties: {},
        }),
        Obj.make(DataType.Message, {
          id: msg3Id,
          created: '2025-01-01T00:02:00Z',
          sender: { role: 'user' },
          blocks: [{ _tag: 'text', text: 'Second request' }],
          properties: {},
        }),
        Obj.make(DataType.Message, {
          id: msg4Id,
          created: '2025-01-01T00:03:00Z',
          sender: { role: 'assistant' },
          blocks: [{ _tag: 'text', text: 'Response 2' }],
          properties: {},
        }),
      ];

      graph.addEvents(events);

      // Get all commits
      const allCommits = graph.getGraph();
      expect(allCommits.commits).toHaveLength(4);

      // Get commits from last user request
      const lastRequestCommits = graph.getGraph(true);
      expect(lastRequestCommits.commits).toHaveLength(2); // Only msg3 and msg4
      expect(lastRequestCommits.commits[0].id).toBe(`${msg3Id}_block_0`);
      expect(lastRequestCommits.commits[1].id).toBe(`${msg4Id}_block_0`);
    });
  });
});
