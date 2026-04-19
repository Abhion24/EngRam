/**
 * Engram Codebase Indexer — Scans and indexes the entire project codebase.
 * Extracts functions, components, classes, routes, DB schemas, and dependencies.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MemoryStore } from '../memory/memoryStore';
import { MemoryType, ProjectFingerprint } from '../memory/memoryTypes';
import { ClaudeApi } from '../api/claudeApi';

// Extensions to parse
const PARSEABLE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.json', '.md',
]);

// Directories to skip
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  '.cache', 'coverage', '.nyc_output', '.vscode', '.idea',
  'vendor', 'venv', '.env', '.engram',
]);

// Max file size to index (500KB)
const MAX_FILE_SIZE = 500 * 1024;

interface IndexedFile {
  path: string;
  language: string;
  functions: string[];
  classes: string[];
  exports: string[];
  imports: string[];
  components: string[];
}

export class CodebaseIndexer {
  private workspacePath: string;
  private memoryStore: MemoryStore;
  private claudeApi: ClaudeApi;
  private projectId: string;

  constructor(
    workspacePath: string,
    memoryStore: MemoryStore,
    claudeApi: ClaudeApi,
    projectId: string
  ) {
    this.workspacePath = workspacePath;
    this.memoryStore = memoryStore;
    this.claudeApi = claudeApi;
    this.projectId = projectId;
  }

  /**
   * Full codebase index — runs on first activation.
   */
  async indexCodebase(onProgress?: (message: string) => void): Promise<ProjectFingerprint> {
    onProgress?.('Scanning project directory...');

    const files = this.scanDirectory(this.workspacePath);
    const indexedFiles: IndexedFile[] = [];
    const languages = new Set<string>();
    const stack: string[] = [];
    const frameworks: string[] = [];
    let dbType: string | null = null;

    onProgress?.(`Found ${files.length} files to index`);

    // Detect package.json for stack info
    const packageJsonPath = path.join(this.workspacePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Detect frameworks
        if (allDeps['react']) { frameworks.push('React'); stack.push('React'); }
        if (allDeps['react-native']) { frameworks.push('React Native'); stack.push('React Native'); }
        if (allDeps['next']) { frameworks.push('Next.js'); stack.push('Next.js'); }
        if (allDeps['express']) { frameworks.push('Express'); stack.push('Express'); }
        if (allDeps['vue']) { frameworks.push('Vue'); stack.push('Vue'); }
        if (allDeps['angular']) { frameworks.push('Angular'); stack.push('Angular'); }
        if (allDeps['expo']) { frameworks.push('Expo'); stack.push('Expo'); }

        // Detect DB
        if (allDeps['@watermelondb/core'] || allDeps['@nozbe/watermelondb']) { dbType = 'WatermelonDB'; stack.push('WatermelonDB'); }
        if (allDeps['prisma'] || allDeps['@prisma/client']) { dbType = 'Prisma'; stack.push('Prisma'); }
        if (allDeps['drizzle-orm']) { dbType = 'Drizzle'; stack.push('Drizzle'); }
        if (allDeps['mongoose']) { dbType = 'MongoDB'; stack.push('MongoDB'); }
        if (allDeps['@supabase/supabase-js']) { stack.push('Supabase'); dbType = dbType || 'Supabase'; }
        if (allDeps['better-sqlite3'] || allDeps['sqlite3']) { dbType = dbType || 'SQLite'; stack.push('SQLite'); }

        // Detect other patterns
        if (allDeps['tailwindcss']) stack.push('Tailwind CSS');
        if (allDeps['typescript']) stack.push('TypeScript');
        if (allDeps['razorpay']) stack.push('Razorpay');
      } catch { /* ignore parse errors */ }
    }

    // Index each file
    let processed = 0;
    for (const filePath of files) {
      processed++;
      if (processed % 20 === 0) {
        onProgress?.(`Indexing ${processed}/${files.length} files...`);
      }

      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.py') languages.add('Python');
      if (ext === '.ts' || ext === '.tsx') languages.add('TypeScript');
      if (ext === '.js' || ext === '.jsx') languages.add('JavaScript');

      const indexed = this.indexFile(filePath);
      if (indexed) {
        indexedFiles.push(indexed);
      }
    }

    // Create architectural memories from indexed data
    onProgress?.('Generating architectural memories...');

    const fingerprint: ProjectFingerprint = {
      id: this.projectId,
      rootPath: this.workspacePath,
      name: path.basename(this.workspacePath),
      stack: [...new Set(stack)],
      frameworks: [...new Set(frameworks)],
      languages: [...languages],
      dbType,
      totalFiles: files.length,
      lastIndexed: new Date().toISOString(),
      memoryCount: 0,
    };

    // Store project fingerprint as a memory
    const fpContent = `Project "${fingerprint.name}" uses ${fingerprint.stack.join(', ')}. Languages: ${fingerprint.languages.join(', ')}. ${fingerprint.totalFiles} files indexed.${dbType ? ` Database: ${dbType}.` : ''}`;
    const fpEmbedding = await this.claudeApi.generateEmbedding(fpContent);

    this.memoryStore.createMemory({
      type: MemoryType.ARCHITECTURE,
      content: fpContent,
      embedding: fpEmbedding,
      fileRefs: ['package.json'],
      lineRefs: [],
      projectId: this.projectId,
      sessionId: 'indexer',
      pinned: true,
      tags: ['auto-indexed', 'fingerprint'],
      confidence: 0.95,
    });

    // Store key component/function index as memories
    const componentFiles = indexedFiles.filter(f => f.components.length > 0);
    if (componentFiles.length > 0) {
      const compSummary = componentFiles.map(f =>
        `${path.relative(this.workspacePath, f.path)}: [${f.components.join(', ')}]`
      ).join('\n');

      const compContent = `React components map:\n${compSummary}`;
      const compEmbed = await this.claudeApi.generateEmbedding(compContent);

      this.memoryStore.createMemory({
        type: MemoryType.ARCHITECTURE,
        content: compContent.slice(0, 2000),
        embedding: compEmbed,
        fileRefs: componentFiles.map(f => path.relative(this.workspacePath, f.path)),
        lineRefs: [],
        projectId: this.projectId,
        sessionId: 'indexer',
        pinned: false,
        tags: ['auto-indexed', 'components'],
        confidence: 0.85,
      });
    }

    // Save fingerprint
    this.memoryStore.saveFingerprint(fingerprint);
    onProgress?.(`Indexing complete! ${files.length} files, ${indexedFiles.length} parsed.`);

    return fingerprint;
  }

  /**
   * Scan directory recursively, respecting .gitignore and skip rules.
   */
  private scanDirectory(dir: string): string[] {
    const files: string[] = [];
    const gitignorePatterns = this.loadGitignore(this.workspacePath);

    const scan = (currentDir: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(this.workspacePath, fullPath);

        if (entry.isDirectory()) {
          if (SKIP_DIRS.has(entry.name)) continue;
          if (this.matchesGitignore(relativePath, gitignorePatterns)) continue;
          scan(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!PARSEABLE_EXTENSIONS.has(ext)) continue;
          if (this.matchesGitignore(relativePath, gitignorePatterns)) continue;

          try {
            const stat = fs.statSync(fullPath);
            if (stat.size > MAX_FILE_SIZE) continue;
          } catch {
            continue;
          }

          files.push(fullPath);
        }
      }
    };

    scan(dir);
    return files;
  }

  /**
   * Index a single file — extract functions, classes, components, imports, exports.
   */
  private indexFile(filePath: string): IndexedFile | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();
      const language = ext === '.py' ? 'python' : 'javascript';

      const functions: string[] = [];
      const classes: string[] = [];
      const exports: string[] = [];
      const imports: string[] = [];
      const components: string[] = [];

      if (language === 'javascript') {
        // Extract functions
        const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
        let match;
        while ((match = funcRegex.exec(content)) !== null) {
          functions.push(match[1]);
        }

        // Extract arrow function assignments
        const arrowRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
        while ((match = arrowRegex.exec(content)) !== null) {
          functions.push(match[1]);
        }

        // Extract classes
        const classRegex = /(?:export\s+)?class\s+(\w+)/g;
        while ((match = classRegex.exec(content)) !== null) {
          classes.push(match[1]);
        }

        // Extract React components (capitalized function/const)
        const componentRegex = /(?:export\s+(?:default\s+)?)?(?:function|const)\s+([A-Z]\w+)/g;
        while ((match = componentRegex.exec(content)) !== null) {
          if (content.includes('React') || content.includes('jsx') || ext === '.tsx' || ext === '.jsx') {
            components.push(match[1]);
          }
        }

        // Extract exports
        const exportRegex = /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g;
        while ((match = exportRegex.exec(content)) !== null) {
          exports.push(match[1]);
        }

        // Extract imports
        const importRegex = /import\s+.*from\s+['"]([^'"]+)['"]/g;
        while ((match = importRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }
      } else if (language === 'python') {
        // Extract Python functions
        const pyFuncRegex = /def\s+(\w+)/g;
        let match;
        while ((match = pyFuncRegex.exec(content)) !== null) {
          functions.push(match[1]);
        }

        // Extract Python classes
        const pyClassRegex = /class\s+(\w+)/g;
        while ((match = pyClassRegex.exec(content)) !== null) {
          classes.push(match[1]);
        }

        // Extract Python imports
        const pyImportRegex = /(?:from\s+(\S+)\s+import|import\s+(\S+))/g;
        while ((match = pyImportRegex.exec(content)) !== null) {
          imports.push(match[1] || match[2]);
        }
      }

      return {
        path: filePath,
        language,
        functions,
        classes,
        exports,
        imports,
        components,
      };
    } catch {
      return null;
    }
  }

  private loadGitignore(rootDir: string): string[] {
    const gitignorePath = path.join(rootDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) return [];
    try {
      return fs.readFileSync(gitignorePath, 'utf-8')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
    } catch {
      return [];
    }
  }

  private matchesGitignore(relativePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (relativePath.includes(pattern.replace('*', '').replace('/', ''))) {
        return true;
      }
    }
    return false;
  }
}
