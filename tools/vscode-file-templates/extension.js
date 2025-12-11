//
// Copyright 2025 DXOS.org
//
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

async function activate(context) {
  const command = vscode.commands.registerCommand('fileTemplates.newFromTemplate', async (uri) => {
    // Load templates.
    const templatesDir = path.join(context.extensionPath, 'templates');
    const templates = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.tpl'));
    if (templates.length === 0) {
      vscode.window.showErrorMessage('No templates found in templates/ directory.');
      return;
    }

    // Select template.
    const chosen = await vscode.window.showQuickPick(templates, {
      placeHolder: 'Select a template',
    });
    if (!chosen) {
      return;
    }

    // Enter name.
    const name = await vscode.window.showInputBox({
      prompt: 'Enter name',
    });
    if (!name) {
      return;
    }

    // Load template file content and replace ${name}.
    const templatePath = path.join(templatesDir, chosen);
    const template = fs.readFileSync(templatePath, 'utf8');
    const content = template.replace(/\$\{name\}/g, name);

    // Strip .tpl → "Component.stories.tsx"
    const basename = path.basename(chosen);
    const templateBase = basename.replace(/\.tpl$/, '');
    const outputFilename = templateBase.replace(/^[^.]+/, name);

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const active = vscode.window.activeTextEditor;

    let baseDir;
    if (uri && uri.fsPath) {
      const stat = fs.statSync(uri.fsPath);
      // If user clicked a folder → use it.
      // If user clicked a file → use its parent.
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

    // Full output path.
    const outFile = path.join(baseDir, outputFilename);

    // Write file.
    fs.writeFileSync(outFile, content, 'utf8');

    // Open generated file in editor.
    const doc = await vscode.workspace.openTextDocument(outFile);
    vscode.window.showTextDocument(doc);
    vscode.window.showInformationMessage(`Created: ${outFile}`);
  });

  context.subscriptions.push(command);
}

function deactivate() {}

module.exports = { activate, deactivate };
