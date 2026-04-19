/**
 * Engram Context Injector — Automatically injects relevant memories
 * into Claude Code's system prompt at session start.
 */

import { MemoryStore } from '../memory/memoryStore';
import { ClaudeApi } from '../api/claudeApi';
import { TokenBudget } from './tokenBudget';
import { Memory, ContextPayload } from '../memory/memoryTypes';

export class ContextInjector {
  private memoryStore: MemoryStore;
  private claudeApi: ClaudeApi;
  private tokenBudget: TokenBudget;

  constructor(memoryStore: MemoryStore, claudeApi: ClaudeApi, maxTokens: number = 2000) {
    this.memoryStore = memoryStore;
    this.claudeApi = claudeApi;
    this.tokenBudget = new TokenBudget(maxTokens);
  }

  setMaxTokens(max: number): void {
    this.tokenBudget.setMaxTokens(max);
  }

  /**
   * Build the full context payload for session injection.
   */
  async buildContextPayload(): Promise<ContextPayload> {
    const fingerprint = this.memoryStore.getFingerprint();
    const pinnedMemories = this.memoryStore.getPinnedMemories();
    const recentMemories = this.memoryStore.getRecentMemories(20);

    // Remove pinned from recent to avoid duplicates
    const pinnedIds = new Set(pinnedMemories.map(m => m.id));
    const dynamicMemories = recentMemories.filter(m => !pinnedIds.has(m.id));

    const { tokensUsed } = this.tokenBudget.compress(
      pinnedMemories.map(m => this.formatMemory(m)),
      dynamicMemories.map(m => this.formatMemory(m)),
      []
    );

    return {
      projectFingerprint: fingerprint || {
        id: '', rootPath: '', name: 'Unknown', stack: [],
        frameworks: [], languages: [], dbType: null,
        totalFiles: 0, lastIndexed: '', memoryCount: 0,
      },
      pinnedMemories,
      dynamicMemories,
      totalTokens: tokensUsed,
      maxTokens: this.tokenBudget.getMaxTokens(),
    };
  }

  /**
   * Generate the compressed context string ready for injection.
   */
  async generateContextBlock(currentFile?: string): Promise<string> {
    const pinnedMemories = this.memoryStore.getPinnedMemories();
    const recentMemories = this.memoryStore.getRecentMemories(15);
    const fingerprint = this.memoryStore.getFingerprint();

    let relevantMemories: Memory[] = [];

    // If we have a current file context, do semantic search
    if (currentFile) {
      const embedding = await this.claudeApi.generateEmbedding(currentFile);
      relevantMemories = this.memoryStore.semanticSearch(embedding, 10, 0.5);
    }

    // Remove duplicates
    const includedIds = new Set<string>();
    const dedupPinned = pinnedMemories.filter(m => {
      if (includedIds.has(m.id)) return false;
      includedIds.add(m.id);
      return true;
    });
    const dedupRecent = recentMemories.filter(m => {
      if (includedIds.has(m.id)) return false;
      includedIds.add(m.id);
      return true;
    });
    const dedupRelevant = relevantMemories.filter(m => {
      if (includedIds.has(m.id)) return false;
      includedIds.add(m.id);
      return true;
    });

    // Build project header
    const projectHeader = fingerprint
      ? `**Project:** ${fingerprint.name}\n**Stack:** ${fingerprint.stack.join(', ')}\n**Languages:** ${fingerprint.languages.join(', ')}\n`
      : '';

    const pinnedStrings = dedupPinned.map(m => this.formatMemory(m));
    const recentStrings = dedupRecent.map(m => this.formatMemory(m));
    const relevantStrings = dedupRelevant.map(m => this.formatMemory(m));

    const { context, tokensUsed, memoriesIncluded } = this.tokenBudget.compress(
      pinnedStrings,
      recentStrings,
      relevantStrings
    );

    return projectHeader + context + `\n_[Engram: ${memoriesIncluded} memories, ${tokensUsed} tokens]_`;
  }

  /**
   * Preview what would be injected without actually injecting.
   */
  async previewContext(): Promise<{
    context: string;
    tokensUsed: number;
    memoriesIncluded: number;
    pinnedCount: number;
    dynamicCount: number;
  }> {
    const contextBlock = await this.generateContextBlock();
    const payload = await this.buildContextPayload();

    return {
      context: contextBlock,
      tokensUsed: payload.totalTokens,
      memoriesIncluded: payload.pinnedMemories.length + payload.dynamicMemories.length,
      pinnedCount: payload.pinnedMemories.length,
      dynamicCount: payload.dynamicMemories.length,
    };
  }

  private formatMemory(memory: Memory): string {
    const typeIcon: Record<string, string> = {
      bug_fix: '🐛',
      decision: '✅',
      pattern: '🔄',
      warning: '⚠️',
      preference: '💡',
      architecture: '🏗️',
    };
    const icon = typeIcon[memory.type] || '📝';
    const files = memory.fileRefs.length > 0 ? ` [${memory.fileRefs.join(', ')}]` : '';
    return `${icon} **[${memory.type}]** ${memory.content}${files}`;
  }
}
