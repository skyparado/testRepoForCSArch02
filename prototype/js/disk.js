/* ──────────────────────────────────────────────────────────────
   disk.js — HDD Read/Write Simulator
   Full Capacity: The Evolution of Computer Data Storage
   CSARCH2 Group 7 [S01] — De La Salle University
   ──────────────────────────────────────────────────────────────
   Architecture:
   - Canvas draws the platter (concentric tracks), actuator arm,
     and spinning-head dot using requestAnimationFrame.
   - State machine: idle → seeking → latency → transfer → done.
   - Times are calculated from real-world HDD specs (RPM, track).
────────────────────────────────────────────────────────────── */

const canvas = document.getElementById('hddCanvas');
const ctx    = canvas.getContext('2d');

// HiDPI support
const DPR = window.devicePixelRatio || 1;
const SZ  = 340;
canvas.width        = SZ * DPR;
canvas.height       = SZ * DPR;
canvas.style.width  = SZ + 'px';
canvas.style.height = SZ + 'px';
ctx.scale(DPR, DPR);

const CX = SZ / 2;
const CY = SZ / 2;

// Track radii (px) — outer to inner
const TRACKS = [138, 115, 92, 69, 46];
const TRACK_COLORS = [
  'rgba(0,255,255,0.25)',
  'rgba(0,255,255,0.20)',
  'rgba(0,255,255,0.15)',
  'rgba(0,255,255,0.12)',
  'rgba(0,255,255,0.09)',
];

// Actuator arm pivot (right edge, vertically centered)
const ARM_PIVOT_X = SZ - 20;
const ARM_PIVOT_Y = CY;

// Arm sweep range in radians
const ARM_MIN = -0.70;
const ARM_MAX =  0.70;

function trackToAngle(trackIdx) {
  // Track 0 = outermost = arm angled outward (ARM_MAX)
  return ARM_MAX - (trackIdx / (TRACKS.length - 1)) * (ARM_MAX - ARM_MIN);
}

// ── Simulation state ────────────────────────────────────────
let state        = 'idle';  // idle | seeking | latency | transfer | done
let writtenData  = null;
let writtenTrack = null;
let currentOp    = null;    // 'write' | 'read'

// Animation vars
let platAngle    = 0;
let armAngle     = ARM_MAX;
let targetAngle  = ARM_MAX;
let transferBits = [];
let transferIdx  = 0;
let rafId        = null;

// Timing (real ms values, compressed for UX in the animation)
let simSeek    = 0;
let simLat     = 0;
let simXfer    = 0;
let stateStart = 0;

// ── DOM refs ─────────────────────────────────────────────────
const writeBtn  = document.getElementById('writeBtn');
const readBtn   = document.getElementById('readBtn');
const resetBtn  = document.getElementById('resetBtn');
const dataInput = document.getElementById('simData');
const trackSel  = document.getElementById('simTrack');
const rpmSel    = document.getElementById('simRpm');
const logEl     = document.getElementById('hddLog');
const statSeek  = document.getElementById('statSeek');
const statLat   = document.getElementById('statLat');
const statXfer  = document.getElementById('statXfer');
const statTotal = document.getElementById('statTotal');

// ── Logging helpers ───────────────────────────────────────────
function log(msg, cls = 'muted') {
  const span = document.createElement('span');
  span.className   = 'log-entry ' + cls;
  span.textContent = msg;
  logEl.innerHTML  = '';
  logEl.appendChild(span);
}

function logAppend(msg, cls = 'muted') {
  const span = document.createElement('span');
  span.className   = 'log-entry ' + cls;
  span.textContent = '\n' + msg;
  logEl.appendChild(span);
}

// ── Timing calculations ───────────────────────────────────────
function calcTimings(rpm, trackIdx, prevTrackIdx) {
  const trackDelta = Math.abs(trackIdx - (prevTrackIdx ?? 2));
  // Seek: 1 ms base + 0.8 ms per track crossed + small random jitter
  const seekMs = 1 + trackDelta * 0.8 + Math.random() * 1.5;
  // Rotational latency: on average half a revolution
  const latMs  = (60000 / rpm) / 2;
  // Transfer: data length in bytes at ~150 MB/s (typical SATA HDD)
  const xferMs = (dataInput.value.length || 4) * 8 / (150 * 1024 * 1024 / 1_000_000);

  return {
    seek  : +seekMs.toFixed(2),
    lat   : +latMs.toFixed(2),
    xfer  : +xferMs.toFixed(3),
    total : +(seekMs + latMs + xferMs).toFixed(2),
  };
}

// ── Canvas draw ───────────────────────────────────────────────
function drawPlatter() {
  ctx.clearRect(0, 0, SZ, SZ);

  // Platter body
  ctx.beginPath();
  ctx.arc(CX, CY, 150, 0, Math.PI * 2);
  ctx.fillStyle   = '#1a1a2e';
  ctx.fill();
  ctx.strokeStyle = '#38384a';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Spinning sheen
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(platAngle);
  const sheen = ctx.createRadialGradient(-40, -50, 5, 0, 0, 140);
  sheen.addColorStop(0, 'rgba(255,255,255,0.04)');
  sheen.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.arc(0, 0, 140, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Concentric data tracks
  TRACKS.forEach((r, i) => {
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.strokeStyle = TRACK_COLORS[i];
    ctx.lineWidth   = 10;
    ctx.stroke();

    ctx.font      = '9px "Space Mono", monospace';
    ctx.fillStyle = 'rgba(0,255,255,0.3)';
    ctx.textAlign = 'right';
    ctx.fillText('T' + i, CX - r - 6, CY + 4);
  });

  // Highlight active track
  if (state !== 'idle' && writtenTrack !== null) {
    const r = TRACKS[writtenTrack];
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.strokeStyle = currentOp === 'write'
      ? 'rgba(255,0,255,0.55)'
      : 'rgba(57,255,20,0.55)';
    ctx.lineWidth = 11;
    ctx.stroke();
  }

  // Transfer animation: glowing bit dots on track
  if ((state === 'transfer' || state === 'done') && transferBits.length) {
    const r = TRACKS[writtenTrack];
    transferBits.forEach((bit, bi) => {
      const filled = bi < transferIdx;
      const angle  = platAngle + (bi / transferBits.length) * Math.PI * 2;
      const bx     = CX + Math.cos(angle) * r;
      const by     = CY + Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, Math.PI * 2);
      ctx.fillStyle = filled
        ? (currentOp === 'write' ? '#FF00FF' : '#39FF14')
        : 'rgba(255,255,255,0.1)';
      if (filled) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; }
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  // Hub
  ctx.beginPath();
  ctx.arc(CX, CY, 18, 0, Math.PI * 2);
  const hubG = ctx.createRadialGradient(CX - 4, CY - 4, 2, CX, CY, 18);
  hubG.addColorStop(0, '#aaa');
  hubG.addColorStop(1, '#444');
  ctx.fillStyle   = hubG;
  ctx.fill();
  ctx.strokeStyle = '#888';
  ctx.lineWidth   = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CX, CY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#2a2a3a';
  ctx.fill();

  // Smooth arm seek
  if (Math.abs(armAngle - targetAngle) > 0.005) {
    armAngle += (targetAngle - armAngle) * 0.12;
  } else {
    armAngle = targetAngle;
    if (state === 'seeking') {
      state      = 'latency';
      stateStart = performance.now();
      logAppend('  ↳ Head on track. Waiting for sector to rotate beneath…', 'seek');
    }
  }

  const headX = ARM_PIVOT_X + Math.cos(Math.PI + armAngle) * 160;
  const headY = ARM_PIVOT_Y + Math.sin(armAngle) * 80;

  // Arm line
  ctx.beginPath();
  ctx.moveTo(ARM_PIVOT_X, ARM_PIVOT_Y);
  ctx.lineTo(headX, headY);
  ctx.strokeStyle = '#39FF14';
  ctx.lineWidth   = 2.5;
  ctx.stroke();

  // Pivot circle
  ctx.beginPath();
  ctx.arc(ARM_PIVOT_X, ARM_PIVOT_Y, 8, 0, Math.PI * 2);
  ctx.fillStyle   = '#1e1e2e';
  ctx.strokeStyle = '#4a4a5a';
  ctx.lineWidth   = 2;
  ctx.fill();
  ctx.stroke();

  // Head dot
  ctx.beginPath();
  ctx.arc(headX, headY, 5, 0, Math.PI * 2);
  ctx.fillStyle = (state === 'transfer' || state === 'done')
    ? (currentOp === 'write' ? '#FF00FF' : '#39FF14')
    : '#39FF14';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur  = 12;
  ctx.fill();
  ctx.shadowBlur  = 0;

  // State machine transitions
  const now     = performance.now();
  const elapsed = now - stateStart;

  if (state === 'latency') {
    if (elapsed >= simLat * 20) {
      state      = 'transfer';
      stateStart = now;
      transferIdx = 0;
      logAppend('  ↳ Sector under head. ' +
        (currentOp === 'write' ? 'Writing' : 'Reading') + ' data…', currentOp);
    }
  }

  if (state === 'transfer') {
    const progress = Math.min(elapsed / (simXfer * 5000), 1);
    transferIdx    = Math.floor(progress * transferBits.length);

    if (progress >= 1) {
      state = 'done';
      logAppend('  ↳ ' + (currentOp === 'write' ? 'Write' : 'Read') + ' complete.',
        currentOp === 'write' ? 'write' : 'read');

      if (currentOp === 'write') {
        writtenData  = dataInput.value;
        writtenTrack = parseInt(trackSel.value);
        readBtn.disabled = false;
        logAppend('  ↳ Data stored on Track ' + writtenTrack + '. Press Read to retrieve.', 'muted');
      } else {
        logAppend('  ↳ Retrieved: "' + writtenData + '"', 'read');
      }
    }
  }
}

// ── Animation loop ────────────────────────────────────────────
function animLoop() {
  const rpm    = parseInt(rpmSel.value);
  const dAngle = (rpm / 60 * 2 * Math.PI) / 60; // radians per frame at ~60fps
  platAngle    = (platAngle + dAngle) % (Math.PI * 2);
  drawPlatter();
  rafId = requestAnimationFrame(animLoop);
}

rafId = requestAnimationFrame(animLoop);

// ── TOC scroll highlight ──────────────────────────────────────
const tocObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      document.querySelectorAll('#tocList a').forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
      });
    }
  });
}, { rootMargin: '-20% 0px -70% 0px' });

document.querySelectorAll('section[id]').forEach(s => tocObserver.observe(s));

// ── Helper: build bit array from string ──────────────────────
function stringToBits(str) {
  let bits = [];
  for (const ch of str) {
    const b = ch.charCodeAt(0).toString(2).padStart(8, '0');
    bits = bits.concat(b.split('').map(Number));
  }
  return bits;
}

// ── Write ─────────────────────────────────────────────────────
writeBtn.addEventListener('click', () => {
  const data = dataInput.value.trim();
  if (!data) {
    log('[ Please enter data to write first. ]', 'error');
    return;
  }

  const trackIdx  = parseInt(trackSel.value);
  const rpm       = parseInt(rpmSel.value);
  const timings   = calcTimings(rpm, trackIdx, writtenTrack ?? 2);

  simSeek = timings.seek;
  simLat  = timings.lat;
  simXfer = timings.xfer;

  statSeek.textContent  = timings.seek  + ' ms';
  statLat.textContent   = timings.lat   + ' ms';
  statXfer.textContent  = timings.xfer  + ' ms';
  statTotal.textContent = timings.total + ' ms';

  document.getElementById('barHDD').style.width  = '100%';
  document.getElementById('lblHDD').textContent  = timings.total + ' ms';

  transferBits = stringToBits(data);
  transferIdx  = 0;
  targetAngle  = trackToAngle(trackIdx);
  writtenTrack = trackIdx;
  currentOp    = 'write';
  state        = 'seeking';
  stateStart   = performance.now();
  readBtn.disabled = true;

  log('[ WRITE ] "' + data + '" → Track ' + trackIdx + ' @ ' + rpm + ' RPM', 'write');
  logAppend('  ↳ Seeking… (est. ' + timings.seek + ' ms seek + ' + timings.lat + ' ms latency)', 'seek');
});

// ── Read ──────────────────────────────────────────────────────
readBtn.addEventListener('click', () => {
  if (!writtenData) return;

  const rpm     = parseInt(rpmSel.value);
  const timings = calcTimings(rpm, writtenTrack, writtenTrack);

  simSeek = timings.seek;
  simLat  = timings.lat;
  simXfer = timings.xfer;

  statSeek.textContent  = timings.seek  + ' ms';
  statLat.textContent   = timings.lat   + ' ms';
  statXfer.textContent  = timings.xfer  + ' ms';
  statTotal.textContent = timings.total + ' ms';

  transferBits = stringToBits(writtenData);
  transferIdx  = 0;
  currentOp    = 'read';
  state        = 'seeking';
  stateStart   = performance.now();
  targetAngle  = trackToAngle(writtenTrack);

  log('[ READ ] Track ' + writtenTrack + ' @ ' + rpm + ' RPM', 'read');
  logAppend('  ↳ Seeking to Track ' + writtenTrack + '…', 'seek');
});

// ── Reset ─────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  state        = 'idle';
  writtenData  = null;
  writtenTrack = null;
  currentOp    = null;
  transferBits = [];
  transferIdx  = 0;
  targetAngle  = ARM_MAX;
  readBtn.disabled = true;

  statSeek.textContent  = '—';
  statLat.textContent   = '—';
  statXfer.textContent  = '—';
  statTotal.textContent = '—';

  document.getElementById('barHDD').style.width  = '100%';
  document.getElementById('lblHDD').textContent  = '~10 ms';

  log('[ Reset — enter new data and press Write ]', 'muted');
});