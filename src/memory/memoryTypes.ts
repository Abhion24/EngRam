/**
 * Engram Memory Types — Core type definitions for the memory system.
 */

export enum MemoryType {
  BUG_FIX = 'bug_fix',
  DECISION = 'decision',
  PATTERN = 'pattern',
  WARNING = 'warning',
  PREFERENCE = 'preference',
  ARCHITECTURE = 'architecture',
}

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  embedding: number[];
  fileRefs: string[];
  lineRefs: number[];
  projectId: string;
  sessionId: string;
  timestamp: string;
  pinned: boolean;
  tags: string[];
  confidence: number;
}

export interface Session {
  id: string;
  projectId: string;
  startTime: string;
  endTime: string | null;
  filesChanged: string[];
  memoriesExtracted: number;
  contextInjected: string[];
  summary: string;
}

export interface ProjectFingerprint {
  id: string;
  rootPath: string;
  name: string;
  stack: string[];
  frameworks: string[];
  languages: string[];
  dbType: string | null;
  totalFiles: number;
  lastIndexed: string;
  memoryCount: number;
}

export interface ContextPayload {
  projectFingerprint: ProjectFingerprint;
  pinnedMemories: Memory[];
  dynamicMemories: Memory[];
  totalTokens: number;
  maxTokens: number;
}

export interface MemoryFilter {
  type?: MemoryType;
  fileRef?: string;
  startDate?: string;
  endDate?: string;
  pinned?: boolean;
  searchQuery?: string;
  minConfidence?: number;
}

export interface MemoryStats {
  totalMemories: number;
  pinnedCount: number;
  byType: Record<MemoryType, number>;
  avgConfidence: number;
  recentSessionCount: number;
  topFiles: Array<{ file: string; count: number }>;
  healthScore: number;
}

export interface EngramExport {
  version: string;
  exportDate: string;
  projectId: string;
  projectName: string;
  fingerprint: ProjectFingerprint;
  memories: Memory[];
  sessions: Session[];
}
