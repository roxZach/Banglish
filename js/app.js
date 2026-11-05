(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const micBtn = $('micBtn'), fab = $('fab'), statusEl = $('status'), micStage = $('micStage');
  const bangla = $('bangla'), interimEl = $('interim'), output = $('output'), examplesEl = $('examples');
  const copyBtn = $('copyBtn'), shareBtn = $('shareBtn'), clearBtn = $('clearBtn');
  const editor = $('editor'), editorSrc = $('editorSrc'), editorInput = $('editorInput');
  const drawer = $('drawer');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ============================================================ storage

  function load(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
  }

  const opts = load('banglish.opts', { bhAsV: false, phForF: false, shForS: false });
  const userDict = load('banglish.userDict', {});
  const ai = load('banglish.ai', { enabled: false, key: '', model: 'claude-opus-5-5' });
  let lang = load('banglish.lang', 'bn-BD');
  bangla.value = load('banglish.draft', '');

  // ============================================================ toast

  let toastTimer;
  function toast(message, isError) {
    const el = $('toast');
    el.textContent = message;
    el.classList.toggle('error', !!isError);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), isError ? 4200 : 1800);
  }

  // ============================================================ AI mode

  const aiCache = new Map();    // cache key → Banglish from Claude
  const aiPending = new Set();
  const aiFailed = new Set();   // don't retry a failing sentence on every keystroke
  let aiTimer;

  const aiReady = () => !!window.BanglishAI;
  const aiActive = () => ai.enabled && !!ai.key && aiReady();
  const aiKey = sentence => `${ai.model}|${opts.bhAsV}${opts.phForF}${opts.shForS}|${sentence}`;
  const hasBangla = s => /[ঀ-৿]/.test(s);

  function scheduleAI(delay) {
    if (!aiActive()) return;
    clearTimeout(aiTimer);
    aiTimer = setTimeout(runAI, delay);
  }

  function runAI() {
    if (!aiActive()) return;
    const sentences = Banglish.segments(bangla.value).map(s => s.trim()).filter(hasBangla);
    for (const s of sentences) {
      const key = aiKey(s);
      if (aiCache.has(key) || aiPending.has(key) || aiFailed.has(key)) continue;
      if (aiPending.size >= 3) break;
      aiPending.add(key);
      window.BanglishAI.convertSentence(s, { apiKey: ai.key, model: ai.model, opts, userDict })
        .then(out => aiCache.set(key, out))
        .catch(err => { aiFailed.add(key); toast(err.message, true); })
        .finally(() => { aiPending.delete(key); render(); scheduleAI(30); });
    }
    render();
  }

  // ============================================================ rendering

  let plainOutput = '';
  let interimText = '';
  let lastPieces = [];   // what each word/segment showed last render, to animate only changes

  function render() {
    const text = bangla.value;
    const pieces = [];
    const frag = document.createDocumentFragment();
    let plain = '';
    let enterCount = 0;

    const markNew = (el, signature) => {
      const i = pieces.length;
      pieces.push(signature);
      if (!reduceMotion && lastPieces[i] !== signature) {
        el.classList.add('enter');
        el.style.setProperty('--i', Math.min(enterCount++, 12));
      }
    };

    for (const seg of Banglish.segments(text)) {
      const sentence = seg.trim();
      const key = aiKey(sentence);
      const lead = seg.slice(0, seg.length - seg.trimStart().length);
      const trail = seg.slice(seg.trimEnd().length);

      if (aiActive() && hasBangla(sentence) && aiCache.has(key)) {
        const out = aiCache.get(key);
        const span = document.createElement('span');
        span.className = 'seg-ai';
        span.title = 'Converted by AI: ' + sentence;
        span.textContent = out;
        markNew(span, 'ai:' + out);
        frag.append(lead, span, trail);
        plain += lead + out + trail;
        continue;
      }

      const holder = aiActive() && hasBangla(sentence) ? document.createElement('span') : frag;
      if (holder !== frag) holder.className = 'seg-pending';
      for (const t of Banglish.convert(seg, opts, userDict)) {
        plain += t.out;
        if (!t.word) { holder.append(t.out); continue; }
        const span = document.createElement('span');
        span.className = 'w' + (t.source === 'user' ? ' custom' : t.english ? ' en' : '');
        span.textContent = t.out;
        span.dataset.src = t.src;
        span.title = t.src;
        markNew(span, t.out);
        holder.append(span);
      }
      if (holder !== frag) frag.append(holder);
    }

    if (interimText) {
      const pending = document.createElement('span');
      pending.className = 'w pending';
      pending.textContent = (plain && !/\s$/.test(plain) ? ' ' : '') + Banglish.transliterate(interimText, opts, userDict);
      frag.append(pending);
    }

    output.replaceChildren(frag);
    lastPieces = pieces;
    plainOutput = plain;
    output.classList.toggle('empty', !plain.trim() && !interimText);
    examplesEl.hidden = !!text.trim() || !!interimText;
    interimEl.textContent = interimText;
    save('banglish.draft', text);
  }

  // ============================================================ examples

  const EXAMPLES = [
    'আজকে অফিসে একটা ইম্পর্ট্যান্ট মিটিং আছে',
    'ব্রো জাস্ট ওয়েট কর, আমি আসছি',
    'আমি তোমাকে অনেক ভালোবাসি',
    'প্রজেক্টটা ডেডলাইনের আগে সাবমিট করতে হবে',
  ];
  EXAMPLES.forEach((ex, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.lang = 'bn';
    chip.style.setProperty('--i', i);
    chip.textContent = ex;
    chip.addEventListener('click', () => { bangla.value = ex; render(); scheduleAI(100); });
    examplesEl.appendChild(chip);
  });

  // ============================================================ speech

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.classList.toggle('error', kind === 'error');
    statusEl.classList.toggle('live', kind === 'live');
  }

  function updateMicUi() {
    document.body.classList.toggle('listening', listening);
    for (const b of [micBtn, fab]) {
      b.setAttribute('aria-pressed', String(listening));
      b.setAttribute('aria-label', listening ? 'Stop listening' : 'Start listening');
    }
    if (listening) setStatus('Listening… speak Bangla, English words are fine too', 'live');
    else if (!statusEl.classList.contains('error')) setStatus('Tap the mic and start talking');
  }

  function appendFinal(text) {
    text = text.trim();
    if (!text) return;
    const cur = bangla.value;
    bangla.value = cur + (cur && !/\s$/.test(cur) ? ' ' : '') + text;
    bangla.scrollTop = bangla.scrollHeight;
    // each spoken phrase is its own sentence for AI mode
    if (aiActive() && !/[।?!.]$/.test(bangla.value)) bangla.value += '।';
    scheduleAI(150);
  }

  const SPEECH_ERRORS = {
    'not-allowed': 'Microphone access was blocked. Allow it from the address bar and try again.',
    'service-not-allowed': 'Microphone access was blocked. Allow it from the address bar and try again.',
    'audio-capture': 'No microphone found.',
    'language-not-supported': 'This browser does not support Bangla speech recognition.',
    // Chromium-based browsers other than Chrome/Edge (Brave, Opera, Vivaldi,
    // in-app previews) expose the API but have no speech service behind it.
    'network': navigator.brave
      ? "Brave doesn't include a speech service. Open this page in Google Chrome or Microsoft Edge."
      : "Couldn't reach the speech service. Use Google Chrome or Microsoft Edge (not Brave, Opera or an app's built-in browser), and check that a VPN or firewall isn't blocking Google.",
  };

  function startListening() {
    recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) appendFinal(r[0].transcript);
        else interim += r[0].transcript;
      }
      interimText = interim.trim();
      render();
    };

    recognition.onerror = e => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      listening = false;
      setStatus(SPEECH_ERRORS[e.error] || `Speech error: ${e.error}`, 'error');
      stopViz();
      updateMicUi();
    };

    // Chrome ends the session after a pause; keep going until the user stops.
    recognition.onend = () => {
      if (interimText) { appendFinal(interimText); interimText = ''; render(); }
      if (listening) {
        try { recognition.start(); } catch { listening = false; stopViz(); updateMicUi(); }
      } else {
        updateMicUi();
      }
    };

    statusEl.classList.remove('error');
    listening = true;
    recognition.start();
    updateMicUi();
    startViz();
  }

  function stopListening() {
    listening = false;
    if (recognition) recognition.stop();
    stopViz();
    updateMicUi();
  }

  function toggleListening() {
    if (!SpeechRecognition) return toast('Voice input needs Chrome or Edge.', true);
    listening ? stopListening() : startListening();
  }

  if (SpeechRecognition) {
    micBtn.addEventListener('click', toggleListening);
    fab.addEventListener('click', toggleListening);
  } else {
    micBtn.disabled = true;
    fab.disabled = true;
    setStatus('Voice input needs Chrome or Edge. You can still type or paste Bangla.', 'error');
  }

  // Space toggles the mic when you're not typing somewhere
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest('input, textarea, select, button, [contenteditable]') || !drawer.hidden || !editor.hidden) return;
    e.preventDefault();
    toggleListening();
  });

  // ============================================================ voice visualizer

  const canvas = $('viz');
  const ctx = canvas.getContext('2d');
  // Phones often can't share the mic between speech recognition and audio
  // capture, so they get the CSS ripple only.
  const canVisualize = !matchMedia('(pointer: coarse)').matches && !!navigator.mediaDevices;
  let audioCtx = null, analyser = null, micStream = null, freq = null;
  let level = 0;

  async function startViz() {
    if (!canVisualize) return;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!listening) return stopViz();
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      audioCtx.createMediaStreamSource(micStream).connect(analyser);
      freq = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      analyser = null;
    }
  }

  function stopViz() {
    if (micStream) micStream.getTracks().forEach(t => t.stop());
    if (audioCtx) audioCtx.close().catch(() => {});
    micStream = audioCtx = analyser = null;
  }

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = canvas.clientWidth;
    canvas.width = canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  // theme colours, re-read only when the theme or listening state changes
  let colorKey = '', colors = [];
  function vizColors() {
    const key = document.documentElement.dataset.theme + listening;
    if (key !== colorKey) {
      const css = getComputedStyle(document.documentElement);
      const get = name => css.getPropertyValue(name).trim();
      colors = listening ? [get('--hot'), get('--hot-2')] : [get('--brand-2'), get('--brand')];
      colorKey = key;
    }
    return colors;
  }

  const BARS = 72;
  function draw(time) {
    const size = canvas.clientWidth;
    const c = size / 2;
    const inner = 66;
    const maxLen = c - inner - 6;
    const [colorA, colorB] = vizColors();

    ctx.clearRect(0, 0, size, size);
    let sum = 0;
    if (analyser) analyser.getByteFrequencyData(freq);

    for (let i = 0; i < BARS; i++) {
      const angle = (i / BARS) * Math.PI * 2 - Math.PI / 2;
      let v;
      if (analyser) {
        // mirror the speech range around the circle
        const half = BARS / 2;
        const bin = Math.floor(((i < half ? i : BARS - i) / half) * 48) + 2;
        v = freq[bin] / 255;
        sum += v;
      } else {
        // idle breathing wave (faster while waiting for speech)
        const speed = listening ? 0.004 : 0.0016;
        v = 0.12 + 0.1 * Math.sin(time * speed + i * 0.45) * Math.sin(time * speed * 0.6 + i * 0.13);
        if (listening) v += 0.08;
      }
      const len = 4 + Math.max(0, v) * maxLen;
      const x1 = c + Math.cos(angle) * inner, y1 = c + Math.sin(angle) * inner;
      const x2 = c + Math.cos(angle) * (inner + len), y2 = c + Math.sin(angle) * (inner + len);
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, colorA);
      grad.addColorStop(1, colorB);
      ctx.strokeStyle = grad;
      ctx.globalAlpha = 0.35 + Math.min(1, v * 1.4) * 0.65;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const target = analyser ? Math.min(1, (sum / BARS) * 2.2) : 0;
    level += (target - level) * 0.25;
    micStage.style.setProperty('--level', level.toFixed(3));
    if (!reduceMotion) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // ============================================================ accent switch

  const accent = document.querySelector('.accent-switch');
  const segs = [...accent.querySelectorAll('.seg')];
  function setLang(value) {
    lang = value;
    save('banglish.lang', lang);
    segs.forEach((b, i) => {
      const on = b.dataset.lang === lang;
      b.setAttribute('aria-checked', String(on));
      if (on) accent.dataset.active = i;
    });
  }
  segs.forEach(b => b.addEventListener('click', () => {
    setLang(b.dataset.lang);
    if (listening) { stopListening(); startListening(); }
  }));
  setLang(lang);

  // ============================================================ text & buttons

  bangla.addEventListener('input', () => { render(); scheduleAI(900); });

  clearBtn.addEventListener('click', () => {
    bangla.value = '';
    interimText = '';
    render();
    bangla.focus();
  });

  copyBtn.addEventListener('click', async () => {
    const text = plainOutput.trim();
    if (!text) return toast('Nothing to copy yet');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const tmp = document.createElement('textarea');
      tmp.value = text;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      tmp.remove();
    }
    copyBtn.classList.add('done');
    copyBtn.querySelector('span').textContent = 'Copied';
    toast('Copied! Paste it anywhere.');
    setTimeout(() => {
      copyBtn.classList.remove('done');
      copyBtn.querySelector('span').textContent = 'Copy';
    }, 1600);
  });

  if (navigator.share) {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', () => {
      const text = plainOutput.trim();
      if (text) navigator.share({ text }).catch(() => {});
    });
  }

  // floating mic once the big one scrolls out of view
  new IntersectionObserver(([entry]) => fab.classList.toggle('show', !entry.isIntersecting), { threshold: 0.2 })
    .observe(micStage);

  // ============================================================ theme

  $('themeBtn').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]').content = next === 'dark' ? '#050c09' : '#eef5f1';
    save('banglish.theme', next);
  });

  // ============================================================ custom words

  let editingSrc = null;

  function openEditor(span) {
    editingSrc = span.dataset.src;
    editorSrc.textContent = editingSrc;
    editorInput.value = span.textContent;
    $('editorReset').hidden = !(editingSrc in userDict);
    editor.hidden = false;

    const r = span.getBoundingClientRect();
    const width = editor.offsetWidth;
    const maxLeft = window.scrollX + document.documentElement.clientWidth - width - 12;
    editor.style.left = Math.max(12, Math.min(r.left + window.scrollX + r.width / 2 - width / 2, maxLeft)) + 'px';
    editor.style.top = (r.bottom + window.scrollY + 8) + 'px';
    editorInput.focus();
    editorInput.select();
  }

  function closeEditor() {
    editor.hidden = true;
    editingSrc = null;
  }

  function saveWord(src, value) {
    value = value.trim();
    if (value) userDict[src] = value;
    else delete userDict[src];
    save('banglish.userDict', userDict);
    // sentences containing this word need a fresh AI pass with the new spelling
    for (const key of [...aiCache.keys()]) if (key.includes(src)) aiCache.delete(key);
    aiFailed.clear();
    renderWords();
    render();
    scheduleAI(100);
  }

  output.addEventListener('click', e => {
    const span = e.target.closest('.w');
    if (span && !span.classList.contains('pending')) openEditor(span);
  });

  $('editorSave').addEventListener('click', () => {
    saveWord(editingSrc, editorInput.value);
    closeEditor();
    toast('Saved. Used from now on.');
  });
  $('editorReset').addEventListener('click', () => { saveWord(editingSrc, ''); closeEditor(); });
  editorInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { saveWord(editingSrc, editorInput.value); closeEditor(); }
    if (e.key === 'Escape') closeEditor();
  });
  document.addEventListener('mousedown', e => {
    if (!editor.hidden && !editor.contains(e.target) && !e.target.closest('.w')) closeEditor();
  });

  function renderWords() {
    const list = $('wordsList');
    const entries = Object.entries(userDict).sort((a, b) => a[0].localeCompare(b[0], 'bn'));
    $('wordsCount').textContent = entries.length || '';
    $('wordsEmpty').hidden = entries.length > 0;
    list.textContent = '';
    for (const [bn, en] of entries) {
      const li = document.createElement('li');
      const b = document.createElement('span'); b.className = 'bn'; b.textContent = bn;
      const a = document.createElement('span'); a.className = 'arrow'; a.textContent = '→';
      const l = document.createElement('span'); l.className = 'en'; l.textContent = en;
      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = '×';
      del.setAttribute('aria-label', `Remove ${bn}`);
      del.addEventListener('click', () => saveWord(bn, ''));
      li.append(b, a, l, del);
      list.appendChild(li);
    }
  }

  // ============================================================ settings drawer

  let lastFocus = null;
  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('open'));
    setTimeout(() => drawer.querySelector('.drawer-panel [data-close]').focus(), 50);
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    setTimeout(() => { drawer.hidden = true; }, reduceMotion ? 0 : 450);
    if (lastFocus) lastFocus.focus();
  }
  $('settingsBtn').addEventListener('click', openDrawer);
  $('modeBadge').addEventListener('click', openDrawer);
  drawer.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeDrawer));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) closeDrawer(); });

  // spelling style
  for (const [id, key] of [['optV', 'bhAsV'], ['optPh', 'phForF'], ['optSh', 'shForS']]) {
    const box = $(id);
    box.checked = !!opts[key];
    box.addEventListener('change', () => {
      opts[key] = box.checked;
      save('banglish.opts', opts);
      render();
      scheduleAI(300);
    });
  }

  // AI settings
  const aiEnabled = $('aiEnabled'), aiKeyInput = $('aiKey'), aiModel = $('aiModel'), aiStatus = $('aiStatus');

  function updateAiUi() {
    const on = aiActive();
    document.body.classList.toggle('ai-on', on);
    $('modeBadge').classList.toggle('ai', on);
    $('modeText').textContent = on ? 'AI mode' : 'Offline mode';
    aiEnabled.checked = ai.enabled;
    if (!aiReady()) aiStatus.textContent = 'Loading… (needs internet)';
    else if (!ai.key) aiStatus.textContent = 'Add an API key to turn this on';
    else aiStatus.textContent = ai.enabled ? 'On: sentences are polished by Claude' : 'Off: using the built-in converter';
  }

  function saveAi() {
    save('banglish.ai', ai);
    updateAiUi();
    render();
    scheduleAI(100);
  }

  function fillModels() {
    if (!aiReady() || aiModel.options.length) return;
    for (const m of window.BanglishAI.MODELS) aiModel.add(new Option(m.label, m.id));
    aiModel.value = ai.model;
  }

  aiKeyInput.value = ai.key;
  aiEnabled.addEventListener('change', () => {
    if (aiEnabled.checked && !aiKeyInput.value.trim()) {
      aiEnabled.checked = false;
      aiKeyInput.focus();
      return toast('Paste your Anthropic API key first', true);
    }
    ai.enabled = aiEnabled.checked;
    aiFailed.clear();
    saveAi();
  });
  aiKeyInput.addEventListener('change', () => {
    ai.key = aiKeyInput.value.trim();
    if (ai.key && !ai.enabled) ai.enabled = true;
    aiFailed.clear();
    saveAi();
  });
  $('aiKeyToggle').addEventListener('click', e => {
    const show = aiKeyInput.type === 'password';
    aiKeyInput.type = show ? 'text' : 'password';
    e.currentTarget.textContent = show ? 'Hide' : 'Show';
  });
  aiModel.addEventListener('change', () => { ai.model = aiModel.value; aiFailed.clear(); saveAi(); });

  window.addEventListener('banglish-ai-ready', () => { fillModels(); updateAiUi(); render(); scheduleAI(100); });
  fillModels();

  // ============================================================ start

  renderWords();
  updateAiUi();
  render();
  scheduleAI(300);
})();
