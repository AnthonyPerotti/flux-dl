/**
 * Flux DL — Main application script
 */

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  currentInfo: null,    // Video info from /api/info
  currentMode: 'video', // 'video' | 'audio'
  selectedOption: null, // The selected quality option object
  jobs: new Map(),      // job.id => job object
  files: [],            // library files
};

// ─── DOM References ───────────────────────────────────────────────────────────
const urlForm       = document.getElementById('url-form');
const urlInput      = document.getElementById('url-input');
const analyzeBtn    = document.getElementById('analyze-btn');
const urlError      = document.getElementById('url-error');
const infoPanel     = document.getElementById('info-panel');
const mediaThumb    = document.getElementById('media-thumb');
const mediaTitle    = document.getElementById('media-title');
const mediaUploader = document.getElementById('media-uploader');
const mediaDuration = document.getElementById('media-duration');
const tabVideo      = document.getElementById('tab-video');
const tabAudio      = document.getElementById('tab-audio');
const gridVideo     = document.getElementById('quality-grid-video');
const gridAudio     = document.getElementById('quality-grid-audio');
const sizeEstimate  = document.getElementById('size-estimate-value');
const downloadBtn   = document.getElementById('download-btn');
const queueList     = document.getElementById('queue-list');
const queueEmpty    = document.getElementById('queue-empty');
const libraryList   = document.getElementById('library-list');
const libraryEmpty  = document.getElementById('library-empty');
const langBtn       = document.getElementById('lang-btn');
const toastContainer = document.getElementById('toast-container');

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Format bytes to a human-readable string.
 * @param {number|null} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return i18n.t('info.size.unknown');
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'info'|'success'|'error'} type
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');

  const icons = {
    success: '&#10003;',
    error: '&#10007;',
    info: '&#9432;',
  };

  toast.innerHTML = `<span aria-hidden="true">${icons[type] || icons.info}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Format seconds as m:ss or h:mm:ss.
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Derive file extension icon based on filename.
 * @param {string} name
 * @returns {string} SVG string
 */
function fileIcon(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const audioExts = ['mp3', 'aac', 'flac', 'opus', 'm4a', 'wav', 'ogg'];
  if (audioExts.includes(ext)) {
    // Music note icon
    return `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>`;
  }
  // Film icon
  return `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/>
    <line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>
    <line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/>
    <line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>
  </svg>`;
}

// ─── Language Toggle ──────────────────────────────────────────────────────────
langBtn.addEventListener('click', () => {
  i18n.toggleLang();
  // Re-render dynamic content after language change
  renderQueue();
  renderLibrary();
});

// ─── URL Analysis ─────────────────────────────────────────────────────────────
urlForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();

  urlError.textContent = '';
  urlError.classList.remove('visible');

  if (!url) {
    urlError.textContent = i18n.t('error.url_required');
    urlError.classList.add('visible');
    return;
  }

  analyzeBtn.classList.add('is-loading');
  analyzeBtn.disabled = true;
  infoPanel.classList.remove('visible');

  try {
    const res = await fetch('/api/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || i18n.t('error.fetch'));
    }

    state.currentInfo = data;
    renderInfoPanel(data);
    infoPanel.classList.add('visible');
  } catch (err) {
    urlError.textContent = err.message || i18n.t('error.fetch');
    urlError.classList.add('visible');
  } finally {
    analyzeBtn.classList.remove('is-loading');
    analyzeBtn.disabled = false;
  }
});

// ─── Info Panel Rendering ─────────────────────────────────────────────────────
function renderInfoPanel(info) {
  // Thumbnail
  if (info.thumbnail) {
    mediaThumb.src = info.thumbnail;
    mediaThumb.style.display = '';
  } else {
    mediaThumb.style.display = 'none';
  }

  mediaTitle.textContent = info.title || '';

  // Uploader
  const uploaderWrap = document.getElementById('media-uploader-wrap');
  if (info.uploader) {
    mediaUploader.textContent = info.uploader;
    uploaderWrap.style.display = '';
  } else {
    uploaderWrap.style.display = 'none';
  }

  // Duration
  const durationWrap = document.getElementById('media-duration-wrap');
  if (info.duration) {
    mediaDuration.textContent = info.durationString || formatDuration(info.duration);
    durationWrap.style.display = '';
  } else {
    durationWrap.style.display = 'none';
  }

  // Render quality options
  renderQualityGrid(info.videoOptions, gridVideo, 'video');
  renderQualityGrid(info.audioOptions, gridAudio, 'audio');

  // Default: select first video option
  state.currentMode = 'video';
  setActiveTab('video');
  selectFirstOption('video');
}

function renderQualityGrid(options, container, mode) {
  container.innerHTML = '';

  if (!options || options.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">${i18n.t('info.size.unknown')}</p>`;
    return;
  }

  options.forEach((opt, index) => {
    const id = `quality-${mode}-${index}`;
    const label = document.createElement('label');
    label.className = 'quality-option';
    label.htmlFor = id;

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `quality-${mode}`;
    input.id = id;
    input.value = index;

    const labelDiv = document.createElement('div');
    labelDiv.className = 'quality-label';
    labelDiv.innerHTML = `
      <span class="quality-name">${opt.label}</span>
      <span class="quality-size">${formatBytes(opt.estimatedSize)}</span>
    `;

    input.addEventListener('change', () => {
      state.selectedOption = opt;
      updateSizeEstimate(opt.estimatedSize);
    });

    label.appendChild(input);
    label.appendChild(labelDiv);
    container.appendChild(label);
  });
}

function selectFirstOption(mode) {
  const grid = mode === 'video' ? gridVideo : gridAudio;
  const firstInput = grid.querySelector('input[type="radio"]');
  if (firstInput) {
    firstInput.checked = true;
    const info = state.currentInfo;
    const options = mode === 'video' ? info.videoOptions : info.audioOptions;
    state.selectedOption = options[0];
    updateSizeEstimate(options[0].estimatedSize);
  }
}

function updateSizeEstimate(bytes) {
  sizeEstimate.textContent = formatBytes(bytes);
}

// ─── Tab switching ────────────────────────────────────────────────────────────
function setActiveTab(mode) {
  if (mode === 'video') {
    tabVideo.classList.add('active');
    tabVideo.setAttribute('aria-selected', 'true');
    tabAudio.classList.remove('active');
    tabAudio.setAttribute('aria-selected', 'false');
    gridVideo.style.display = '';
    gridAudio.style.display = 'none';
  } else {
    tabAudio.classList.add('active');
    tabAudio.setAttribute('aria-selected', 'true');
    tabVideo.classList.remove('active');
    tabVideo.setAttribute('aria-selected', 'false');
    gridAudio.style.display = '';
    gridVideo.style.display = 'none';
  }
}

tabVideo.addEventListener('click', () => {
  state.currentMode = 'video';
  setActiveTab('video');
  selectFirstOption('video');
});

tabAudio.addEventListener('click', () => {
  state.currentMode = 'audio';
  setActiveTab('audio');
  selectFirstOption('audio');
});

// ─── Download Action ──────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', async () => {
  if (!state.currentInfo || !state.selectedOption) return;

  const opt = state.selectedOption;
  const info = state.currentInfo;

  try {
    const payload = {
      url: info.webpage_url,
      title: info.title,
      thumbnail: info.thumbnail,
      mode: state.currentMode,
      formatSpec: opt.formatSpec,
      audioQuality: opt.quality || '0',
    };

    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || i18n.t('error.download'));
    }

    showToast(i18n.t('toast.download_queued'), 'success');

    // Reset the form
    urlInput.value = '';
    infoPanel.classList.remove('visible');
    state.currentInfo = null;
    state.selectedOption = null;
  } catch (err) {
    showToast(err.message || i18n.t('toast.error'), 'error');
  }
});

// ─── SSE — Real-time Queue Updates ───────────────────────────────────────────
function connectSSE() {
  const evtSource = new EventSource('/api/events');

  evtSource.onmessage = (e) => {
    const job = JSON.parse(e.data);
    state.jobs.set(job.id, job);
    renderQueue();

    // Refresh library when a job completes
    if (job.status === 'done') {
      fetchLibrary();
    }
  };

  evtSource.onerror = () => {
    // Reconnect after 3 seconds
    evtSource.close();
    setTimeout(connectSSE, 3000);
  };
}

// ─── Queue Rendering ──────────────────────────────────────────────────────────
function renderQueue() {
  const jobs = Array.from(state.jobs.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  if (jobs.length === 0) {
    queueEmpty.style.display = '';
    queueList.innerHTML = '';
    queueList.appendChild(queueEmpty);
    return;
  }

  queueEmpty.style.display = 'none';

  // Preserve existing items to avoid flickering; update them in place
  jobs.forEach((job) => {
    let el = document.getElementById(`job-${job.id}`);
    if (!el) {
      el = createQueueItem(job);
      queueList.insertBefore(el, queueList.firstChild);
    } else {
      updateQueueItem(el, job);
    }
  });

  // Remove items no longer in state
  const existingEls = queueList.querySelectorAll('.queue-item');
  existingEls.forEach((el) => {
    const id = el.id.replace('job-', '');
    if (!state.jobs.has(id)) el.remove();
  });
}

function createQueueItem(job) {
  const el = document.createElement('div');
  el.className = `queue-item ${job.status}`;
  el.id = `job-${job.id}`;
  el.innerHTML = buildQueueItemHTML(job);
  attachQueueItemListeners(el, job);
  return el;
}

function updateQueueItem(el, job) {
  el.className = `queue-item ${job.status}`;

  const progressBar = el.querySelector('.progress-bar');
  if (progressBar) {
    progressBar.style.width = `${job.progress}%`;
    progressBar.className = `progress-bar ${job.status === 'done' ? 'done' : job.status === 'error' ? 'error' : ''}`;
  }

  const badge = el.querySelector('.status-badge');
  if (badge) {
    badge.className = `status-badge ${job.status}`;
    badge.textContent = i18n.t(`queue.status.${job.status}`);
  }

  const speedEl = el.querySelector('.job-speed');
  if (speedEl) speedEl.textContent = job.speed ? `${job.speed}` : '';

  const etaEl = el.querySelector('.job-eta');
  if (etaEl) etaEl.textContent = job.eta && job.status === 'downloading' ? `ETA ${job.eta}` : '';
}

function buildQueueItemHTML(job) {
  const statusLabel = i18n.t(`queue.status.${job.status}`);
  const thumbHTML = job.thumbnail
    ? `<img src="${job.thumbnail}" class="queue-thumb" alt="" loading="lazy" />`
    : `<div class="queue-thumb-placeholder"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M10 8l6 4-6 4V8z"/></svg></div>`;

  const modeLabel = job.mode === 'audio' ? 'MP3' : 'MP4';

  return `
    ${thumbHTML}
    <div class="queue-body">
      <p class="queue-title">${escapeHtml(job.title)}</p>
      <div class="queue-status-line">
        <span class="status-badge ${job.status}">${statusLabel}</span>
        <span style="font-size:11px;color:var(--text-muted);">${modeLabel}</span>
        <span class="job-speed" style="font-size:11px;color:var(--text-muted);">${job.speed || ''}</span>
        <span class="job-eta" style="font-size:11px;color:var(--text-muted);">${job.eta && job.status === 'downloading' ? 'ETA ' + job.eta : ''}</span>
      </div>
      <div class="progress-bar-wrapper">
        <div class="progress-bar ${job.status === 'done' ? 'done' : job.status === 'error' ? 'error' : ''}"
             style="width:${job.progress}%"></div>
      </div>
      ${job.error ? `<p style="font-size:11px;color:var(--error);margin-top:6px;">${escapeHtml(job.error)}</p>` : ''}
    </div>
    <div class="queue-actions">
      <button class="btn btn-sm btn-ghost job-remove-btn" data-id="${job.id}" aria-label="${i18n.t('queue.remove')}">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>
  `;
}

function attachQueueItemListeners(el, job) {
  el.querySelector('.job-remove-btn')?.addEventListener('click', async () => {
    try {
      const res = await fetch(`/api/download/${job.id}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        state.jobs.delete(job.id);
        el.remove();
        if (state.jobs.size === 0) {
          queueEmpty.style.display = '';
          queueList.appendChild(queueEmpty);
        }
      } else {
        const err = await res.json();
        showToast(err.error || i18n.t('toast.error'), 'error');
      }
    } catch {
      showToast(i18n.t('toast.error'), 'error');
    }
  });
}

// ─── Files Library ────────────────────────────────────────────────────────────
async function fetchLibrary() {
  try {
    const res = await fetch('/api/files');
    if (!res.ok) return;
    state.files = await res.json();
    renderLibrary();
  } catch {
    // Silently ignore — the library will show empty
  }
}

function renderLibrary() {
  if (!state.files || state.files.length === 0) {
    libraryEmpty.style.display = '';
    libraryList.innerHTML = '';
    libraryList.appendChild(libraryEmpty);
    return;
  }

  libraryEmpty.style.display = 'none';
  libraryList.innerHTML = '';

  state.files.forEach((file) => {
    const el = document.createElement('div');
    el.className = 'library-item';
    el.dataset.filename = file.name;

    const dateStr = new Date(file.modifiedAt).toLocaleDateString(i18n.getLang(), {
      year: 'numeric', month: 'short', day: 'numeric',
    });

    el.innerHTML = `
      <div class="file-icon">${fileIcon(file.name)}</div>
      <div class="file-info">
        <p class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</p>
        <p class="file-meta">${formatBytes(file.size)} · ${dateStr}</p>
      </div>
      <div class="file-actions">
        <a class="btn btn-sm btn-success"
           href="${file.downloadUrl}"
           download="${escapeHtml(file.name)}"
           aria-label="${i18n.t('library.download')}">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span data-i18n="library.download">${i18n.t('library.download')}</span>
        </a>
        <button class="btn btn-sm btn-danger file-delete-btn"
                data-name="${escapeHtml(file.name)}"
                aria-label="${i18n.t('library.delete')}">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    `;

    el.querySelector('.file-delete-btn').addEventListener('click', () => deleteFile(file.name, el));
    libraryList.appendChild(el);
  });
}

async function deleteFile(filename, el) {
  if (!confirm(`Excluir "${filename}"?`)) return;

  try {
    const res = await fetch(`/api/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      el.remove();
      state.files = state.files.filter((f) => f.name !== filename);
      showToast(i18n.t('toast.file_deleted'), 'success');
      if (state.files.length === 0) {
        libraryEmpty.style.display = '';
        libraryList.appendChild(libraryEmpty);
      }
    } else {
      const err = await res.json();
      showToast(err.error || i18n.t('toast.error'), 'error');
    }
  } catch {
    showToast(i18n.t('toast.error'), 'error');
  }
}

// ─── Security ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
(function init() {
  i18n.applyTranslations();
  connectSSE();
  fetchLibrary();
})();
