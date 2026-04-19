/**
 * Engram Dashboard Server — Express REST API + static file server.
 * Serves the React dashboard at localhost:6173 and provides API endpoints.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as http from 'http';
import { MemoryStore } from '../memory/memoryStore';
import { MemoryType, MemoryFilter } from '../memory/memoryTypes';
import { ContextInjector } from '../context/contextInjector';
import { ClaudeApi } from '../api/claudeApi';

export class DashboardServer {
  private app: express.Application;
  private server: http.Server | null = null;
  private memoryStore: MemoryStore;
  private contextInjector: ContextInjector;
  private claudeApi: ClaudeApi;
  private port: number;

  constructor(
    memoryStore: MemoryStore,
    contextInjector: ContextInjector,
    claudeApi: ClaudeApi,
    port: number = 6173
  ) {
    this.memoryStore = memoryStore;
    this.contextInjector = contextInjector;
    this.claudeApi = claudeApi;
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));

    // Serve static dashboard files
    // When bundled, __dirname = dist/, dashboard is at dist/dashboard/
    const dashboardPath = path.join(__dirname, 'dashboard');
    this.app.use(express.static(dashboardPath));
  }

  private setupRoutes(): void {
    // ─── Memory Endpoints ──────────────────────────────────────

    this.app.get('/api/memories', (req: Request, res: Response) => {
      try {
        const filter: MemoryFilter = {};
        if (req.query.type) filter.type = req.query.type as MemoryType;
        if (req.query.pinned) filter.pinned = req.query.pinned === 'true';
        if (req.query.search) filter.searchQuery = req.query.search as string;
        if (req.query.fileRef) filter.fileRef = req.query.fileRef as string;
        if (req.query.startDate) filter.startDate = req.query.startDate as string;
        if (req.query.endDate) filter.endDate = req.query.endDate as string;
        if (req.query.minConfidence) filter.minConfidence = parseFloat(req.query.minConfidence as string);

        const memories = this.memoryStore.listMemories(filter);
        res.json({ memories, total: memories.length });
      } catch (error) {
        res.status(500).json({ error: 'Failed to list memories' });
      }
    });

    this.app.get('/api/memories/:id', (req: Request, res: Response) => {
      try {
        const memory = this.memoryStore.getMemory(req.params.id);
        if (!memory) return res.status(404).json({ error: 'Memory not found' });
        res.json(memory);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get memory' });
      }
    });

    this.app.post('/api/memories', async (req: Request, res: Response) => {
      try {
        const { type, content, fileRefs = [], tags = [] } = req.body;
        if (!type || !content) return res.status(400).json({ error: 'type and content are required' });

        const embedding = await this.claudeApi.generateEmbedding(content);
        const memory = this.memoryStore.createMemory({
          type,
          content,
          embedding,
          fileRefs,
          lineRefs: [],
          projectId: '',
          sessionId: 'manual',
          pinned: false,
          tags,
          confidence: 1.0,
        });

        res.status(201).json(memory);
      } catch (error) {
        res.status(500).json({ error: 'Failed to create memory' });
      }
    });

    this.app.put('/api/memories/:id', (req: Request, res: Response) => {
      try {
        const success = this.memoryStore.updateMemory(req.params.id, req.body);
        if (!success) return res.status(404).json({ error: 'Memory not found' });
        const updated = this.memoryStore.getMemory(req.params.id);
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: 'Failed to update memory' });
      }
    });

    this.app.delete('/api/memories/:id', (req: Request, res: Response) => {
      try {
        const success = this.memoryStore.deleteMemory(req.params.id);
        if (!success) return res.status(404).json({ error: 'Memory not found' });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete memory' });
      }
    });

    this.app.post('/api/memories/:id/pin', (req: Request, res: Response) => {
      try {
        const success = this.memoryStore.togglePin(req.params.id);
        if (!success) return res.status(404).json({ error: 'Memory not found' });
        const updated = this.memoryStore.getMemory(req.params.id);
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: 'Failed to toggle pin' });
      }
    });

    // ─── Session Endpoints ─────────────────────────────────────

    this.app.get('/api/sessions', (_req: Request, res: Response) => {
      try {
        const sessions = this.memoryStore.listSessions();
        res.json({ sessions, total: sessions.length });
      } catch (error) {
        res.status(500).json({ error: 'Failed to list sessions' });
      }
    });

    this.app.get('/api/sessions/:id', (req: Request, res: Response) => {
      try {
        const session = this.memoryStore.getSession(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        // Get memories for this session
        const memories = this.memoryStore.listMemories()
          .filter(m => m.sessionId === req.params.id);

        res.json({ session, memories });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get session' });
      }
    });

    // ─── Context Preview ───────────────────────────────────────

    this.app.get('/api/context/preview', async (_req: Request, res: Response) => {
      try {
        const preview = await this.contextInjector.previewContext();
        res.json(preview);
      } catch (error) {
        res.status(500).json({ error: 'Failed to preview context' });
      }
    });

    // ─── Stats ─────────────────────────────────────────────────

    this.app.get('/api/stats', (_req: Request, res: Response) => {
      try {
        const stats = this.memoryStore.getStats();
        const fingerprint = this.memoryStore.getFingerprint();
        res.json({ stats, fingerprint });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
      }
    });

    // ─── Health ────────────────────────────────────────────────

    this.app.get('/api/health', (_req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        version: '1.0.0',
        uptime: process.uptime(),
      });
    });

    // ─── Export / Import ───────────────────────────────────────

    this.app.post('/api/export', (_req: Request, res: Response) => {
      try {
        const data = this.memoryStore.exportAll();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: 'Failed to export' });
      }
    });

    this.app.post('/api/import', (req: Request, res: Response) => {
      try {
        const result = this.memoryStore.importAll(req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to import' });
      }
    });

    // ─── SPA Fallback ──────────────────────────────────────────

    this.app.get('*', (_req: Request, res: Response) => {
      const dashboardPath = path.join(__dirname, 'dashboard', 'index.html');
      res.sendFile(dashboardPath);
    });
  }

  /**
   * Start the dashboard server.
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`[Engram] Dashboard running at http://localhost:${this.port}`);
          resolve();
        });
        this.server.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`[Engram] Port ${this.port} already in use, trying ${this.port + 1}`);
            this.port++;
            this.server = this.app.listen(this.port, () => {
              console.log(`[Engram] Dashboard running at http://localhost:${this.port}`);
              resolve();
            });
          } else {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Stop the dashboard server.
   */
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  getPort(): number {
    return this.port;
  }
}
