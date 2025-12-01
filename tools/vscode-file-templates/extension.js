//
// Copyright 2025 DXOS.org
//
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

async function activate(context) {
  const command = vscode.commands.registerCommand('fileTemplates.newFromTemplate', async (uri) => {
    const templatesDir = path.join(context.extensionPath, 'templates');

    // Load template files ending in .tpl
    const templates = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.tpl'));

    if (templates.length === 0) {
      vscode.window.showErrorMessage('No templates found in templates/ directory.');
      return;
    }

    // Prompt user to pick a template
    const chosen = await vscode.window.showQuickPick(templates, {
      placeHolder: 'Select a template',
    });
    if (!chosen) return;

    // Ask for name variable
    const name = await vscode.window.showInputBox({
      prompt: 'Enter name',
    });
    if (!name) return;

    // Load template file content
    const templatePath = path.join(templatesDir, chosen);
    const content = fs.readFileSync(templatePath, 'utf8');

    // Replace ${name}
    const finalContent = content.replace(/\$\{name\}/g, name);

    // Example:
    // "Component.stories.tsx.tpl" → basename → "Component.stories.tsx.tpl"
    const basename = path.basename(chosen);

    // Strip .tpl → "Component.stories.tsx"
    const templateBase = basename.replace(/\.tpl$/, '');

    // Replace everything before the first "." → "MyButton.stories.tsx"
    const outputFilename = templateBase.replace(/^[^.]+/, name);

    // ----------------------------
    // Directory resolution
    // Priority:
    // 1) Explorer clicked folder (uri)
    // 2) Active editor dir
    // 3) Workspace root
    // ----------------------------

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    const active = vscode.window.activeTextEditor;
    let baseDir;

    if (uri && uri.fsPath) {
      const stat = fs.statSync(uri.fsPath);
      // If user clicked a folder → use it
      // If user clicked a file → use its parent
      baseDir = stat.isDirectory() ? uri.fsPath : path.dirname(uri.fsPath);
    } else if (active) {
      baseDir = path.dirname(active.document.uri.fsPath);
    } else {
      baseDir = workspaceFolder;
    }

    if (!baseDir) {
      vscode.window.showErrorMessage('Cannot determine output directory.');
      return;
    }

    // Full output path
    const outFile = path.join(baseDir, outputFilename);

    // Write file
    fs.writeFileSync(outFile, finalContent, 'utf8');

    // Open generated file in editor
    const doc = await vscode.workspace.openTextDocument(outFile);
    vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(`Created: ${outFile}`);
  });

  context.subscriptions.push(command);
}

function deactivate() {}

module.exports = { activate, deactivate };
