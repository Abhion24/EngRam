/**
 * Engram Memory Store — JSON file-backed CRUD for memory entries.
 * Zero native dependencies — pure JS, works everywhere.
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Memory, MemoryType, MemoryFilter, MemoryStats, Session, ProjectFingerprint, EngramExport } from './memoryTypes';
import { VectorStore } from './vectorStore';

interface StoreData {
  memories: Memory[];
  sessions: Session[];
  fingerprint: ProjectFingerprint | null;
}

export class MemoryStore {
  private data: StoreData;
  private vectorStore: VectorStore;
  private projectId: string;
  private filePath: string;

  constructor(storagePath: string, projectId: string) {
    this.filePath = path.join(storagePath, 'engram_memories.json');
    this.vectorStore = new VectorStore(storagePath);
    this.projectId = projectId;
    this.data = { memories: [], sessions: [], fingerprint: null };
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      }
    } catch {
      this.data = { memories: [], sessions: [], fingerprint: null };
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Engram] Failed to save memories:', err);
    }
  }

  // ─── Memory CRUD ───────────────────────────────────────────────

  createMemory(memory: Omit<Memory, 'id' | 'timestamp'>): Memory {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    const newMemory: Memory = { ...memory, id, timestamp, projectId: memory.projectId || this.projectId };

    this.data.memories.push(newMemory);

    if (memory.embedding && memory.embedding.length > 0) {
      this.vectorStore.store(id, memory.embedding, { type: memory.type });
    }

    this.save();
    return newMemory;
  }

  getMemory(id: string): Memory | null {
    return this.data.memories.find(m => m.id === id) || null;
  }

  updateMemory(id: string, updates: Partial<Memory>): boolean {
    const idx = this.data.memories.findIndex(m => m.id === id);
    if (idx === -1) return false;

    this.data.memories[idx] = { ...this.data.memories[idx], ...updates };

    if (updates.embedding && updates.embedding.length > 0) {
      this.vectorStore.store(id, updates.embedding);
    }

    this.save();
    return true;
  }

  deleteMemory(id: string): boolean {
    const before = this.data.memories.length;
    this.data.memories = this.data.memories.filter(m => m.id !== id);
    this.vectorStore.remove(id);
    this.save();
    return this.data.memories.length < before;
  }

  togglePin(id: string): boolean {
    const memory = this.getMemory(id);
    if (!memory) return false;
    return this.updateMemory(id, { pinned: !memory.pinned });
  }

  // ─── Memory Queries ────────────────────────────────────────────

  listMemories(filter?: MemoryFilter): Memory[] {
    let results = this.data.memories.filter(m => m.projectId === this.projectId);

    if (filter?.type) results = results.filter(m => m.type === filter.type);
    if (filter?.pinned !== undefined) results = results.filter(m => m.pinned === filter.pinned);
    if (filter?.minConfidence) results = results.filter(m => m.confidence >= filter.minConfidence!);
    if (filter?.startDate) results = results.filter(m => m.timestamp >= filter.startDate!);
    if (filter?.endDate) results = results.filter(m => m.timestamp <= filter.endDate!);
    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      results = results.filter(m => m.content.toLowerCase().includes(q));
    }
    if (filter?.fileRef) {
      results = results.filter(m => m.fileRefs.some(f => f.includes(filter.fileRef!)));
    }

    return results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  getPinnedMemories(): Memory[] {
    return this.listMemories({ pinned: true });
  }

  getRecentMemories(limit: number = 20): Memory[] {
    return this.listMemories().slice(0, limit);
  }

  semanticSearch(queryEmbedding: number[], topK: number = 15, threshold: number = 0.6): Memory[] {
    const results = this.vectorStore.search(queryEmbedding, topK, threshold);
    const memories: Memory[] = [];
    for (const result of results) {
      const memory = this.getMemory(result.id);
      if (memory && memory.projectId === this.projectId) {
        memories.push(memory);
      }
    }
    return memories;
  }

  // ─── Session Management ────────────────────────────────────────

  createSession(session: Omit<Session, 'id'>): Session {
    const id = uuidv4();
    const newSession: Session = { ...session, id, projectId: session.projectId || this.projectId };
    this.data.sessions.push(newSession);
    this.save();
    return newSession;
  }

  getSession(id: string): Session | null {
    return this.data.sessions.find(s => s.id === id) || null;
  }

  listSessions(): Session[] {
    return this.data.sessions
      .filter(s => s.projectId === this.projectId)
      .sort((a, b) => b.startTime.localeCompare(a.startTime));
  }

  updateSession(id: string, updates: Partial<Session>): boolean {
    const idx = this.data.sessions.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.data.sessions[idx] = { ...this.data.sessions[idx], ...updates };
    this.save();
    return true;
  }

  // ─── Project Fingerprint ───────────────────────────────────────

  saveFingerprint(fp: ProjectFingerprint): void {
    this.data.fingerprint = fp;
    this.save();
  }

  getFingerprint(): ProjectFingerprint | null {
    return this.data.fingerprint;
  }

  // ─── Statistics ────────────────────────────────────────────────

  getStats(): MemoryStats {
    const memories = this.listMemories();
    const sessions = this.listSessions();

    const byType: Record<MemoryType, number> = {
      [MemoryType.BUG_FIX]: 0, [MemoryType.DECISION]: 0,
      [MemoryType.PATTERN]: 0, [MemoryType.WARNING]: 0,
      [MemoryType.PREFERENCE]: 0, [MemoryType.ARCHITECTURE]: 0,
    };

    const fileCounts: Record<string, number> = {};
    let totalConfidence = 0;
    let pinnedCount = 0;

    for (const m of memories) {
      byType[m.type] = (byType[m.type] || 0) + 1;
      totalConfidence += m.confidence;
      if (m.pinned) pinnedCount++;
      for (const f of m.fileRefs) {
        fileCounts[f] = (fileCounts[f] || 0) + 1;
      }
    }

    const topFiles = Object.entries(fileCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, count]) => ({ file, count }));

    const avgConfidence = memories.length > 0 ? totalConfidence / memories.length : 0;
    const healthScore = Math.min(100, Math.round((memories.length / 50) * 60 + avgConfidence * 40));

    return {
      totalMemories: memories.length,
      pinnedCount,
      byType,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      recentSessionCount: sessions.filter(s => {
        const d = new Date(s.startTime);
        return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
      }).length,
      topFiles,
      healthScore,
    };
  }

  // ─── Export / Import ───────────────────────────────────────────

  exportAll(): EngramExport {
    const fingerprint = this.getFingerprint();
    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      projectId: this.projectId,
      projectName: fingerprint?.name || 'Unknown',
      fingerprint: fingerprint || {
        id: this.projectId, rootPath: '', name: 'Unknown', stack: [],
        frameworks: [], languages: [], dbType: null, totalFiles: 0,
        lastIndexed: '', memoryCount: 0,
      },
      memories: this.listMemories(),
      sessions: this.listSessions(),
    };
  }

  importAll(data: EngramExport): { memoriesImported: number; sessionsImported: number } {
    let memoriesImported = 0;
    let sessionsImported = 0;

    for (const m of data.memories) {
      if (!this.getMemory(m.id)) {
        this.data.memories.push({ ...m, projectId: this.projectId });
        if (m.embedding?.length > 0) this.vectorStore.store(m.id, m.embedding);
        memoriesImported++;
      }
    }

    for (const s of data.sessions) {
      if (!this.getSession(s.id)) {
        this.data.sessions.push({ ...s, projectId: this.projectId });
        sessionsImported++;
      }
    }

    if (data.fingerprint) {
      this.saveFingerprint({ ...data.fingerprint, id: this.projectId });
    }

    this.save();
    return { memoriesImported, sessionsImported };
  }

  clearAll(): void {
    this.data.memories = this.data.memories.filter(m => m.projectId !== this.projectId);
    this.data.sessions = this.data.sessions.filter(s => s.projectId !== this.projectId);
    this.data.fingerprint = null;
    this.vectorStore.clear();
    this.save();
  }

  close(): void {
    this.save();
    this.vectorStore.close();
  }
}
