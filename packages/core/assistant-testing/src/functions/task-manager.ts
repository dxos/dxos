//
// Copyright 2025 DXOS.org
//

/**
 * Hierarchical Task List Manager.
 *
 * A framework for managing hierarchical task lists where each line is a task.
 * Designed to work with language model agents that receive documents with line numbers.
 */
export class MarkdownTaskManager {
  private _lineEndings: string;
  private _content: string[];

  constructor(initialContent: string = '') {
    // Detect line endings.
    this._lineEndings = initialContent.includes('\r\n') ? '\r\n' : '\n';
    this._content = initialContent ? initialContent.split(this._lineEndings) : [];
  }

  /**
   * Get the current document content with line numbers prefixed.
   */
  getNumberedContent(): string {
    return this._content
      .map((line, index) => `${(index + 1).toString().padStart(3, ' ')}→${line}`)
      .join(this._lineEndings);
  }

  /**
   * Get the raw document content without line numbers.
   */
  getRawContent(): string {
    return this._content.join(this._lineEndings);
  }

  /**
   * Insert a new task at the specified line number (1-based).
   * Indentation level determines hierarchy (0, 2, 4, 6 spaces etc.)
   */
  insertTask(lineNumber: number, taskText: string, completed: boolean = false, indent: number = 0): void {
    const indentStr = ' '.repeat(indent);
    const taskLine = completed ? `${indentStr}- [x] ${taskText}` : `${indentStr}- [ ] ${taskText}`;
    const insertIndex = Math.max(0, Math.min(lineNumber - 1, this._content.length));
    this._content.splice(insertIndex, 0, taskLine);
  }

  /**
   * Delete a task at the specified line number (1-based).
   */
  deleteTask(lineNumber: number): boolean {
    if (lineNumber < 1 || lineNumber > this._content.length) {
      return false;
    }
    this._content.splice(lineNumber - 1, 1);
    return true;
  }

  /**
   * Update the text of a task at the specified line number (1-based).
   */
  updateTaskText(lineNumber: number, newText: string): boolean {
    if (lineNumber < 1 || lineNumber > this._content.length) {
      return false;
    }

    const currentLine = this._content[lineNumber - 1];
    const taskMatch = currentLine.match(/^(\s*- \[[x ]\] )(.*)$/);

    if (taskMatch) {
      this._content[lineNumber - 1] = `${taskMatch[1]}${newText}`;
      return true;
    }
    return false;
  }

  /**
   * Mark a task as complete or incomplete at the specified line number (1-based).
   */
  toggleTaskCompletion(lineNumber: number, completed?: boolean): boolean {
    if (lineNumber < 1 || lineNumber > this._content.length) {
      return false;
    }

    const currentLine = this._content[lineNumber - 1];
    const taskMatch = currentLine.match(/^(\s*- \[)([x ])(.*)$/);

    if (taskMatch) {
      const isCurrentlyComplete = taskMatch[2] === 'x';
      const newStatus = completed !== undefined ? completed : !isCurrentlyComplete;
      const statusChar = newStatus ? 'x' : ' ';
      this._content[lineNumber - 1] = `${taskMatch[1]}${statusChar}${taskMatch[3]}`;
      return true;
    }
    return false;
  }

  /**
   * Change the indentation level of a task (for hierarchy).
   */
  setTaskIndent(lineNumber: number, indent: number): boolean {
    if (lineNumber < 1 || lineNumber > this._content.length) {
      return false;
    }

    const currentLine = this._content[lineNumber - 1];
    const taskMatch = currentLine.match(/^\s*- (\[[x ]\] .*)$/);

    if (taskMatch) {
      const indentStr = ' '.repeat(indent);
      this._content[lineNumber - 1] = `${indentStr}- ${taskMatch[1]}`;
      return true;
    }
    return false;
  }

  /**
   * Get the total number of lines in the document.
   */
  getLineCount(): number {
    return this._content.length;
  }

  /**
   * Apply multiple operations atomically.
   */
  applyOperations(operations: TaskOperation[]): void {
    // Sort operations by line number in descending order to avoid index shifts.
    const sortedOps = [...operations].sort((a, b) => {
      const aLine = 'lineNumber' in a ? a.lineNumber : 0;
      const bLine = 'lineNumber' in b ? b.lineNumber : 0;
      return bLine - aLine;
    });

    for (const op of sortedOps) {
      switch (op.type) {
        case 'insertTask':
          this.insertTask(op.lineNumber, op.text, op.completed, op.indent);
          break;
        case 'deleteTask':
          this.deleteTask(op.lineNumber);
          break;
        case 'updateTaskText':
          this.updateTaskText(op.lineNumber, op.text);
          break;
        case 'toggleTaskCompletion':
          this.toggleTaskCompletion(op.lineNumber, op.completed);
          break;
        case 'setTaskIndent':
          this.setTaskIndent(op.lineNumber, op.indent);
          break;
      }
    }
  }
}

/**
 * Operation types for batch task updates.
 */
export type TaskOperation =
  | { type: 'insertTask'; lineNumber: number; text: string; completed?: boolean; indent?: number }
  | { type: 'deleteTask'; lineNumber: number }
  | { type: 'updateTaskText'; lineNumber: number; text: string }
  | { type: 'toggleTaskCompletion'; lineNumber: number; completed?: boolean }
  | { type: 'setTaskIndent'; lineNumber: number; indent: number };

/**
 * Agent prompt instructions for managing hierarchical task lists.
 */
export const HIERARCHICAL_TASK_AGENT_INSTRUCTIONS = `
You are a task management agent that maintains hierarchical task lists where each line is a task.

## Document Format
You will receive task lists with line numbers prefixed like:
\`\`\`
  1→- [ ] Main project task
  2→  - [ ] Subtask 1: Research phase
  3→    - [x] Literature review
  4→    - [ ] Stakeholder interviews
  5→  - [ ] Subtask 2: Implementation
  6→    - [ ] Setup infrastructure
  7→    - [ ] Write core functionality
  8→- [ ] Another main task
\`\`\`

## Task Hierarchy
- 0 spaces: Top-level tasks
- 2 spaces: First-level subtasks
- 4 spaces: Second-level subtasks
- 6 spaces: Third-level subtasks (and so on)

## Available Operations
You can modify the task list using these operations:

1. **insertTask(lineNumber, text, completed?, indent?)** - Insert a new task
2. **deleteTask(lineNumber)** - Delete a task
3. **updateTaskText(lineNumber, text)** - Change task description
4. **toggleTaskCompletion(lineNumber, completed?)** - Mark task complete/incomplete
5. **setTaskIndent(lineNumber, indent)** - Change task hierarchy level

## Examples

### Example 1: Adding a subtask
**User:** "Add a subtask 'Code review' under the task on line 1"
**Response:** \`insertTask(2, "Code review", false, 2)\`

### Example 2: Marking a task complete
**User:** "Mark the task on line 3 as complete"
**Response:** \`toggleTaskCompletion(3, true)\`

### Example 3: Updating task text
**User:** "Change the task on line 5 to 'Backend implementation'"
**Response:** \`updateTaskText(5, "Backend implementation")\`

### Example 4: Creating a task hierarchy
**User:** "Add a main task 'Testing phase' with two subtasks"
**Response:**
\`\`\`
insertTask(999, "Testing phase", false, 0)
insertTask(999, "Unit tests", false, 2)
insertTask(999, "Integration tests", false, 2)
\`\`\`

### Example 5: Reorganizing hierarchy
**User:** "Move the task on line 4 to be a main task (top level)"
**Response:** \`setTaskIndent(4, 0)\`

### Example 6: Adding nested subtasks
**User:** "Add a sub-subtask 'Write test cases' under line 6"
**Response:** \`insertTask(7, "Write test cases", false, 4)\`

## Guidelines
- Always reference line numbers from the numbered document you receive
- Use line number 999 to append to the end of the document
- Maintain logical hierarchy (subtasks should be indented under their parent)
- Use appropriate indentation levels (0, 2, 4, 6, etc. spaces)
- When creating subtasks, consider the parent task's completion status
- Be precise with task descriptions and hierarchy levels
`;
