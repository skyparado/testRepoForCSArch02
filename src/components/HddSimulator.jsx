import { useEffect, useRef } from 'react';

export default function HddSimulator() {
  const canvasRef = useRef(null);
  const writeBtnRef = useRef(null);
  const readBtnRef = useRef(null);
  const resetBtnRef = useRef(null);
  const dataInputRef = useRef(null);
  const trackSelRef = useRef(null);
  const rpmSelRef = useRef(null);
  const logRef = useRef(null);
  const statSeekRef = useRef(null);
  const statLatRef = useRef(null);
  const statXferRef = useRef(null);
  const statTotalRef = useRef(null);
  const barHDDRef = useRef(null);
  const lblHDDRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const DPR = window.devicePixelRatio || 1;
    const SZ = 340;
    canvas.width = SZ * DPR;
    canvas.height = SZ * DPR;
    canvas.style.width = SZ + 'px';
    canvas.style.height = SZ + 'px';
    ctx.scale(DPR, DPR);

    const CX = SZ / 2;
    const CY = SZ / 2;

    const TRACKS = [138, 115, 92, 69, 46];
    const TRACK_COLORS = [
      'rgba(0,255,255,0.25)',
      'rgba(0,255,255,0.20)',
      'rgba(0,255,255,0.15)',
      'rgba(0,255,255,0.12)',
      'rgba(0,255,255,0.09)',
    ];

    const ARM_PIVOT_X = SZ - 20;
    const ARM_PIVOT_Y = CY;
    const ARM_MIN = -0.7;
    const ARM_MAX = 0.7;

    function trackToAngle(trackIdx) {
      return ARM_MAX - (trackIdx / (TRACKS.length - 1)) * (ARM_MAX - ARM_MIN);
    }

    let state = 'idle';
    let writtenData = null;
    let writtenTrack = null;
    let currentOp = null;

    let platAngle = 0;
    let armAngle = ARM_MAX;
    let targetAngle = ARM_MAX;
    let transferBits = [];
    let transferIdx = 0;
    let rafId = null;

    let simSeek = 0;
    let simLat = 0;
    let simXfer = 0;
    let stateStart = 0;

    const writeBtn = writeBtnRef.current;
    const readBtn = readBtnRef.current;
    const resetBtn = resetBtnRef.current;
    const dataInput = dataInputRef.current;
    const trackSel = trackSelRef.current;
    const rpmSel = rpmSelRef.current;
    const logEl = logRef.current;
    const statSeek = statSeekRef.current;
    const statLat = statLatRef.current;
    const statXfer = statXferRef.current;
    const statTotal = statTotalRef.current;

    function log(msg, cls = 'muted') {
      const span = document.createElement('span');
      span.className = 'log-entry ' + cls;
      span.textContent = msg;
      logEl.innerHTML = '';
      logEl.appendChild(span);
    }

    function logAppend(msg, cls = 'muted') {
      const span = document.createElement('span');
      span.className = 'log-entry ' + cls;
      span.textContent = '\n' + msg;
      logEl.appendChild(span);
    }

    function calcTimings(rpm, trackIdx, prevTrackIdx) {
      const trackDelta = Math.abs(trackIdx - (prevTrackIdx ?? 2));
      const seekMs = 1 + trackDelta * 0.8 + Math.random() * 1.5;
      const latMs = 60000 / rpm / 2;
      const xferMs = ((dataInput.value.length || 4) * 8) / ((150 * 1024 * 1024) / 1_000_000);

      return {
        seek: +seekMs.toFixed(2),
        lat: +latMs.toFixed(2),
        xfer: +xferMs.toFixed(3),
        total: +(seekMs + latMs + xferMs).toFixed(2),
      };
    }

    function drawPlatter() {
      ctx.clearRect(0, 0, SZ, SZ);

      ctx.beginPath();
      ctx.arc(CX, CY, 150, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();
      ctx.strokeStyle = '#38384a';
      ctx.lineWidth = 2;
      ctx.stroke();

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

      TRACKS.forEach((r, i) => {
        ctx.beginPath();
        ctx.arc(CX, CY, r, 0, Math.PI * 2);
        ctx.strokeStyle = TRACK_COLORS[i];
        ctx.lineWidth = 10;
        ctx.stroke();

        ctx.font = '9px "Space Mono", monospace';
        ctx.fillStyle = 'rgba(0,255,255,0.3)';
        ctx.textAlign = 'right';
        ctx.fillText('T' + i, CX - r - 6, CY + 4);
      });

      if (state !== 'idle' && writtenTrack !== null) {
        const r = TRACKS[writtenTrack];
        ctx.beginPath();
        ctx.arc(CX, CY, r, 0, Math.PI * 2);
        ctx.strokeStyle = currentOp === 'write' ? 'rgba(255,0,255,0.55)' : 'rgba(57,255,20,0.55)';
        ctx.lineWidth = 11;
        ctx.stroke();
      }

      if ((state === 'transfer' || state === 'done') && transferBits.length) {
        const r = TRACKS[writtenTrack];
        transferBits.forEach((bit, bi) => {
          const filled = bi < transferIdx;
          const angle = platAngle + (bi / transferBits.length) * Math.PI * 2;
          const bx = CX + Math.cos(angle) * r;
          const by = CY + Math.sin(angle) * r;
          ctx.beginPath();
          ctx.arc(bx, by, 4, 0, Math.PI * 2);
          ctx.fillStyle = filled ? (currentOp === 'write' ? '#FF00FF' : '#39FF14') : 'rgba(255,255,255,0.1)';
          if (filled) {
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 8;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      ctx.beginPath();
      ctx.arc(CX, CY, 18, 0, Math.PI * 2);
      const hubG = ctx.createRadialGradient(CX - 4, CY - 4, 2, CX, CY, 18);
      hubG.addColorStop(0, '#aaa');
      hubG.addColorStop(1, '#444');
      ctx.fillStyle = hubG;
      ctx.fill();
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(CX, CY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#2a2a3a';
      ctx.fill();

      if (Math.abs(armAngle - targetAngle) > 0.005) {
        armAngle += (targetAngle - armAngle) * 0.12;
      } else {
        armAngle = targetAngle;
        if (state === 'seeking') {
          state = 'latency';
          stateStart = performance.now();
          logAppend('  ↳ Head on track. Waiting for sector to rotate beneath…', 'seek');
        }
      }

      const headX = ARM_PIVOT_X + Math.cos(Math.PI + armAngle) * 160;
      const headY = ARM_PIVOT_Y + Math.sin(armAngle) * 80;

      ctx.beginPath();
      ctx.moveTo(ARM_PIVOT_X, ARM_PIVOT_Y);
      ctx.lineTo(headX, headY);
      ctx.strokeStyle = '#39FF14';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ARM_PIVOT_X, ARM_PIVOT_Y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#1e1e2e';
      ctx.strokeStyle = '#4a4a5a';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(headX, headY, 5, 0, Math.PI * 2);
      ctx.fillStyle = state === 'transfer' || state === 'done' ? (currentOp === 'write' ? '#FF00FF' : '#39FF14') : '#39FF14';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      const now = performance.now();
      const elapsed = now - stateStart;

      if (state === 'latency') {
        if (elapsed >= simLat * 20) {
          state = 'transfer';
          stateStart = now;
          transferIdx = 0;
          logAppend('  ↳ Sector under head. ' + (currentOp === 'write' ? 'Writing' : 'Reading') + ' data…', currentOp);
        }
      }

      if (state === 'transfer') {
        const progress = Math.min(elapsed / (simXfer * 5000), 1);
        transferIdx = Math.floor(progress * transferBits.length);

        if (progress >= 1) {
          state = 'done';
          logAppend('  ↳ ' + (currentOp === 'write' ? 'Write' : 'Read') + ' complete.', currentOp === 'write' ? 'write' : 'read');

          if (currentOp === 'write') {
            writtenData = dataInput.value;
            writtenTrack = parseInt(trackSel.value);
            readBtn.disabled = false;
            logAppend('  ↳ Data stored on Track ' + writtenTrack + '. Press Read to retrieve.', 'muted');
          } else {
            logAppend('  ↳ Retrieved: "' + writtenData + '"', 'read');
          }
        }
      }
    }

    function animLoop() {
      const rpm = parseInt(rpmSel.value);
      const dAngle = ((rpm / 60) * 2 * Math.PI) / 60;
      platAngle = (platAngle + dAngle) % (Math.PI * 2);
      drawPlatter();
      rafId = requestAnimationFrame(animLoop);
    }

    rafId = requestAnimationFrame(animLoop);

    function stringToBits(str) {
      let bits = [];
      for (const ch of str) {
        const b = ch.charCodeAt(0).toString(2).padStart(8, '0');
        bits = bits.concat(b.split('').map(Number));
      }
      return bits;
    }

    function onWrite() {
      const data = dataInput.value.trim();
      if (!data) {
        log('[ Please enter data to write first. ]', 'error');
        return;
      }

      const trackIdx = parseInt(trackSel.value);
      const rpm = parseInt(rpmSel.value);
      const timings = calcTimings(rpm, trackIdx, writtenTrack ?? 2);

      simSeek = timings.seek;
      simLat = timings.lat;
      simXfer = timings.xfer;

      statSeek.textContent = timings.seek + ' ms';
      statLat.textContent = timings.lat + ' ms';
      statXfer.textContent = timings.xfer + ' ms';
      statTotal.textContent = timings.total + ' ms';

      barHDDRef.current.style.width = '100%';
      lblHDDRef.current.textContent = timings.total + ' ms';

      transferBits = stringToBits(data);
      transferIdx = 0;
      targetAngle = trackToAngle(trackIdx);
      writtenTrack = trackIdx;
      currentOp = 'write';
      state = 'seeking';
      stateStart = performance.now();
      readBtn.disabled = true;

      log('[ WRITE ] "' + data + '" → Track ' + trackIdx + ' @ ' + rpm + ' RPM', 'write');
      logAppend('  ↳ Seeking… (est. ' + timings.seek + ' ms seek + ' + timings.lat + ' ms latency)', 'seek');
    }

    function onRead() {
      if (!writtenData) return;

      const rpm = parseInt(rpmSel.value);
      const timings = calcTimings(rpm, writtenTrack, writtenTrack);

      simSeek = timings.seek;
      simLat = timings.lat;
      simXfer = timings.xfer;

      statSeek.textContent = timings.seek + ' ms';
      statLat.textContent = timings.lat + ' ms';
      statXfer.textContent = timings.xfer + ' ms';
      statTotal.textContent = timings.total + ' ms';

      transferBits = stringToBits(writtenData);
      transferIdx = 0;
      currentOp = 'read';
      state = 'seeking';
      stateStart = performance.now();
      targetAngle = trackToAngle(writtenTrack);

      log('[ READ ] Track ' + writtenTrack + ' @ ' + rpm + ' RPM', 'read');
      logAppend('  ↳ Seeking to Track ' + writtenTrack + '…', 'seek');
    }

    function onReset() {
      state = 'idle';
      writtenData = null;
      writtenTrack = null;
      currentOp = null;
      transferBits = [];
      transferIdx = 0;
      targetAngle = ARM_MAX;
      readBtn.disabled = true;

      statSeek.textContent = '—';
      statLat.textContent = '—';
      statXfer.textContent = '—';
      statTotal.textContent = '—';

      barHDDRef.current.style.width = '100%';
      lblHDDRef.current.textContent = '~10 ms';

      log('[ Reset — enter new data and press Write ]', 'muted');
    }

    writeBtn.addEventListener('click', onWrite);
    readBtn.addEventListener('click', onRead);
    resetBtn.addEventListener('click', onReset);

    return () => {
      cancelAnimationFrame(rafId);
      writeBtn.removeEventListener('click', onWrite);
      readBtn.removeEventListener('click', onRead);
      resetBtn.removeEventListener('click', onReset);
    };
  }, []);

  return (
    <div className="hdd-sim-wrap">
      <div className="hdd-sim-top">
        <div>
          <canvas ref={canvasRef} id="hddCanvas" width="340" height="340" aria-label="Animated hard disk platter with actuator arm" />
        </div>

        <div className="hdd-controls">
          <div>
            <label htmlFor="simData">DATA TO WRITE / READ</label>
            <input ref={dataInputRef} type="text" id="simData" maxLength="12" placeholder="e.g. DLSU 2026" autoComplete="off" spellCheck="false" />
          </div>

          <div>
            <label htmlFor="simTrack">TARGET TRACK</label>
            <select ref={trackSelRef} id="simTrack" defaultValue="2">
              <option value="0">Track 0 — Outer</option>
              <option value="1">Track 1</option>
              <option value="2">Track 2</option>
              <option value="3">Track 3</option>
              <option value="4">Track 4 — Inner</option>
            </select>
          </div>

          <div>
            <label htmlFor="simRpm">SPINDLE SPEED</label>
            <select ref={rpmSelRef} id="simRpm" defaultValue="7200">
              <option value="5400">5,400 RPM (consumer)</option>
              <option value="7200">7,200 RPM (standard)</option>
              <option value="10000">10,000 RPM (performance)</option>
            </select>
          </div>

          <div className="hdd-btn-row">
            <button ref={writeBtnRef} className="btn btn-primary btn-sm" id="writeBtn">&#9654; Write</button>
            <button ref={readBtnRef} className="btn btn-primary btn-sm" id="readBtn" disabled>&#9654; Read</button>
            <button ref={resetBtnRef} className="btn btn-outline btn-sm" id="resetBtn">Reset</button>
          </div>

          <div className="hdd-stat-grid">
            <div className="hdd-stat">
              <span className="hdd-stat-label">SEEK TIME</span>
              <span className="hdd-stat-val" ref={statSeekRef}>—</span>
            </div>
            <div className="hdd-stat">
              <span className="hdd-stat-label">ROT. LATENCY</span>
              <span className="hdd-stat-val" ref={statLatRef}>—</span>
            </div>
            <div className="hdd-stat">
              <span className="hdd-stat-label">TRANSFER TIME</span>
              <span className="hdd-stat-val" ref={statXferRef}>—</span>
            </div>
            <div className="hdd-stat">
              <span className="hdd-stat-label">TOTAL ACCESS</span>
              <span className="hdd-stat-val" ref={statTotalRef}>—</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hdd-log" ref={logRef}>
        <span className="log-entry muted">[ Waiting for input — enter data and press Write ]</span>
      </div>

      <div>
        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', letterSpacing: '1.5px', marginBottom: '0.75rem' }}>
          ACCESS LATENCY COMPARISON
        </p>
        <div className="seek-compare">
          <div className="seek-bar-row">
            <span className="seek-bar-label">HDD</span>
            <div className="seek-bar-track">
              <div className="seek-bar-fill hdd-fill" ref={barHDDRef} style={{ width: '100%' }} />
            </div>
            <span className="seek-bar-val" ref={lblHDDRef}>~10 ms</span>
          </div>
          <div className="seek-bar-row">
            <span className="seek-bar-label">SATA SSD</span>
            <div className="seek-bar-track">
              <div className="seek-bar-fill ssd-fill" style={{ width: '0.5%' }} />
            </div>
            <span className="seek-bar-val">~0.05 ms</span>
          </div>
          <div className="seek-bar-row">
            <span className="seek-bar-label">DRAM</span>
            <div className="seek-bar-track">
              <div className="seek-bar-fill ram-fill" style={{ width: '0.001%' }} />
            </div>
            <span className="seek-bar-val">~0.0001 ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
