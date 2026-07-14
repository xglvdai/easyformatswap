// PDF Converter — client-side only.
//  - PDF → Images : pdf.js (pdfjs-dist) renders each page to PNG
//  - PDF → Text   : pdf.js extracts text
//  - Images → PDF : pdf-lib combines images (jpg/png) into a PDF
// Note: full editable Word round-trip is NOT possible purely client-side; out of scope.
(function () {
  'use strict';

  const tabs = document.getElementById('modeTabs');
  const pdfPane = document.getElementById('pdfPane');
  const imgPane = document.getElementById('imgPane');
  const pdfUploader = document.getElementById('pdfUploader');
  const pdfInput = document.getElementById('pdfInput');
  const imgUploader = document.getElementById('imgUploader');
  const imgInput = document.getElementById('imgInput');
  const imgList = document.getElementById('imgList');
  const pdfScale = document.getElementById('pdfScale');
  const runBtn = document.getElementById('runBtn');
  const progress = document.getElementById('progress');
  const progressBar = progress.querySelector('span');
  const statusEl = document.getElementById('status');
  const results = document.getElementById('results');

  let mode = 'pdf2img';
  let pdfFile = null;
  let imgFiles = [];

  function setStatus(m, k) { statusEl.textContent = m; statusEl.className = 'status show ' + (k || 'info'); }

  // ---- tabs ----
  tabs.addEventListener('click', (e) => {
    const t = e.target.closest('.tab'); if (!t) return;
    mode = t.dataset.mode;
    [...tabs.children].forEach((c) => c.classList.toggle('active', c === t));
    pdfPane.classList.toggle('hidden', mode === 'img2pdf');
    imgPane.classList.toggle('hidden', mode !== 'img2pdf');
    results.innerHTML = '';
    statusEl.className = 'status';
  });

  // ---- pdf selection ----
  pdfUploader.addEventListener('click', () => pdfInput.click());
  pdfUploader.addEventListener('dragover', (e) => { e.preventDefault(); pdfUploader.classList.add('drag'); });
  pdfUploader.addEventListener('dragleave', () => pdfUploader.classList.remove('drag'));
  pdfUploader.addEventListener('drop', (e) => { e.preventDefault(); pdfUploader.classList.remove('drag'); pdfInput.files = e.dataTransfer.files; handlePdf(); });
  pdfInput.addEventListener('change', handlePdf);
  function handlePdf() {
    if (!pdfInput.files.length) return;
    pdfFile = pdfInput.files[0];
    pdfUploader.querySelector('.u-title').textContent = '✓ ' + pdfFile.name;
  }

  // ---- image selection ----
  imgUploader.addEventListener('click', () => imgInput.click());
  imgUploader.addEventListener('dragover', (e) => { e.preventDefault(); imgUploader.classList.add('drag'); });
  imgUploader.addEventListener('dragleave', () => imgUploader.classList.remove('drag'));
  imgUploader.addEventListener('drop', (e) => { e.preventDefault(); imgUploader.classList.remove('drag'); addImgs(e.dataTransfer.files); });
  imgInput.addEventListener('change', () => addImgs(imgInput.files));
  function addImgs(list) { [...list].forEach((f) => imgFiles.push(f)); renderImgs(); }
  function renderImgs() {
    imgList.innerHTML = '';
    imgFiles.forEach((f, i) => {
      const chip = document.createElement('div');
      chip.className = 'file-chip';
      chip.innerHTML = '<span class="fc-name">🖼️ ' + escapeHtml(f.name) + '</span><button data-i="' + i + '">✕</button>';
      chip.querySelector('button').addEventListener('click', () => { imgFiles.splice(i, 1); renderImgs(); });
      imgList.appendChild(chip);
    });
  }

  // ---- run ----
  runBtn.addEventListener('click', async () => {
    results.innerHTML = '';
    progress.classList.add('show'); progressBar.style.width = '0%';
    runBtn.disabled = true;
    try {
      if (mode === 'pdf2img') await pdfToImages();
      else if (mode === 'pdf2text') await pdfToText();
      else await imagesToPdf();
    } catch (err) {
      setStatus('Error: ' + err.message, 'err');
    } finally {
      runBtn.disabled = false;
    }
  });

  // ===== PDF → Images (pdf.js) =====
  async function pdfToImages() {
    if (!pdfFile) { setStatus('Please add a PDF file.', 'err'); return; }
    const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
    setStatus('Reading PDF…', 'info');
    const buf = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const scale = Math.max(1, Math.min(4, parseFloat(pdfScale.value) || 2));
    const zip = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      zip.push({ name: 'page-' + p + '.png', url: URL.createObjectURL(blob), blob });
      progressBar.style.width = Math.round((p / pdf.numPages) * 100) + '%';
    }
    setStatus('Done — ' + zip.length + ' page(s) rendered.', 'ok');
    renderDownloads(zip);
  }

  // ===== PDF → Text (pdf.js) =====
  async function pdfToText() {
    if (!pdfFile) { setStatus('Please add a PDF file.', 'err'); return; }
    const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
    setStatus('Extracting text…', 'info');
    const buf = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let text = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      text += '— Page ' + p + ' —\n' + content.items.map((i) => i.str).join(' ') + '\n\n';
      progressBar.style.width = Math.round((p / pdf.numPages) * 100) + '%';
    }
    const blob = new Blob([text], { type: 'text/plain' });
    setStatus('Done — text extracted.', 'ok');
    const card = document.createElement('div');
    card.className = 'result-preview';
    card.innerHTML = '<strong>Extracted text</strong><textarea readonly style="width:100%;height:200px;margin-top:10px;font-family:inherit">' +
      escapeHtml(text) + '</textarea><div class="row" style="margin-top:10px">' +
      '<a class="btn btn-primary" download="extracted.txt" href="' + URL.createObjectURL(blob) + '">Download .txt</a></div>';
    results.appendChild(card);
  }

  // ===== Images → PDF (pdf-lib) =====
  async function imagesToPdf() {
    if (!imgFiles.length) { setStatus('Please add at least one image.', 'err'); return; }
    if (typeof PDFLib === 'undefined') throw new Error('PDF library failed to load.');
    const { PDFDocument } = PDFLib;
    setStatus('Building PDF…', 'info');
    const doc = await PDFDocument.create();
    for (let i = 0; i < imgFiles.length; i++) {
      const f = imgFiles[i];
      const bytes = await f.arrayBuffer();
      let img;
      if ((f.type === 'image/png') || f.name.toLowerCase().endsWith('.png')) img = await doc.embedPng(bytes);
      else img = await doc.embedJpg(bytes);
      const page = doc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      progressBar.style.width = Math.round(((i + 1) / imgFiles.length) * 100) + '%';
    }
    const out = await doc.save();
    const blob = new Blob([out], { type: 'application/pdf' });
    setStatus('Done — PDF created with ' + imgFiles.length + ' page(s).', 'ok');
    const card = document.createElement('div');
    card.className = 'result-preview';
    card.innerHTML = '<strong>combined.pdf</strong><div class="row" style="margin-top:10px">' +
      '<a class="btn btn-primary" download="combined.pdf" href="' + URL.createObjectURL(blob) + '">Download PDF</a></div>';
    results.appendChild(card);
  }

  function renderDownloads(items) {
    items.forEach((it) => {
      const card = document.createElement('div');
      card.className = 'result-preview';
      card.innerHTML =
        '<div class="row between"><strong>' + escapeHtml(it.name) + '</strong>' +
        '<span class="muted">' + formatBytes(it.blob.size) + '</span></div>' +
        '<img src="' + it.url + '" alt="" style="max-height:160px;margin:10px 0;border-radius:8px" />' +
        '<div class="row"><a class="btn btn-primary" download="' + escapeHtml(it.name) + '" href="' + it.url + '">Download</a></div>';
      results.appendChild(card);
    });
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
