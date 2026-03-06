/**
 * Cache Monitor Admin — Client-side Logic
 * Loaded as a static file to bypass express-ejs-layouts extractScripts.
 */

// ─── Config ──────────────────────────────────────────
var CACHE_INTERVAL = 5000;
var MAX_KEYS  = { hot: 30, warm: 100, cold: 100 };
var TIER_COLORS = { hot: '#f87171', warm: '#facc15', cold: '#60a5fa' };

// ─── State ───────────────────────────────────────────
var autoRefresh  = true;
var refreshTimer = null;
var toastTimeout = null;
var keysVisible  = { hot: false, warm: false, cold: false };
var tierKeys = { hot: [], warm: [], cold: [] };

// ─── Toggle UI ───────────────────────────────────────
function setToggleUI(on) {
  var track  = document.getElementById('toggleTrack');
  var thumb  = document.getElementById('toggleThumb');
  var status = document.getElementById('autoRefreshStatus');
  if (track)  track.style.background = on ? '#0d87ff' : '#1e293b';
  if (thumb)  thumb.style.transform  = on ? 'translateX(20px)' : 'translateX(0px)';
  if (status) status.textContent = on ? 'Auto-refresh ON (5s)' : 'Auto-refresh OFF';
}

// ─── Timer ───────────────────────────────────────────
function startTimer() {
  stopTimer();
  refreshTimer = setInterval(refreshStats, CACHE_INTERVAL);
}
function stopTimer() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
}

// ─── Fetch & Render stats ────────────────────────────
async function refreshStats() {
  var icon = document.getElementById('refreshIcon');
  if (icon) icon.classList.add('is-spinning');
  try {
    var resp = await fetch('/admin/cache/stats');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var json = await resp.json();
    if (!json.success) throw new Error(json.error || 'Unknown error');
    applyStats(json.data);
  } catch (err) {
    console.error('[Cache Monitor]', err.message);
  } finally {
    if (icon) icon.classList.remove('is-spinning');
  }
}

function applyStats(d) {
  // Overview cards
  setText('stat-totalKeys',   d.overall.totalKeys);
  setText('stat-totalHits',   d.overall.totalHits.toLocaleString());
  setText('stat-totalMisses', d.overall.totalMisses.toLocaleString());
  var hitEl = document.getElementById('stat-hitRate');
  if (hitEl) {
    hitEl.textContent = d.overall.hitRate;
    var p = parseFloat(d.overall.hitRate);
    hitEl.style.color = p >= 70 ? '#4ade80' : p >= 40 ? '#facc15' : '#f87171';
  }

  // Memory section
  if (d.memory) {
    setText('mem-heapUsed',  d.memory.heapUsed  + ' MB');
    setText('mem-heapTotal', d.memory.heapTotal + ' MB');
    setText('mem-rss',       d.memory.rss       + ' MB');
    setText('mem-external',  d.memory.external  + ' MB');
    var pct = Math.min(Math.round((d.memory.heapUsed / d.memory.heapTotal) * 100), 100);
    setText('mem-pct', pct + '%');
    var bar = document.getElementById('mem-bar');
    if (bar) {
      bar.style.width           = pct + '%';
      bar.style.backgroundColor = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#0d87ff';
    }
  }

  // Per-tier cards
  ['hot', 'warm', 'cold'].forEach(function (t) {
    var td     = d.tiers[t];
    var max    = MAX_KEYS[t];
    var rate   = (td.hits + td.misses) > 0
      ? ((td.hits / (td.hits + td.misses)) * 100).toFixed(1) : '0.0';
    var fillPct = Math.min(Math.round((td.keys / max) * 100), 100);

    setText(t + '-keys',    td.keys + ' / ' + max);
    setText(t + '-hits',    td.hits.toLocaleString());
    setText(t + '-misses',  td.misses.toLocaleString());
    setText(t + '-rate',    rate + '%');
    setText(t + '-fillpct', fillPct + '%');

    var rBar = document.getElementById(t + '-ratebar');
    if (rBar) rBar.style.width = rate + '%';

    var fBar = document.getElementById(t + '-fillbar');
    if (fBar) {
      fBar.style.width           = fillPct + '%';
      fBar.style.backgroundColor = fillPct > 80 ? '#ef4444' : fillPct > 50 ? '#f59e0b' : '#0d87ff';
    }
  });

  // Health badge
  updateHealthBadge(d.health);

  // Key lists
  tierKeys = d.tierKeys || { hot: [], warm: [], cold: [] };
  ['hot', 'warm', 'cold'].forEach(function (t) {
    if (keysVisible[t]) renderKeys(t);
  });

  setText('lastUpdated', new Date().toLocaleTimeString());
}

// ─── Health Badge ────────────────────────────────────
function updateHealthBadge(status) {
  var badge = document.getElementById('healthBadge');
  if (!badge) return;
  var map = {
    healthy:  { cls: 'bg-green-500/20 text-green-400 border-green-500/30',    dot: 'bg-green-400'  },
    warning:  { cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
    critical: { cls: 'bg-red-500/20 text-red-400 border-red-500/30',          dot: 'bg-red-400'    }
  };
  var s = map[status] || map.healthy;
  var label = status.charAt(0).toUpperCase() + status.slice(1);
  badge.className = 'px-3 py-1 rounded-full text-xs font-semibold border ' + s.cls;
  badge.innerHTML = '<span class="inline-block w-2 h-2 rounded-full mr-1 pulse-dot ' + s.dot + '"></span>' + label;
}

// ─── Key List Toggle ─────────────────────────────────
function toggleKeys(tier) {
  keysVisible[tier] = !keysVisible[tier];
  var list = document.getElementById('keys-' + tier);
  var btn  = document.getElementById('keysToggleBtn-' + tier);
  if (keysVisible[tier]) {
    if (list) list.classList.remove('hidden');
    if (btn)  btn.textContent = '\u25bc Hide keys';
    renderKeys(tier);
  } else {
    if (list) list.classList.add('hidden');
    if (btn)  btn.textContent = '\u25b6 Show keys';
  }
}

function renderKeys(tier) {
  var list = document.getElementById('keys-' + tier);
  var keys = tierKeys[tier] || [];
  if (!list) return;
  if (keys.length === 0) {
    list.innerHTML = '<li class="text-xs text-gray-600 italic px-1">No keys cached</li>';
    return;
  }
  list.innerHTML = keys.map(function (k) {
    var safe = k.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return '<li title="' + safe + '" class="text-xs text-gray-400 font-mono px-2 py-0.5 bg-dark-300 rounded truncate">' + safe + '</li>';
  }).join('');
}

// ─── Clear Tier ──────────────────────────────────────
async function clearTier(tier) {
  if (!confirm('Clear all entries in the ' + tier.toUpperCase() + ' cache tier?')) return;
  try {
    var resp = await fetch('/admin/cache/clear-tier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: tier })
    });
    var json = await resp.json();
    if (json.success) {
      showCacheToast('success', 'Cache Cleared', json.message);
      refreshStats();
    } else {
      showCacheToast('error', 'Error', json.error || 'Failed');
    }
  } catch (err) {
    showCacheToast('error', 'Request Failed', err.message);
  }
}

// ─── Clear Pattern ───────────────────────────────────
async function clearPattern() {
  var patternEl = document.getElementById('patternInput');
  var pattern   = patternEl ? patternEl.value.trim() : '';
  if (!pattern) {
    showCacheToast('warning', 'Input Required', 'Enter a pattern to clear');
    return;
  }
  try {
    var resp = await fetch('/admin/cache/clear-pattern', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pattern: pattern })
    });
    var json = await resp.json();
    if (json.success) {
      showCacheToast('success', 'Pattern Cleared', json.message);
      if (patternEl) patternEl.value = '';
      refreshStats();
    } else {
      showCacheToast('error', 'Error', json.error || 'Failed');
    }
  } catch (err) {
    showCacheToast('error', 'Request Failed', err.message);
  }
}

function setPattern(p) {
  var el = document.getElementById('patternInput');
  if (el) { el.value = p; el.focus(); }
}

// ─── Flush All ───────────────────────────────────────
async function flushAll() {
  if (!confirm('\u26a0 Flush ALL cache tiers?\nSite performance will temporarily drop.')) return;
  try {
    var resp = await fetch('/admin/cache/flush-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    var json = await resp.json();
    if (json.success) {
      showCacheToast('success', 'All Caches Flushed', json.message);
      refreshStats();
    } else {
      showCacheToast('error', 'Error', json.error || 'Failed');
    }
  } catch (err) {
    showCacheToast('error', 'Request Failed', err.message);
  }
}

// ─── Toast (cache-specific, doesn't conflict with layout's showToast) ───
function showCacheToast(type, title, msg) {
  var map = {
    success: { border: 'border-green-500/40', text: 'text-green-400',  d: 'M5 13l4 4L19 7' },
    error:   { border: 'border-red-500/40',   text: 'text-red-400',    d: 'M6 18L18 6M6 6l12 12' },
    warning: { border: 'border-yellow-500/40',text: 'text-yellow-400', d: 'M12 9v2m0 4h.01M12 5a7 7 0 100 14A7 7 0 0012 5z' }
  };
  var s = map[type] || map.error;
  var inner = document.getElementById('toastInner');
  var icon  = document.getElementById('toastIcon');
  var te    = document.getElementById('toastTitle');
  var tm    = document.getElementById('toastMsg');
  var toast = document.getElementById('toast');
  if (!inner || !toast) return;

  inner.className = 'flex items-start gap-3 p-4 rounded-xl shadow-2xl border bg-dark-200 ' + s.border;
  icon.className  = 'w-5 h-5 flex-shrink-0 mt-0.5 ' + s.text;
  icon.innerHTML  = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="' + s.d + '"/>';
  te.className    = 'text-sm font-semibold ' + s.text;
  te.textContent  = title;
  tm.textContent  = msg;
  toast.classList.remove('hidden');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(function () {
    toast.classList.add('hidden');
  }, 5000);
}

// ─── Helpers ─────────────────────────────────────────
function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── Init (runs on DOMContentLoaded) ─────────────────
document.addEventListener('DOMContentLoaded', function () {
  var togEl = document.getElementById('autoRefreshToggle');
  if (togEl) {
    togEl.addEventListener('change', function () {
      autoRefresh = this.checked;
      setToggleUI(autoRefresh);
      autoRefresh ? startTimer() : stopTimer();
    });
  }
  setToggleUI(true);
  startTimer();
});
