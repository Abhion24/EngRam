/**
 * Engram Session Recorder — Monitors Claude Code sessions and extracts memories.
 * Watches file changes, computes diffs, and stores high-signal memories.
 */

import * as vscode from 'vscode';
import { MemoryStore } from '../memory/memoryStore';
import { MemoryType } from '../memory/memoryTypes';
import { ClaudeApi } from '../api/claudeApi';
import { DiffAnalyzer } from './diffAnalyzer';
import { v4 as uuidv4 } from 'uuid';

export class SessionRecorder {
  private memoryStore: MemoryStore;
  private claudeApi: ClaudeApi;
  private diffAnalyzer: DiffAnalyzer;
  private currentSessionId: string | null = null;
  private sessionStartTime: Date | null = null;
  private changedFiles: Set<string> = new Set();
  private fileWatcher: vscode.FileSystemWatcher | null = null;
  private isRecording: boolean = false;

  constructor(
    memoryStore: MemoryStore,
    claudeApi: ClaudeApi,
    workspacePath: string
  ) {
    this.memoryStore = memoryStore;
    this.claudeApi = claudeApi;
    this.diffAnalyzer = new DiffAnalyzer(workspacePath);
  }

  /**
   * Start recording a new session.
   */
  startSession(): string {
    this.currentSessionId = uuidv4();
    this.sessionStartTime = new Date();
    this.changedFiles = new Set();
    this.isRecording = true;

    // Watch for file changes
    this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*', false, false, false);
    this.fileWatcher.onDidChange(uri => this.changedFiles.add(uri.fsPath));
    this.fileWatcher.onDidCreate(uri => this.changedFiles.add(uri.fsPath));
    this.fileWatcher.onDidDelete(uri => this.changedFiles.add(uri.fsPath));

    // Create session record
    this.memoryStore.createSession({
      projectId: '',
      startTime: this.sessionStartTime.toISOString(),
      endTime: null,
      filesChanged: [],
      memoriesExtracted: 0,
      contextInjected: [],
      summary: 'Session in progress...',
    });

    console.log(`[Engram] Session started: ${this.currentSessionId}`);
    return this.currentSessionId;
  }

  /**
   * End the current session, analyze changes, and extract memories.
   */
  async endSession(): Promise<{ memoriesExtracted: number }> {
    if (!this.currentSessionId || !this.sessionStartTime) {
      return { memoriesExtracted: 0 };
    }

    this.isRecording = false;

    // Dispose file watcher
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
      this.fileWatcher = null;
    }

    // Get diff
    const diff = this.diffAnalyzer.getRecentDiff();
    const filesChanged = Array.from(this.changedFiles);

    // Extract memories from diff
    let memoriesExtracted = 0;
    if (diff.rawDiff.length > 0) {
      const extractedMemories = await this.claudeApi.extractMemories(
        diff.rawDiff,
        `Files changed: ${diff.filesChanged.join(', ')}`
      );

      for (const mem of extractedMemories) {
        const embedding = await this.claudeApi.generateEmbedding(mem.content);

        // Check for duplicates via semantic similarity
        const similar = this.memoryStore.semanticSearch(embedding, 1, 0.9);
        if (similar.length > 0) continue;

        this.memoryStore.createMemory({
          type: mem.type as MemoryType,
          content: mem.content,
          embedding,
          fileRefs: mem.fileRefs,
          lineRefs: [],
          projectId: '',
          sessionId: this.currentSessionId,
          pinned: false,
          tags: [],
          confidence: mem.confidence,
        });
        memoriesExtracted++;
      }
    }

    // Update session record
    this.memoryStore.updateSession(this.currentSessionId, {
      endTime: new Date().toISOString(),
      filesChanged,
      memoriesExtracted,
      summary: diff.summary,
    });

    console.log(`[Engram] Session ended: ${memoriesExtracted} memories extracted`);

    const sessionId = this.currentSessionId;
    this.currentSessionId = null;
    this.sessionStartTime = null;

    return { memoriesExtracted };
  }

  /**
   * Check if currently recording.
   */
  isActive(): boolean {
    return this.isRecording;
  }

  /**
   * Get current session ID.
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Get files changed in current session.
   */
  getChangedFiles(): string[] {
    return Array.from(this.changedFiles);
  }
}
