/**
 * Flux DL — Internationalization module
 * Supports pt-BR (default) and en.
 */

const translations = {
  'pt-BR': {
    // Header
    'app.tagline': 'Baixe vídeos e áudios de qualquer lugar',
    'lang.toggle': 'English',

    // URL Input
    'input.placeholder': 'Cole o link do YouTube, Instagram, TikTok...',
    'input.analyze': 'Analisar',
    'input.analyzing': 'Analisando...',

    // Info panel
    'info.duration': 'Duração',
    'info.uploader': 'Canal',
    'info.quality.title': 'Qualidade do Download',
    'info.quality.video': 'Vídeo',
    'info.quality.audio': 'Somente Áudio',
    'info.size.estimated': 'Tamanho estimado',
    'info.size.unknown': 'Desconhecido',
    'info.download': 'Baixar no Servidor',
    'info.best': 'Melhor disponível',

    // Queue
    'queue.title': 'Fila de Downloads',
    'queue.empty': 'Nenhum download em andamento.',
    'queue.status.queued': 'Na fila',
    'queue.status.downloading': 'Baixando',
    'queue.status.done': 'Concluído',
    'queue.status.error': 'Erro',
    'queue.speed': 'Velocidade',
    'queue.eta': 'Tempo restante',
    'queue.remove': 'Remover',

    // Files library
    'library.title': 'Arquivos Baixados',
    'library.empty': 'Nenhum arquivo baixado ainda.',
    'library.download': 'Baixar para este PC',
    'library.delete': 'Excluir',
    'library.size': 'Tamanho',
    'library.date': 'Data',

    // Errors
    'error.url_required': 'Insira uma URL válida.',
    'error.fetch': 'Não foi possível obter informações do link.',
    'error.download': 'Erro ao iniciar o download.',

    // Toast
    'toast.download_queued': 'Download adicionado à fila!',
    'toast.file_deleted': 'Arquivo excluído.',
    'toast.error': 'Ocorreu um erro.',
  },
  'en': {
    // Header
    'app.tagline': 'Download videos and audio from anywhere',
    'lang.toggle': 'Português',

    // URL Input
    'input.placeholder': 'Paste a YouTube, Instagram, TikTok link...',
    'input.analyze': 'Analyze',
    'input.analyzing': 'Analyzing...',

    // Info panel
    'info.duration': 'Duration',
    'info.uploader': 'Channel',
    'info.quality.title': 'Download Quality',
    'info.quality.video': 'Video',
    'info.quality.audio': 'Audio only',
    'info.size.estimated': 'Estimated size',
    'info.size.unknown': 'Unknown',
    'info.download': 'Download to Server',
    'info.best': 'Best available',

    // Queue
    'queue.title': 'Download Queue',
    'queue.empty': 'No active downloads.',
    'queue.status.queued': 'Queued',
    'queue.status.downloading': 'Downloading',
    'queue.status.done': 'Done',
    'queue.status.error': 'Error',
    'queue.speed': 'Speed',
    'queue.eta': 'ETA',
    'queue.remove': 'Remove',

    // Files library
    'library.title': 'Downloaded Files',
    'library.empty': 'No files downloaded yet.',
    'library.download': 'Download to this PC',
    'library.delete': 'Delete',
    'library.size': 'Size',
    'library.date': 'Date',

    // Errors
    'error.url_required': 'Please enter a valid URL.',
    'error.fetch': 'Could not fetch information for this link.',
    'error.download': 'Failed to start the download.',

    // Toast
    'toast.download_queued': 'Download added to queue!',
    'toast.file_deleted': 'File deleted.',
    'toast.error': 'An error occurred.',
  },
};

let currentLang = 'pt-BR';

/**
 * Get a translated string by key.
 * @param {string} key
 * @returns {string}
 */
function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) ||
         (translations['pt-BR'][key]) ||
         key;
}

/**
 * Switch language and re-render all data-i18n elements.
 * @param {string} lang - 'pt-BR' | 'en'
 */
function setLang(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  document.documentElement.lang = lang;
  applyTranslations();
}

/**
 * Toggle between pt-BR and en.
 */
function toggleLang() {
  setLang(currentLang === 'pt-BR' ? 'en' : 'pt-BR');
}

/**
 * Apply translations to all elements with data-i18n attributes.
 */
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const text = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = text;
    } else {
      el.textContent = text;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

/**
 * Get the current language.
 * @returns {string}
 */
function getLang() {
  return currentLang;
}

window.i18n = { t, setLang, toggleLang, getLang, applyTranslations };
