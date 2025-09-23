//
// Copyright 2025 DXOS.org
//

import * as vscode from 'vscode';

// Placeholder for extension.

/**
 * Activates the extension.
 */
export function activate(context: vscode.ExtensionContext) {
  // Register the hello world command.
  const helloCommand = vscode.commands.registerCommand('dxos.helloWorld', () => {
    vscode.window.showInformationMessage('Hello World from DXOS!');
  });

  // Register the file info command.
  const fileInfoCommand = vscode.commands.registerCommand('dxos.showFileInfo', (uri: vscode.Uri) => {
    if (uri) {
      const fileName = uri.path.split('/').pop() || 'Unknown';
      const filePath = uri.fsPath;
      const workspace = vscode.workspace.getWorkspaceFolder(uri);
      const workspaceName = workspace ? workspace.name : 'No workspace';

      vscode.window.showInformationMessage(
        `DXOS File Info:\n` + `Name: ${fileName}\n` + `Path: ${filePath}\n` + `Workspace: ${workspaceName}`,
      );
    } else {
      vscode.window.showWarningMessage('No file selected.');
    }
  });

  context.subscriptions.push(helloCommand, fileInfoCommand);
}

/**
 * Deactivates the extension.
 */
export function deactivate() {
  console.log('DXOS VSCode Extension is now deactivated.');
}
