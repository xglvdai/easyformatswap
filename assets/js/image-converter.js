// Image Converter — JPG/PNG/WebP/HEIC convert + resize/compress.
// Runs fully in the browser. HEIC is decoded via libheif (global `libheif`).
(function () {
  'use strict';

  const uploader = document.getElementById('uploader');
  const fileInput = document.getElementById('fileInput');
  const fileList = document.getElementById('fileList');
  const formatSel = document.getElementById('format');
  const quality = document.getElementById('quality');
  const qualityVal = document.getElementById('qualityVal');
  const maxDim = document.getElementById('maxDim');
  const convertBtn = document.getElementById('convertBtn');
  const progress = document.getElementById('progress');
  const progressBar = progress.querySelector('span');
  const statusEl = document.getElementById('status');
  const results = document.getElementById('results');

  let files = [];

  const extOf = (mime) =>
    ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[mime] || 'img');

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = 'status show ' + (kind || 'info');
  }

  // ---- file selection ----
  uploader.addEventListener('click', () => fileInput.click());
  uploader.addEventListener('dragover', (e) => { e.preventDefault(); uploader.classList.add('drag'); });
  uploader.addEventListener('dragleave', () => uploader.classList.remove('drag'));
  uploader.addEventListener('drop', (e) => {
    e.preventDefault(); uploader.classList.remove('drag');
    addFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', () => addFiles(fileInput.files));

  function addFiles(list) {
    [...list].forEach((f) => files.push(f));
    renderList();
  }
  function renderList() {
    fileList.innerHTML = '';
    files.forEach((f, i) => {
      const chip = document.createElement('div');
      chip.className = 'file-chip';
      chip.innerHTML =
        '<span class="fc-name">🖼️ ' + escapeHtml(f.name) + ' · ' + formatBytes(f.size) + '</span>' +
        '<button data-i="' + i + '" aria-label="Remove">✕</button>';
      chip.querySelector('button').addEventListener('click', () => {
        files.splice(i, 1); renderList();
      });
      fileList.appendChild(chip);
    });
  }

  quality.addEventListener('input', () => (qualityVal.textContent = quality.value + '%'));

  // ---- decode to a bitmap (ImageBitmap / HTMLImageElement) ----
  async function decodeToBitmap(file) {
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.heic') || name.endsWith('.heif')) {
      return decodeHeic(file);
    }
    const bmp = await createImageBitmap(file);
    return bmp;
  }

  function decodeHeic(file) {
    return new Promise((resolve, reject) => {
      if (typeof libheif === 'undefined') {
        return reject(new Error('HEIC decoder failed to load. Try a JPG/PNG/WebP file.'));
      }
      const reader = new FileReader();
      reader.onload = () => {
        const data = new Uint8Array(reader.result);
        const decoder = new libheif.HeifDecoder();
        const images = decoder.decode(data);
        if (!images || !images.length) return reject(new Error('Could not read HEIC file.'));
        images[0].display((displayData) => {
          const canvas = document.createElement('canvas');
          canvas.width = displayData.width;
          canvas.height = displayData.height;
          const ctx = canvas.getContext('2d');
          const imgData = ctx.createImageData(displayData.width, displayData.height);
          imgData.data.set(displayData.data);
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas);
        });
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsArrayBuffer(file);
    });
  }

  function scaleBitmap(src, maxDimVal) {
    let w = src.width, h = src.height;
    if (maxDimVal && Math.max(w, h) > maxDimVal) {
      const r = maxDimVal / Math.max(w, h);
      w = Math.round(w * r); h = Math.round(h * r);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(src, 0, 0, w, h);
    return canvas;
  }

  async function canvasToBlob(canvas, mime, q) {
    return new Promise((res) => canvas.toBlob(res, mime, q));
  }

  // ---- convert ----
  convertBtn.addEventListener('click', async () => {
    if (!files.length) { setStatus('Please add at least one image.', 'err'); return; }
    const mime = formatSel.value;
    const q = parseInt(quality.value, 10) / 100;
    const dim = parseInt(maxDim.value, 10) || 0;

    convertBtn.disabled = true;
    results.innerHTML = '';
    progress.classList.add('show');
    progressBar.style.width = '0%';
    setStatus('Converting ' + files.length + ' image(s)…', 'info');

    try {
      for (let i = 0; i < files.length; i++) {
        const src = await decodeToBitmap(files[i]);
        const canvas = scaleBitmap(src, dim);
        let blob = await canvasToBlob(canvas, mime, mime === 'image/png' ? undefined : q);

        // Optional extra compression pass for jpg/webp
        if (mime !== 'image/png' && typeof imageCompression !== 'undefined') {
          try {
            const out = await imageCompression(new File([blob], 'x.' + extOf(mime), { type: mime }), {
              fileType: mime, initialQuality: q, useWebWorker: true,
            });
            blob = out;
          } catch (_) { /* keep canvas blob */ }
        }

        const url = URL.createObjectURL(blob);
        const base = (files[i].name || 'image').replace(/\.[^.]+$/, '');
        const outName = base + '.' + extOf(mime);
        renderResult(outName, url, blob, files[i].size);
        progressBar.style.width = Math.round(((i + 1) / files.length) * 100) + '%';
      }
      setStatus('Done! Your files are ready to download.', 'ok');
    } catch (err) {
      setStatus('Error: ' + err.message, 'err');
    } finally {
      convertBtn.disabled = false;
    }
  });

  function renderResult(name, url, blob, origSize) {
    const card = document.createElement('div');
    card.className = 'result-preview';
    const saved = origSize ? Math.max(0, Math.round((1 - blob.size / origSize) * 100)) : 0;
    card.innerHTML =
      '<div class="row between"><strong>' + escapeHtml(name) + '</strong>' +
      '<span class="muted">' + formatBytes(blob.size) +
      (saved > 0 ? ' · −' + saved + '%' : '') + '</span></div>' +
      '<div class="row" style="margin-top:10px"><a class="btn btn-primary" download="' + escapeHtml(name) + '" href="' + url + '">Download</a></div>';
    results.appendChild(card);
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
})();
