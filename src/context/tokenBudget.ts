/**
 * Engram Token Budget Manager — Manages context injection token limits.
 * Ensures injected context never exceeds configured budget.
 */

export class TokenBudget {
  private maxTokens: number;

  constructor(maxTokens: number = 2000) {
    this.maxTokens = maxTokens;
  }

  setMaxTokens(max: number): void {
    this.maxTokens = max;
  }

  getMaxTokens(): number {
    return this.maxTokens;
  }

  /**
   * Estimate token count for a string.
   * Uses a simple heuristic: ~4 characters per token for English text.
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Compress a list of memory strings to fit within the token budget.
   * Priority: pinned > recent > relevant (by order in input arrays).
   */
  compress(
    pinnedMemories: string[],
    recentMemories: string[],
    relevantMemories: string[]
  ): { context: string; tokensUsed: number; memoriesIncluded: number } {
    const sections: string[] = [];
    let tokensUsed = 0;
    let memoriesIncluded = 0;

    // Header
    const header = '## 🧠 Engram Project Context\n\n';
    tokensUsed += this.estimateTokens(header);
    sections.push(header);

    // Phase 1: Always include pinned memories
    if (pinnedMemories.length > 0) {
      sections.push('### 📌 Pinned Context (Always Active)\n');
      tokensUsed += this.estimateTokens('### 📌 Pinned Context (Always Active)\n');

      for (const mem of pinnedMemories) {
        const tokens = this.estimateTokens(mem);
        if (tokensUsed + tokens < this.maxTokens * 0.6) {
          sections.push(`- ${mem}\n`);
          tokensUsed += tokens + 2;
          memoriesIncluded++;
        }
      }
    }

    // Phase 2: Recent memories (up to 30% of remaining budget)
    const recentBudget = (this.maxTokens - tokensUsed) * 0.5;
    if (recentMemories.length > 0) {
      sections.push('\n### ⏱️ Recent Decisions\n');
      tokensUsed += this.estimateTokens('\n### ⏱️ Recent Decisions\n');

      let recentTokens = 0;
      for (const mem of recentMemories) {
        const tokens = this.estimateTokens(mem);
        if (recentTokens + tokens < recentBudget && tokensUsed + tokens < this.maxTokens) {
          sections.push(`- ${mem}\n`);
          tokensUsed += tokens + 2;
          recentTokens += tokens;
          memoriesIncluded++;
        }
      }
    }

    // Phase 3: Semantically relevant (fill remaining budget)
    if (relevantMemories.length > 0 && tokensUsed < this.maxTokens * 0.9) {
      sections.push('\n### 🔗 Relevant Context\n');
      tokensUsed += this.estimateTokens('\n### 🔗 Relevant Context\n');

      for (const mem of relevantMemories) {
        const tokens = this.estimateTokens(mem);
        if (tokensUsed + tokens < this.maxTokens) {
          sections.push(`- ${mem}\n`);
          tokensUsed += tokens + 2;
          memoriesIncluded++;
        }
      }
    }

    return {
      context: sections.join(''),
      tokensUsed,
      memoriesIncluded,
    };
  }
}
