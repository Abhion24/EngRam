/**
 * Engram Claude API — Wrapper for Anthropic Claude API.
 * Handles embeddings (Haiku), decision extraction (Sonnet), and rate limiting.
 */

import * as https from 'https';

const CLAUDE_API_BASE = 'https://api.anthropic.com';
const EMBEDDING_MODEL = 'claude-haiku-4-5-20250501';
const EXTRACTION_MODEL = 'claude-sonnet-4-5-20250514';

export class ClaudeApi {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Generate a simple embedding by hashing content into a vector.
   * For MVP we use a lightweight local approach since Claude doesn't
   * have a dedicated embeddings endpoint. In production, use a proper
   * embedding model.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Lightweight local embedding using character n-gram hashing.
    // This avoids API calls for every embedding and works offline.
    return this.localEmbedding(text);
  }

  /**
   * Extract decisions and memories from a code diff using Claude Sonnet.
   */
  async extractMemories(diff: string, context: string): Promise<Array<{
    type: string;
    content: string;
    confidence: number;
    fileRefs: string[];
  }>> {
    if (!this.apiKey) {
      return this.mockExtractMemories(diff);
    }

    try {
      const response = await this.callClaude(EXTRACTION_MODEL, [
        {
          role: 'user',
          content: `You are a code analysis tool. Analyze this code diff and extract the key decisions, patterns, bug fixes, or warnings.

CONTEXT:
${context}

DIFF:
${diff}

Return a JSON array of memory objects with this format:
[
  {
    "type": "bug_fix|decision|pattern|warning|preference|architecture",
    "content": "Clear, concise description of what happened and why",
    "confidence": 0.0 to 1.0,
    "fileRefs": ["path/to/file.ts"]
  }
]

Extract only high-signal memories. Be concise. Return ONLY the JSON array.`
        }
      ]);

      try {
        const parsed = JSON.parse(response);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    } catch (error) {
      console.error('[Engram] Claude API error:', error);
      return this.mockExtractMemories(diff);
    }
  }

  /**
   * Compress context into a token-efficient format.
   */
  async compressContext(memories: string[], maxTokens: number): Promise<string> {
    if (!this.apiKey) {
      return memories.join('\n---\n').slice(0, maxTokens * 4);
    }

    try {
      const response = await this.callClaude(EMBEDDING_MODEL, [
        {
          role: 'user',
          content: `Compress these project memories into a structured context block for Claude Code. 
Maximum ${maxTokens} tokens. Prioritize: pinned items first, then most recent, then most relevant.
Format as structured markdown that Claude can parse optimally.

MEMORIES:
${memories.join('\n---\n')}

Return ONLY the compressed context block.`
        }
      ]);
      return response;
    } catch {
      return memories.join('\n---\n').slice(0, maxTokens * 4);
    }
  }

  // ─── Private Methods ─────────────────────────────────────────

  private async callClaude(model: string, messages: Array<{ role: string; content: string }>): Promise<string> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model,
        max_tokens: 4096,
        messages,
      });

      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.content && parsed.content[0]) {
              resolve(parsed.content[0].text || '');
            } else if (parsed.error) {
              reject(new Error(parsed.error.message));
            } else {
              resolve('');
            }
          } catch {
            reject(new Error('Failed to parse Claude response'));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  /**
   * Lightweight local embedding using character n-gram hashing.
   * Produces a 256-dimensional vector for cosine similarity search.
   */
  private localEmbedding(text: string): number[] {
    const dimensions = 256;
    const vector = new Array(dimensions).fill(0);
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const words = normalized.split(/\s+/);

    // Word-level hashing
    for (const word of words) {
      const hash = this.hashString(word);
      const idx = Math.abs(hash) % dimensions;
      vector[idx] += 1;
      // Bi-gram character hashing for semantic similarity
      for (let i = 0; i < word.length - 1; i++) {
        const bigram = word.substring(i, i + 2);
        const bigramHash = this.hashString(bigram);
        const bigramIdx = Math.abs(bigramHash) % dimensions;
        vector[bigramIdx] += 0.5;
      }
    }

    // L2 normalize
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < dimensions; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return hash;
  }

  /**
   * Mock memory extraction for demo/offline mode.
   */
  private mockExtractMemories(diff: string): Array<{ type: string; content: string; confidence: number; fileRefs: string[] }> {
    const memories: Array<{ type: string; content: string; confidence: number; fileRefs: string[] }> = [];
    const files: string[] = [];

    // Extract file names from diff
    const fileMatch = diff.match(/(?:---|\+\+\+) [ab]\/(.+)/g);
    if (fileMatch) {
      for (const m of fileMatch) {
        const f = m.replace(/(?:---|\+\+\+) [ab]\//, '');
        if (!files.includes(f)) files.push(f);
      }
    }

    if (diff.includes('fix') || diff.includes('bug') || diff.includes('error')) {
      memories.push({ type: 'bug_fix', content: `Fixed issue in ${files[0] || 'unknown file'}`, confidence: 0.7, fileRefs: files });
    }
    if (diff.includes('refactor') || diff.includes('restructur')) {
      memories.push({ type: 'architecture', content: `Refactored code structure in ${files[0] || 'unknown file'}`, confidence: 0.75, fileRefs: files });
    }
    if (diff.length > 100) {
      memories.push({ type: 'decision', content: `Code changes applied to ${files.length} file(s)`, confidence: 0.6, fileRefs: files });
    }

    return memories;
  }
}
