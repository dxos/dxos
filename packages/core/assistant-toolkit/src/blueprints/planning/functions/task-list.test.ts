//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from 'vitest';

import { MarkdownTasks, type TaskOperation } from './task-list';

describe('MarkdownTasks', () => {
  it('should initialize with content', () => {
    const content = '- [ ] Task 1\n- [x] Task 2';
    const manager = new MarkdownTasks(content);
    expect(manager.getRawContent()).toBe(content);
  });

  it('should provide numbered content', () => {
    const manager = new MarkdownTasks('- [ ] Task 1\n  - [ ] Subtask');
    const numbered = manager.getNumberedContent();
    expect(numbered).toBe('  1→- [ ] Task 1\n  2→  - [ ] Subtask');
  });

  it('should insert tasks with indentation', () => {
    const manager = new MarkdownTasks('- [ ] Main task');
    manager.insertTask(2, 'Subtask', false, 2);
    expect(manager.getRawContent()).toBe('- [ ] Main task\n  - [ ] Subtask');
  });

  it('should insert completed tasks', () => {
    const manager = new MarkdownTasks('- [ ] Task 1');
    manager.insertTask(2, 'Completed task', true, 0);
    expect(manager.getRawContent()).toBe('- [ ] Task 1\n- [x] Completed task');
  });

  it('should delete tasks', () => {
    const manager = new MarkdownTasks('- [ ] Task 1\n- [ ] Task 2');
    const success = manager.deleteTask(2);
    expect(success).toBe(true);
    expect(manager.getRawContent()).toBe('- [ ] Task 1');
  });

  it('should update task text', () => {
    const manager = new MarkdownTasks('- [ ] Old task');
    const success = manager.updateTaskText(1, 'New task description');
    expect(success).toBe(true);
    expect(manager.getRawContent()).toBe('- [ ] New task description');
  });

  it('should toggle task completion', () => {
    const manager = new MarkdownTasks('- [ ] Task 1\n- [x] Task 2');

    // Complete first task
    manager.toggleTaskCompletion(1, true);
    expect(manager.getRawContent()).toBe('- [x] Task 1\n- [x] Task 2');

    // Uncomplete second task
    manager.toggleTaskCompletion(2, false);
    expect(manager.getRawContent()).toBe('- [x] Task 1\n- [ ] Task 2');
  });

  it('should change task indentation', () => {
    const manager = new MarkdownTasks('- [ ] Task 1');
    const success = manager.setTaskIndent(1, 4);
    expect(success).toBe(true);
    expect(manager.getRawContent()).toBe('    - [ ] Task 1');
  });

  it('should apply multiple operations', () => {
    const manager = new MarkdownTasks('- [ ] Task 1');

    const operations: TaskOperation[] = [
      { type: 'insertTask', lineNumber: 2, text: 'New task', indent: 2 },
      { type: 'toggleTaskCompletion', lineNumber: 1, completed: true },
      { type: 'insertTask', lineNumber: 3, text: 'Another task', indent: 0 },
    ];

    manager.applyOperations(operations);
    const result = manager.getRawContent();
    expect(result).toBe('- [x] Task 1\n  - [ ] New task\n- [ ] Another task');
  });

  it('should handle hierarchical task structure', () => {
    const manager = new MarkdownTasks();

    // Build a hierarchical structure
    manager.insertTask(1, 'Main task', false, 0);
    manager.insertTask(2, 'Subtask 1', false, 2);
    manager.insertTask(3, 'Sub-subtask', false, 4);
    manager.insertTask(4, 'Subtask 2', false, 2);

    const expected = '- [ ] Main task\n  - [ ] Subtask 1\n    - [ ] Sub-subtask\n  - [ ] Subtask 2';
    expect(manager.getRawContent()).toBe(expected);
  });

  it('should handle line insertions at the end', () => {
    const manager = new MarkdownTasks('- [ ] Task 1');
    manager.insertTask(999, 'End task', false, 0);
    expect(manager.getRawContent()).toBe('- [ ] Task 1\n- [ ] End task');
  });
});
