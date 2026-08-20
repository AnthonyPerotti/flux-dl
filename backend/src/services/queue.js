const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { downloadMedia } = require('./ytdlp');

class DownloadQueue extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, object>} */
    this.jobs = new Map();
    this.pending = []; // list of job IDs waiting to run
    this.processing = false;
  }

  /**
   * Add a new job to the queue and start processing if idle.
   * @param {object} jobData
   * @returns {object} The created job
   */
  add(jobData) {
    const job = {
      id: uuidv4(),
      url: jobData.url,
      title: jobData.title || jobData.url,
      thumbnail: jobData.thumbnail || null,
      mode: jobData.mode, // 'video' | 'audio'
      formatSpec: jobData.formatSpec || 'bestvideo+bestaudio/best',
      audioQuality: jobData.audioQuality || '0',
      status: 'queued',
      progress: 0,
      speed: null,
      eta: null,
      size: null,
      outputFile: null,
      error: null,
      createdAt: new Date().toISOString(),
      finishedAt: null,
    };

    this.jobs.set(job.id, job);
    this.pending.push(job.id);
    this._broadcast(job);
    this._process();

    return job;
  }

  /**
   * Return all jobs (most recent first).
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  /**
   * Return a single job by ID.
   * @param {string} id
   * @returns {object|undefined}
   */
  get(id) {
    return this.jobs.get(id);
  }

  /**
   * Remove a job permanently.
   * @param {string} id
   */
  remove(id) {
    this.jobs.delete(id);
    this.pending = this.pending.filter((jid) => jid !== id);
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  _update(id, changes) {
    const job = this.jobs.get(id);
    if (!job) return;
    Object.assign(job, changes);
    this._broadcast(job);
  }

  _broadcast(job) {
    this.emit('update', { ...job });
  }

  async _process() {
    if (this.processing || this.pending.length === 0) return;
    this.processing = true;

    while (this.pending.length > 0) {
      const jobId = this.pending.shift();
      const job = this.jobs.get(jobId);
      if (!job) continue;

      this._update(jobId, { status: 'downloading' });

      try {
        const outputFile = await downloadMedia(job, (update) => {
          this._update(jobId, update);
        });

        this._update(jobId, {
          status: 'done',
          progress: 100,
          outputFile,
          finishedAt: new Date().toISOString(),
        });
      } catch (err) {
        this._update(jobId, {
          status: 'error',
          error: err.message,
          finishedAt: new Date().toISOString(),
        });
      }
    }

    this.processing = false;
  }
}

// Singleton — shared across all requests
module.exports = new DownloadQueue();
