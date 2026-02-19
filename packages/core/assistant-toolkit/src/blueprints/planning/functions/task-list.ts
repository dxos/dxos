//
// Copyright 2025 DXOS.org
//

/**
 * Hierarchical Task List Manager.
 *
 * A framework for managing hierarchical task lists where each line is a task.
 * Designed to work with language model agents that receive documents with line numbers.
 */
export class MarkdownTasks {
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
