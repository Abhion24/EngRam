/**
 * Engram Vector Store — Pure JS cosine similarity search with JSON file persistence.
 * Zero native dependencies. Works everywhere.
 */

import * as fs from 'fs';
import * as path from 'path';

interface VectorEntry {
  id: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export class VectorStore {
  private vectors: Map<string, VectorEntry> = new Map();
  private filePath: string;

  constructor(storagePath: string) {
    this.filePath = path.join(storagePath, 'engram_vectors.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        if (Array.isArray(data)) {
          for (const entry of data) {
            this.vectors.set(entry.id, entry);
          }
        }
      }
    } catch {
      this.vectors = new Map();
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.vectors.values());
      fs.writeFileSync(this.filePath, JSON.stringify(data), 'utf-8');
    } catch (err) {
      console.error('[Engram] Failed to save vectors:', err);
    }
  }

  store(id: string, embedding: number[], metadata: Record<string, unknown> = {}): void {
    this.vectors.set(id, { id, embedding, metadata });
    this.save();
  }

  remove(id: string): void {
    this.vectors.delete(id);
    this.save();
  }

  search(queryEmbedding: number[], topK: number = 15, threshold: number = 0.6): Array<{ id: string; score: number }> {
    const results: Array<{ id: string; score: number }> = [];

    for (const entry of this.vectors.values()) {
      const score = this.cosineSimilarity(queryEmbedding, entry.embedding);
      if (score >= threshold) {
        results.push({ id: entry.id, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  count(): number {
    return this.vectors.size;
  }

  has(id: string): boolean {
    return this.vectors.has(id);
  }

  clear(): void {
    this.vectors.clear();
    this.save();
  }

  close(): void {
    this.save();
  }
}
