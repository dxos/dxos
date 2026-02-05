//
// Copyright 2025 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { ObjectId } from '@dxos/keys';

import { type KanbanModel, UNCATEGORIZED_VALUE } from './model';
import { type TaskItem, createKanbanModel, createTaskItem } from './testing';

// Use deterministic IDs for tests.
ObjectId.dangerouslyDisableRandomness();

describe('KanbanModel', () => {
  let registry: Registry.Registry;
  let model: KanbanModel<TaskItem>;

  beforeEach(async () => {
    registry = Registry.make();
    model = createKanbanModel(registry);
    await model.open();
  });

  afterEach(async () => {
    await model.close();
  });

  describe('basic operations', () => {
    test('should set items and compute arrangement', () => {
      const task1 = createTaskItem('Task 1', 'todo');
      const task2 = createTaskItem('Task 2', 'in-progress');
      const task3 = createTaskItem('Task 3', 'done');
      const items: TaskItem[] = [task1, task2, task3];

      model.setItems(items);

      const cards = model.getCards();
      expect(cards).toHaveLength(4); // uncategorized + 3 status columns

      const todoColumn = cards.find((c) => c.columnValue === 'todo');
      const inProgressColumn = cards.find((c) => c.columnValue === 'in-progress');
      const doneColumn = cards.find((c) => c.columnValue === 'done');

      expect(todoColumn?.cards).toHaveLength(1);
      expect(todoColumn?.cards[0].id).toBe(task1.id);
      expect(inProgressColumn?.cards).toHaveLength(1);
      expect(inProgressColumn?.cards[0].id).toBe(task2.id);
      expect(doneColumn?.cards).toHaveLength(1);
      expect(doneColumn?.cards[0].id).toBe(task3.id);
    });

    test('should place items without status in uncategorized', () => {
      const task1 = createTaskItem('Task 1');
      const task2 = createTaskItem('Task 2', 'todo');
      const items: TaskItem[] = [task1, task2];

      model.setItems(items);

      const cards = model.getCards();
      const uncategorized = cards.find((c) => c.columnValue === UNCATEGORIZED_VALUE);
      const todoColumn = cards.find((c) => c.columnValue === 'todo');

      expect(uncategorized?.cards).toHaveLength(1);
      expect(uncategorized?.cards[0].id).toBe(task1.id);
      expect(todoColumn?.cards).toHaveLength(1);
      expect(todoColumn?.cards[0].id).toBe(task2.id);
    });
  });

  describe('reactivity', () => {
    test('should notify subscribers when items change', () => {
      const task1 = createTaskItem('Task 1', 'todo');
      const task2 = createTaskItem('Task 2', 'in-progress');
      const task3 = createTaskItem('Task 3', 'done');
      const items: TaskItem[] = [task1, task2];

      // Set initial items first.
      model.setItems(items);

      // Subscribe after initial state is set.
      let notificationCount = 0;
      const unsubscribe = registry.subscribe(model.cards, () => {
        notificationCount++;
      });
      onTestFinished(() => unsubscribe());

      // Record the initial count (registry may fire immediately on subscribe).
      const initialCount = notificationCount;

      // This should trigger one notification.
      model.setItems([...items, task3]);
      expect(notificationCount - initialCount).toBe(1);

      // Another setItems should trigger another notification.
      model.setItems(items);
      expect(notificationCount - initialCount).toBe(2);
    });

    test('should update cards atom when rearranging', () => {
      const task1 = createTaskItem('Task 1', 'todo');
      const task2 = createTaskItem('Task 2', 'todo');
      const task3 = createTaskItem('Task 3', 'in-progress');
      const items: TaskItem[] = [task1, task2, task3];
      model.setItems(items);

      // Verify initial state.
      let cards = model.getCards();
      const todoColumn = cards.find((c) => c.columnValue === 'todo');
      expect(todoColumn?.cards.map((c) => c.id)).toEqual([task1.id, task2.id]);

      let notificationCount = 0;
      const unsubscribe = registry.subscribe(model.cards, () => {
        notificationCount++;
      });
      onTestFinished(() => unsubscribe());

      // Rearrange: move task2 above task1 within todo column.
      model.handleRearrange({ id: task2.id, type: 'card' }, { id: task1.id, type: 'card' }, 'top');

      // Should have notified.
      expect(notificationCount).toBe(1);

      // Verify the arrangement changed.
      cards = model.getCards();
      const updatedTodoColumn = cards.find((c) => c.columnValue === 'todo');
      expect(updatedTodoColumn?.cards.map((c) => c.id)).toEqual([task2.id, task1.id]);
    });

    test('should move card between columns', () => {
      const task1 = createTaskItem('Task 1', 'todo');
      const task2 = createTaskItem('Task 2', 'in-progress');
      const items: TaskItem[] = [task1, task2];
      model.setItems(items);

      // Verify initial state.
      let cards = model.getCards();
      expect(cards.find((c) => c.columnValue === 'todo')?.cards).toHaveLength(1);
      expect(cards.find((c) => c.columnValue === 'in-progress')?.cards).toHaveLength(1);

      // Move task1 from todo to in-progress column.
      model.handleRearrange({ id: task1.id, type: 'card' }, { id: 'in-progress', type: 'column' }, 'top');

      // Verify the card moved.
      cards = model.getCards();
      expect(cards.find((c) => c.columnValue === 'todo')?.cards).toHaveLength(0);
      expect(cards.find((c) => c.columnValue === 'in-progress')?.cards).toHaveLength(2);

      // Verify the item's status field was updated.
      expect(task1.status).toBe('in-progress');
    });

    test('should persist arrangement in kanban object', () => {
      const task1 = createTaskItem('Task 1', 'todo');
      const task2 = createTaskItem('Task 2', 'todo');
      const items: TaskItem[] = [task1, task2];
      model.setItems(items);

      // Rearrange cards.
      model.handleRearrange({ id: task2.id, type: 'card' }, { id: task1.id, type: 'card' }, 'top');

      // Verify the arrangement was persisted to the kanban object.
      const todoArrangement = model.object.arrangement.find((a) => a.columnValue === 'todo');
      expect(todoArrangement?.ids).toEqual([task2.id, task1.id]);
    });
  });

  describe('atom reference equality', () => {
    test('cards atom should have new reference after rearrange', () => {
      const task1 = createTaskItem('Task 1', 'todo');
      const task2 = createTaskItem('Task 2', 'todo');
      const items: TaskItem[] = [task1, task2];
      model.setItems(items);

      const cardsBefore = model.getCards();
      model.handleRearrange({ id: task2.id, type: 'card' }, { id: task1.id, type: 'card' }, 'top');
      const cardsAfter = model.getCards();

      // The arrays should be different references for reactivity to work.
      expect(cardsBefore).not.toBe(cardsAfter);
    });
  });
});
