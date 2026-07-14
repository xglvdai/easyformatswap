// Compress Tool — images (browser-image-compression) and PDFs (pdf-lib re-save, lossless-ish).
// Fully client-side.
(function () {
  'use strict';

  const cTabs = document.getElementById('cTabs');
  const uploader = document.getElementById('uploader');
  const fileInput = document.getElementById('fileInput');
  const uSub = document.getElementById('uSub');
  const fileList = document.getElementById('fileList');
  const level = document.getElementById('level');
  const levelVal = document.getElementById('levelVal');
  const runBtn = document.getElementById('runBtn');
  const progress = document.getElementById('progress');
  const progressBar = progress.querySelector('span');
  const statusEl = document.getElementById('status');
  const results = document.getElementById('results');

  let kind = 'image';
  let files = [];

  function setStatus(m, k) { statusEl.textContent = m; statusEl.className = 'status show ' + (k || 'info'); }

  cTabs.addEventListener('click', (e) => {
    const t = e.target.closest('.tab'); if (!t) return;
    kind = t.dataset.kind;
    [...cTabs.children].forEach((c) => c.classList.toggle('active', c === t));
    fileInput.accept = kind === 'pdf' ? 'application/pdf' : 'image/*';
    uSub.textContent = 'or click to browse · ' + (kind === 'pdf' ? 'PDF' : 'images');
    files = []; renderList(); results.innerHTML = '';
  });

  uploader.addEventListener('click', () => fileInput.click());
  uploader.addEventListener('dragover', (e) => { e.preventDefault(); uploader.classList.add('drag'); });
  uploader.addEventListener('dragleave', () => uploader.classList.remove('drag'));
  uploader.addEventListener('drop', (e) => { e.preventDefault(); uploader.classList.remove('drag'); addFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', () => addFiles(fileInput.files));
  level.addEventListener('input', () => (levelVal.textContent = level.value + '%'));

  function addFiles(list) { [...list].forEach((f) => files.push(f)); renderList(); }
  function renderList() {
    fileList.innerHTML = '';
    files.forEach((f, i) => {
      const chip = document.createElement('div');
      chip.className = 'file-chip';
      chip.innerHTML = '<span class="fc-name">' + (kind === 'pdf' ? '📄' : '🖼️') + ' ' + escapeHtml(f.name) +
        ' · ' + formatBytes(f.size) + '</span><button data-i="' + i + '">✕</button>';
      chip.querySelector('button').addEventListener('click', () => { files.splice(i, 1); renderList(); });
      fileList.appendChild(chip);
    });
  }

  runBtn.addEventListener('click', async () => {
    if (!files.length) { setStatus('Please add a file.', 'err'); return; }
    runBtn.disabled = true; progress.classList.add('show'); progressBar.style.width = '0%';
    results.innerHTML = '';
    try {
      for (let i = 0; i < files.length; i++) {
        if (kind === 'pdf') await compressPdf(files[i], i, files.length);
        else await compressImage(files[i], i, files.length);
        progressBar.style.width = Math.round(((i + 1) / files.length) * 100) + '%';
      }
      setStatus('Done!', 'ok');
    } catch (err) {
      setStatus('Error: ' + err.message, 'err');
    } finally { runBtn.disabled = false; }
  });

  async function compressImage(f, i, n) {
    if (typeof imageCompression === 'undefined') throw new Error('Compression library failed to load.');
    const q = parseInt(level.value, 10) / 100;
    const out = await imageCompression(f, { initialQuality: q, useWebWorker: true });
    const url = URL.createObjectURL(out);
    renderResult(f.name, url, out, f.size);
  }

  async function compressPdf(f, i, n) {
    if (typeof PDFLib === 'undefined') throw new Error('PDF library failed to load.');
    const { PDFDocument } = PDFLib;
    const bytes = await f.arrayBuffer();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    // Re-save; pdf-lib does not do lossy image re-encode, so this is a modest structural shrink.
    const out = await doc.save();
    const blob = new Blob([out], { type: 'application/pdf' });
    renderResult(f.name.replace(/\.pdf$/i, '') + '-compressed.pdf', URL.createObjectURL(blob), blob, f.size);
  }

  function renderResult(name, url, blob, orig) {
    const saved = orig ? Math.max(0, Math.round((1 - blob.size / orig) * 100)) : 0;
    const card = document.createElement('div');
    card.className = 'result-preview';
    card.innerHTML =
      '<div class="row between"><strong>' + escapeHtml(name) + '</strong>' +
      '<span class="muted">' + formatBytes(blob.size) + (saved > 0 ? ' · −' + saved + '%' : '') + '</span></div>' +
      '<div class="row" style="margin-top:10px"><a class="btn btn-primary" download="' + escapeHtml(name) + '" href="' + url + '">Download</a></div>';
    results.appendChild(card);
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
})();
