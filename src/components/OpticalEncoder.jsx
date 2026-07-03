import { useEffect, useRef, useState } from 'react';

const MAX_CHARS = 3;
const TRACK_Y = 75;
const TRACK_H = 50;
const BIT_LABEL_Y = 60;
const REFLECT_Y = 155;
const W_CSS = 672;
const H_CSS = 200;

export default function OpticalEncoder() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const bitsRef = useRef([]);
  const scanAnimRef = useRef(null);
  const isScanningRef = useRef(false);

  const [inputValue, setInputValue] = useState('');
  const [binaryHtml, setBinaryHtml] = useState('');
  const [output, setOutput] = useState('');
  const [scanDisabled, setScanDisabled] = useState(true);
  const [scanning, setScanning] = useState(false);

  function cellWidth() {
    const bits = bitsRef.current;
    return bits.length > 0 ? Math.floor(W_CSS / bits.length) : 28;
  }

  function clearCanvas() {
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, W_CSS, H_CSS);
    ctx.fillStyle = '#050010';
    ctx.fillRect(0, 0, W_CSS, H_CSS);
    ctx.strokeStyle = 'rgba(128,0,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, TRACK_Y - 20);
    ctx.lineTo(W_CSS, TRACK_Y - 20);
    ctx.stroke();
    ctx.fillStyle = 'rgba(170,170,204,0.2)';
    ctx.font = '11px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TYPE TEXT AND CLICK ENCODE TO SEE THE DISC TRACK', W_CSS / 2, H_CSS / 2);
  }

  function drawTrack(highlightIdx) {
    const ctx = ctxRef.current;
    const bits = bitsRef.current;
    ctx.clearRect(0, 0, W_CSS, H_CSS);

    const cw = cellWidth();
    const totalW = bits.length * cw;
    const offsetX = Math.floor((W_CSS - totalW) / 2);

    ctx.fillStyle = '#050010';
    ctx.fillRect(0, 0, W_CSS, H_CSS);

    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(offsetX - 2, TRACK_Y - 2, totalW + 4, TRACK_H + 4);

    bits.forEach((bit, i) => {
      const x = offsetX + i * cw;

      if (bit === 1) {
        ctx.fillStyle = '#8888c0';
        ctx.fillRect(x + 1, TRACK_Y, cw - 1, TRACK_H);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x + 2, TRACK_Y + 2, cw - 4, 6);
      } else {
        ctx.fillStyle = '#111128';
        ctx.fillRect(x + 1, TRACK_Y, cw - 1, TRACK_H);
        ctx.fillStyle = '#07070f';
        ctx.fillRect(x + 3, TRACK_Y + 6, cw - 6, TRACK_H - 12);
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, TRACK_Y, cw, TRACK_H);

      const isActive = i === highlightIdx;
      ctx.font = `bold ${cw < 22 ? 9 : 11}px "Space Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = isActive ? '#39FF14' : bit === 1 ? '#6060aa' : '#444466';
      ctx.fillText(bit.toString(), x + cw / 2, BIT_LABEL_Y);

      if (i > 0 && i % 8 === 0) {
        ctx.strokeStyle = 'rgba(255,0,255,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(x, TRACK_Y - 18);
        ctx.lineTo(x, TRACK_Y + TRACK_H + 18);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    if (highlightIdx >= 0 && highlightIdx < bits.length) {
      const laserX = offsetX + highlightIdx * cw + cw / 2;
      const currentBit = bits[highlightIdx];

      ctx.strokeStyle = 'rgba(255,60,60,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(laserX, 20);
      ctx.lineTo(laserX, TRACK_Y + TRACK_H + 30);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(laserX, TRACK_Y + TRACK_H / 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4444';
      ctx.shadowColor = '#ff6666';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (currentBit === 1) {
        ctx.strokeStyle = 'rgba(180,180,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(laserX - 4, TRACK_Y);
        ctx.lineTo(laserX - 12, 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(laserX + 4, TRACK_Y);
        ctx.lineTo(laserX + 12, 10);
        ctx.stroke();
      }

      ctx.font = '10px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = currentBit === 1 ? '#8888cc' : '#333355';
      ctx.fillText(currentBit === 1 ? 'LAND — REFLECTS' : 'PIT — ABSORBS', laserX, REFLECT_Y);

      ctx.font = 'bold 12px "Space Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#39FF14';
      ctx.fillText('bit[' + highlightIdx + '] = ' + currentBit, W_CSS - 10, H_CSS - 8);
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;

    const DPR = window.devicePixelRatio || 1;
    canvas.width = W_CSS * DPR;
    canvas.height = H_CSS * DPR;
    canvas.style.width = W_CSS + 'px';
    canvas.style.height = H_CSS + 'px';
    ctx.scale(DPR, DPR);

    clearCanvas();

    return () => {
      if (scanAnimRef.current) cancelAnimationFrame(scanAnimRef.current);
    };
  }, []);

  function resetSim() {
    if (scanAnimRef.current) cancelAnimationFrame(scanAnimRef.current);
    isScanningRef.current = false;
    setScanning(false);
    bitsRef.current = [];
    setBinaryHtml('');
    setOutput('');
    setScanDisabled(true);
    clearCanvas();
  }

  function handleReset() {
    setInputValue('');
    resetSim();
  }

  function encodeInput() {
    const text = inputValue.slice(0, MAX_CHARS);
    if (!text.trim()) {
      setBinaryHtml('<span style="color:var(--accent-magenta)">Please type something first.</span>');
      return;
    }

    if (scanAnimRef.current) cancelAnimationFrame(scanAnimRef.current);
    isScanningRef.current = false;
    setScanning(false);

    const bits = [];
    const byteGroups = [];
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      const b = code.toString(2).padStart(8, '0');
      byteGroups.push(b);
      for (const bit of b) bits.push(parseInt(bit, 10));
    }
    bitsRef.current = bits;

    const displayHTML = byteGroups
      .map((g, i) => {
        const char = text[i];
        return `<span style="color:var(--accent-cyan)">${g}</span><span style="color:rgba(170,170,204,0.4)"> (${char})</span>`;
      })
      .join(' ');

    setBinaryHtml('Binary: ' + displayHTML);
    setOutput('');
    setScanDisabled(false);

    drawTrack(-1);
  }

  function startScan() {
    const bits = bitsRef.current;
    if (isScanningRef.current || bits.length === 0) return;
    isScanningRef.current = true;
    setScanning(true);
    setScanDisabled(true);
    setOutput('');

    const readBits = [];
    let idx = 0;
    let lastTime = null;
    const MS_PER_BIT = 130;

    function step(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const elapsed = timestamp - lastTime;

      if (elapsed >= MS_PER_BIT) {
        drawTrack(idx);
        readBits.push(bits[idx]);

        let partial = '';
        for (let b = 0; b + 7 < readBits.length; b += 8) {
          const byte = readBits.slice(b, b + 8).join('');
          partial += String.fromCharCode(parseInt(byte, 2));
        }
        if (partial) {
          setOutput('Reading: "' + partial + '"');
        }

        idx++;
        lastTime = timestamp;
      }

      if (idx < bits.length) {
        scanAnimRef.current = requestAnimationFrame(step);
      } else {
        drawTrack(-1);
        let decoded = '';
        for (let b = 0; b + 7 < readBits.length; b += 8) {
          const byte = readBits.slice(b, b + 8).join('');
          decoded += String.fromCharCode(parseInt(byte, 2));
        }
        setOutput('✓ Decoded: "' + decoded + '"');
        setScanDisabled(false);
        isScanningRef.current = false;
        setScanning(false);
      }
    }

    scanAnimRef.current = requestAnimationFrame(step);
  }

  return (
    <div className="sim-wrap">
      <div className="sim-controls">
        <input
          type="text"
          className="sim-input"
          maxLength={MAX_CHARS}
          placeholder="Type up to 3 chars..."
          autoComplete="off"
          spellCheck="false"
          value={inputValue}
          onInput={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') encodeInput();
          }}
        />
        <button className="btn btn-primary btn-sm" onClick={encodeInput}>Encode to Disc</button>
      </div>

      <div className="sim-binary" dangerouslySetInnerHTML={{ __html: binaryHtml }} />

      <canvas ref={canvasRef} width={W_CSS} height={H_CSS} aria-label="Optical disc track visualization" />

      <div className="sim-actions">
        <button className="btn btn-primary btn-sm" disabled={scanDisabled} onClick={startScan}>&#9654; Scan with Laser</button>
        <button className="btn btn-outline btn-sm" onClick={handleReset}>Reset</button>
        {scanning && <span className="sim-spinner">SCANNING...</span>}
      </div>

      <div className="sim-output">{output}</div>

      <div className="sim-legend">
        <div className="sim-legend-item">
          <div className="legend-swatch" style={{ background: '#9090c8', border: '1px solid #aaa' }} />
          <span>Land (bit = 1) — reflects laser</span>
        </div>
        <div className="sim-legend-item">
          <div className="legend-swatch" style={{ background: '#111128', border: '1px solid #333' }} />
          <span>Pit (bit = 0) — absorbs laser</span>
        </div>
        <div className="sim-legend-item">
          <div className="legend-swatch" style={{ background: '#ff4444', border: '1px solid #ff6666', borderRadius: '50%' }} />
          <span>Laser beam</span>
        </div>
      </div>

      <p className="sim-note">
        <strong>Simplified model:</strong> Real CDs use NRZI — it's <em>transitions</em> between pit and
        land that equal 1, not the pit itself. Data also goes through EFM encoding before pressing. This
        sim skips that to keep things visual.
      </p>
    </div>
  );
}
