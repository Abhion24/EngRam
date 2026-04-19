/**
 * Engram — VS Code Extension Entry Point
 * Persistent Memory Layer for Claude Code
 * 
 * Activates on workspace open, starts the memory system,
 * and launches the dashboard server.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import { MemoryStore } from './memory/memoryStore';
import { ClaudeApi } from './api/claudeApi';
import { ContextInjector } from './context/contextInjector';
import { SessionRecorder } from './session/sessionRecorder';
import { CodebaseIndexer } from './indexer/codebaseIndexer';
import { DashboardServer } from './server/dashboardServer';

let memoryStore: MemoryStore;
let claudeApi: ClaudeApi;
let contextInjector: ContextInjector;
let sessionRecorder: SessionRecorder;
let codebaseIndexer: CodebaseIndexer;
let dashboardServer: DashboardServer;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
  console.log('[Engram] Extension activating...');

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    console.log('[Engram] No workspace folder found. Extension inactive.');
    return;
  }

  try {
    const workspacePath = workspaceFolder.uri.fsPath;
    const config = vscode.workspace.getConfiguration('engram');

    // Generate a stable project ID from workspace path
    const projectId = crypto.createHash('md5').update(workspacePath).digest('hex');

    // Storage path for Engram data — use fs.mkdirSync for reliability
    const storagePath = path.join(context.globalStorageUri.fsPath, projectId);
    const fs = require('fs');
    fs.mkdirSync(storagePath, { recursive: true });

    // Initialize core services
    const apiKey = config.get<string>('claudeApiKey', '');
    claudeApi = new ClaudeApi(apiKey);

    memoryStore = new MemoryStore(storagePath, projectId);
    contextInjector = new ContextInjector(
      memoryStore,
      claudeApi,
      config.get<number>('tokenBudget', 2000)
    );
    sessionRecorder = new SessionRecorder(memoryStore, claudeApi, workspacePath);
    codebaseIndexer = new CodebaseIndexer(workspacePath, memoryStore, claudeApi, projectId);

    // Start dashboard server
    const port = config.get<number>('dashboardPort', 6173);
    dashboardServer = new DashboardServer(memoryStore, contextInjector, claudeApi, port);

    try {
      await dashboardServer.start();
      vscode.window.showInformationMessage(
        `⚡ Engram activated! Dashboard: http://localhost:${dashboardServer.getPort()}`
      );
    } catch (err) {
      console.error('[Engram] Failed to start dashboard:', err);
      vscode.window.showWarningMessage('Engram: Dashboard server failed to start. Extension features still available.');
    }

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '$(brain) Engram';
  statusBarItem.tooltip = 'Engram Memory OS — Click to open dashboard';
  statusBarItem.command = 'engram.openDashboard';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Update status bar with memory count
  const updateStatusBar = () => {
    const stats = memoryStore.getStats();
    statusBarItem.text = `$(brain) Engram: ${stats.totalMemories} memories`;
  };

  // ─── Register Commands ─────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('engram.openDashboard', () => {
      const url = `http://localhost:${dashboardServer.getPort()}`;
      vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('engram.indexCodebase', async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Engram: Indexing Codebase',
          cancellable: false,
        },
        async (progress) => {
          await codebaseIndexer.indexCodebase((msg) => {
            progress.report({ message: msg });
          });
          updateStatusBar();
          vscode.window.showInformationMessage('⚡ Engram: Codebase indexed successfully!');
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('engram.showMemoryCount', () => {
      const stats = memoryStore.getStats();
      vscode.window.showInformationMessage(
        `⚡ Engram: ${stats.totalMemories} memories | ${stats.pinnedCount} pinned | Health: ${stats.healthScore}%`
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('engram.exportMemories', async () => {
      const data = memoryStore.exportAll();
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(workspacePath, `${path.basename(workspacePath)}.engram`)),
        filters: { 'Engram Files': ['engram'] },
      });
      if (uri) {
        const content = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
        await vscode.workspace.fs.writeFile(uri, content);
        vscode.window.showInformationMessage(`⚡ Engram: Exported ${data.memories.length} memories`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('engram.importMemories', async () => {
      const uris = await vscode.window.showOpenDialog({
        filters: { 'Engram Files': ['engram', 'json'] },
        canSelectMany: false,
      });
      if (uris && uris[0]) {
        const content = await vscode.workspace.fs.readFile(uris[0]);
        const data = JSON.parse(Buffer.from(content).toString('utf-8'));
        const result = memoryStore.importAll(data);
        updateStatusBar();
        vscode.window.showInformationMessage(
          `⚡ Engram: Imported ${result.memoriesImported} memories, ${result.sessionsImported} sessions`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('engram.clearAllMemories', async () => {
      const answer = await vscode.window.showWarningMessage(
        'Are you sure you want to clear ALL Engram memories for this project?',
        { modal: true },
        'Yes, Clear All'
      );
      if (answer === 'Yes, Clear All') {
        memoryStore.clearAll();
        updateStatusBar();
        vscode.window.showInformationMessage('⚡ Engram: All memories cleared.');
      }
    })
  );

  // ─── Auto-Index on first activation ────────────────────────

  if (config.get<boolean>('autoIndex', true)) {
    const fingerprint = memoryStore.getFingerprint();
    if (!fingerprint) {
      // First time — index the codebase
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Engram: First-time codebase indexing',
          cancellable: false,
        },
        async (progress) => {
          await codebaseIndexer.indexCodebase((msg) => {
            progress.report({ message: msg });
          });
          updateStatusBar();
        }
      );
    }
  }

  // ─── Session Recording ─────────────────────────────────────

  if (config.get<boolean>('enableSessionRecording', true)) {
    // Start a session when a terminal is opened (proxy for Claude Code session)
    context.subscriptions.push(
      vscode.window.onDidOpenTerminal(() => {
        if (!sessionRecorder.isActive()) {
          sessionRecorder.startSession();
          statusBarItem.text = `$(brain) Engram: Recording...`;
        }
      })
    );

    // End session periodically or when terminal closes
    context.subscriptions.push(
      vscode.window.onDidCloseTerminal(async () => {
        if (sessionRecorder.isActive()) {
          const result = await sessionRecorder.endSession();
          updateStatusBar();
          if (result.memoriesExtracted > 0) {
            vscode.window.showInformationMessage(
              `⚡ Engram: ${result.memoriesExtracted} new memories extracted from session`
            );
          }
        }
      })
    );
  }

  // ─── Configuration change listener ─────────────────────────

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('engram.claudeApiKey')) {
        const newKey = vscode.workspace.getConfiguration('engram').get<string>('claudeApiKey', '');
        claudeApi.setApiKey(newKey);
      }
      if (e.affectsConfiguration('engram.tokenBudget')) {
        const newBudget = vscode.workspace.getConfiguration('engram').get<number>('tokenBudget', 2000);
        contextInjector.setMaxTokens(newBudget);
      }
    })
  );

  // Initial status bar update
  updateStatusBar();
  console.log('[Engram] Extension activated successfully.');

  } catch (err: any) {
    console.error('[Engram] Extension activation failed:', err);
    vscode.window.showErrorMessage(`Engram failed to activate: ${err?.message || err}`);
  }
}

export function deactivate() {
  console.log('[Engram] Extension deactivating...');
  if (dashboardServer) dashboardServer.stop();
  if (memoryStore) memoryStore.close();
  if (statusBarItem) statusBarItem.dispose();
}
