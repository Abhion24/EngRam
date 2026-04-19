/**
 * Engram Diff Analyzer — Computes and analyzes file diffs for memory extraction.
 */

import { execSync } from 'child_process';
import * as path from 'path';

export interface DiffResult {
  filesChanged: string[];
  additions: number;
  deletions: number;
  rawDiff: string;
  summary: string;
}

export class DiffAnalyzer {
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  /**
   * Get git diff for recent changes (staged + unstaged).
   */
  getRecentDiff(): DiffResult {
    try {
      const diff = execSync('git diff HEAD~1 --no-color', {
        cwd: this.workspacePath,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024 * 5,
      });

      return this.parseDiff(diff);
    } catch {
      try {
        const diff = execSync('git diff --no-color', {
          cwd: this.workspacePath,
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024 * 5,
        });
        return this.parseDiff(diff);
      } catch {
        return { filesChanged: [], additions: 0, deletions: 0, rawDiff: '', summary: 'No git changes detected' };
      }
    }
  }

  /**
   * Get diff for specific files.
   */
  getFileDiff(files: string[]): DiffResult {
    try {
      const relativePaths = files.map(f => path.relative(this.workspacePath, f)).join(' ');
      const diff = execSync(`git diff --no-color -- ${relativePaths}`, {
        cwd: this.workspacePath,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024 * 5,
      });
      return this.parseDiff(diff);
    } catch {
      return { filesChanged: files, additions: 0, deletions: 0, rawDiff: '', summary: 'Could not compute diff' };
    }
  }

  /**
   * Detect what files have changed since a given timestamp.
   */
  getChangedFilesSince(since: Date): string[] {
    try {
      const sinceStr = since.toISOString();
      const output = execSync(`git log --since="${sinceStr}" --name-only --format="" --no-color`, {
        cwd: this.workspacePath,
        encoding: 'utf-8',
      });
      const files = output.split('\n').filter(f => f.trim().length > 0);
      return [...new Set(files)];
    } catch {
      return [];
    }
  }

  /**
   * Parse a raw git diff into structured data.
   */
  private parseDiff(diff: string): DiffResult {
    const filesChanged: string[] = [];
    let additions = 0;
    let deletions = 0;

    const lines = diff.split('\n');

    for (const line of lines) {
      if (line.startsWith('+++ b/')) {
        filesChanged.push(line.replace('+++ b/', ''));
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
      }
    }

    const summary = `${filesChanged.length} file(s) changed: +${additions} -${deletions}`;

    // Truncate diff if too large (keep first 5000 chars for API calls)
    const rawDiff = diff.length > 5000 ? diff.substring(0, 5000) + '\n... [truncated]' : diff;

    return { filesChanged, additions, deletions, rawDiff, summary };
  }
}
