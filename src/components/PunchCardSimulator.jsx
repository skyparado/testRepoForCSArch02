import { useEffect, useRef, useState } from 'react';

const ROW_LABELS = ['12', '11', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const MAX_COLS = 40;
const TOP_MARGIN = 26;
const LEFT_MARGIN = 36;
const ROW_GAP = 15;

function charToRows(ch) {
  const c = ch.toUpperCase();
  if (c === ' ') return [];

  if (c >= '0' && c <= '9') {
    return [2 + parseInt(c, 10)];
  }

  if (c >= 'A' && c <= 'Z') {
    const code = c.charCodeAt(0) - 65;
    if (code <= 8) return [0, 2 + code + 1];
    if (code <= 17) return [1, 2 + (code - 9) + 1];
    return [2, 2 + (code - 18) + 2];
  }

  return [];
}

export default function PunchCardSimulator() {
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const bufferRef = useRef('');
  const [buffer, setBuffer] = useState('');
  const [shiftLock, setShiftLock] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [pressedKey, setPressedKey] = useState(null);

  useEffect(() => {
    bufferRef.current = buffer;
  }, [buffer]);

  function getW() {
    return canvasRef.current.parentElement.clientWidth || 900;
  }

  function drawCard(text) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const DPR = window.devicePixelRatio || 1;
    const W = getW();
    const H = 220;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(DPR, DPR);

    const COL_GAP = (W - LEFT_MARGIN - 20) / MAX_COLS;

    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#e8dfc0';
    ctx.fillRect(0, 0, W, H);

    ctx.font = '9px "Space Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#665f45';
    ROW_LABELS.forEach((label, r) => {
      const y = TOP_MARGIN + r * ROW_GAP;
      ctx.fillText(label, LEFT_MARGIN - 8, y + 3);
    });

    const chars = text.slice(0, MAX_COLS).split('');

    for (let col = 0; col < MAX_COLS; col++) {
      const x = LEFT_MARGIN + col * COL_GAP + COL_GAP / 2;

      if ((col + 1) % 5 === 0 || col === 0) {
        ctx.font = '7px "Space Mono", monospace';
        ctx.fillStyle = '#9c916c';
        ctx.textAlign = 'center';
        ctx.fillText(String(col + 1), x, H - 5);
      }

      const punched = chars[col] ? charToRows(chars[col]) : [];

      for (let r = 0; r < ROW_LABELS.length; r++) {
        const y = TOP_MARGIN + r * ROW_GAP;
        const isPunched = punched.includes(r);

        ctx.beginPath();
        ctx.rect(x - 3, y - 4.5, 6, 9);

        if (isPunched) {
          ctx.fillStyle = '#111128';
          ctx.fill();
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(58,53,32,0.12)';
          ctx.fill();
        }
      }

      if (chars[col]) {
        ctx.font = 'bold 10px "Space Mono", monospace';
        ctx.fillStyle = '#3a3520';
        ctx.textAlign = 'center';
        ctx.fillText(chars[col].toUpperCase(), x, TOP_MARGIN - 12);
      }
    }

    const cursorCol = chars.length;
    if (cursorCol < MAX_COLS) {
      const x = LEFT_MARGIN + cursorCol * COL_GAP + COL_GAP / 2;
      ctx.strokeStyle = 'rgba(0,180,0,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, TOP_MARGIN - 16);
      ctx.lineTo(x, TOP_MARGIN + (ROW_LABELS.length - 1) * ROW_GAP + 6);
      ctx.stroke();
    }

    ctx.strokeStyle = '#9c916c';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(2, 2, W - 4, H - 4);
  }

  useEffect(() => {
    drawCard(buffer);
  }, [buffer]);

  useEffect(() => {
    function handleResize() {
      drawCard(bufferRef.current);
    }
    window.addEventListener('resize', handleResize);
    requestAnimationFrame(handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function flashKey(id) {
    setPressedKey(id);
    setTimeout(() => setPressedKey((k) => (k === id ? null : k)), 100);
  }

  function pressChar(id, baseChar, shiftChar) {
    const active = shiftLock || shiftHeld;
    let charToAdd = baseChar;

    if (active) {
      if (shiftChar) {
        charToAdd = shiftChar;
      } else if (/[a-z]/.test(baseChar)) {
        charToAdd = baseChar.toUpperCase();
      }
    }

    setBuffer((b) => (b.length < MAX_COLS ? b + charToAdd : b));
    flashKey(id);

    if (shiftHeld && !shiftLock) {
      setShiftHeld(false);
    }
  }

  function pressBackspace() {
    setBuffer((b) => b.slice(0, -1));
    flashKey('backspace');
  }

  function pressShiftLock() {
    setShiftLock((v) => !v);
    setShiftHeld(false);
    flashKey('shiftlock');
  }

  function pressShift(id) {
    setShiftHeld((v) => !v);
    flashKey(id);
  }

  const shown = buffer.slice(0, MAX_COLS);
  const punchedCount = shown.split('').filter((ch) => charToRows(ch).length > 0).length;
  const skipped = shown.length - punchedCount;
  const outputText = buffer.trim()
    ? `Column ${Math.min(buffer.length, MAX_COLS)} of ${MAX_COLS} — "${shown}" (${punchedCount} punched, ${skipped} skipped)`
    : '';

  const isPressed = (id) => (pressedKey === id ? ' tw-pressed' : '');

  return (
    <div className="punch-sim-wrap">
      <div className="punch-card-frame" ref={frameRef}>
        <div className="punch-card-titlebar">TEXT-TO-PUNCH CARD SIMULATOR</div>
        <canvas ref={canvasRef} id="punchCanvas" width="900" height="220" aria-label="Punch card visualization" />
      </div>

      <div className="punch-output" id="punchOutput">{outputText}</div>

      <div className="typewriter">
        <div className="tw-row">
          <button className={`tw-key${isPressed('1')}`} onClick={() => pressChar('1', '1', '!')}><span className="tw-top">!</span><span className="tw-bot">1</span></button>
          <button className={`tw-key${isPressed('2')}`} onClick={() => pressChar('2', '2', '"')}><span className="tw-top">&quot;</span><span className="tw-bot">2</span></button>
          <button className={`tw-key${isPressed('3')}`} onClick={() => pressChar('3', '3', '#')}><span className="tw-top">#</span><span className="tw-bot">3</span></button>
          <button className={`tw-key${isPressed('4')}`} onClick={() => pressChar('4', '4', '$')}><span className="tw-top">$</span><span className="tw-bot">4</span></button>
          <button className={`tw-key${isPressed('5')}`} onClick={() => pressChar('5', '5', '%')}><span className="tw-top">%</span><span className="tw-bot">5</span></button>
          <button className={`tw-key${isPressed('6')}`} onClick={() => pressChar('6', '6', '-')}><span className="tw-top">-</span><span className="tw-bot">6</span></button>
          <button className={`tw-key${isPressed('7')}`} onClick={() => pressChar('7', '7', '+')}><span className="tw-top">+</span><span className="tw-bot">7</span></button>
          <button className={`tw-key${isPressed('8')}`} onClick={() => pressChar('8', '8', '8')}><span className="tw-top">&nbsp;</span><span className="tw-bot">8</span></button>
          <button className={`tw-key${isPressed('9')}`} onClick={() => pressChar('9', '9', '(')}><span className="tw-top">(</span><span className="tw-bot">9</span></button>
          <button className={`tw-key${isPressed('0')}`} onClick={() => pressChar('0', '0', ')')}><span className="tw-top">)</span><span className="tw-bot">0</span></button>
          <button className={`tw-key tw-wide${isPressed('backspace')}`} onClick={pressBackspace}><span className="tw-bot">BACK<br />SPACE</span></button>
        </div>

        <div className="tw-row tw-indent-1">
          <button className={`tw-key${isPressed('q')}`} onClick={() => pressChar('q', 'q')}>Q</button>
          <button className={`tw-key${isPressed('w')}`} onClick={() => pressChar('w', 'w')}>W</button>
          <button className={`tw-key${isPressed('e')}`} onClick={() => pressChar('e', 'e')}>E</button>
          <button className={`tw-key${isPressed('r')}`} onClick={() => pressChar('r', 'r')}>R</button>
          <button className={`tw-key${isPressed('t')}`} onClick={() => pressChar('t', 't')}>T</button>
          <button className={`tw-key${isPressed('y')}`} onClick={() => pressChar('y', 'y')}>Y</button>
          <button className={`tw-key${isPressed('u')}`} onClick={() => pressChar('u', 'u')}>U</button>
          <button className={`tw-key${isPressed('i')}`} onClick={() => pressChar('i', 'i')}>I</button>
          <button className={`tw-key${isPressed('o')}`} onClick={() => pressChar('o', 'o')}>O</button>
          <button className={`tw-key${isPressed('p')}`} onClick={() => pressChar('p', 'p')}>P</button>
          <button className={`tw-key${isPressed('.')}`} onClick={() => pressChar('.', '.', ':')}><span className="tw-top">:</span><span className="tw-bot">.</span></button>
        </div>

        <div className="tw-row tw-indent-2">
          <button className={`tw-key tw-wide${shiftLock ? ' tw-active' : ''}${isPressed('shiftlock')}`} onClick={pressShiftLock}><span className="tw-bot">SHIFT<br />LOCK</span></button>
          <button className={`tw-key${isPressed('a')}`} onClick={() => pressChar('a', 'a')}>A</button>
          <button className={`tw-key${isPressed('s')}`} onClick={() => pressChar('s', 's')}>S</button>
          <button className={`tw-key${isPressed('d')}`} onClick={() => pressChar('d', 'd')}>D</button>
          <button className={`tw-key${isPressed('f')}`} onClick={() => pressChar('f', 'f')}>F</button>
          <button className={`tw-key${isPressed('g')}`} onClick={() => pressChar('g', 'g')}>G</button>
          <button className={`tw-key${isPressed('h')}`} onClick={() => pressChar('h', 'h')}>H</button>
          <button className={`tw-key${isPressed('j')}`} onClick={() => pressChar('j', 'j')}>J</button>
          <button className={`tw-key${isPressed('k')}`} onClick={() => pressChar('k', 'k')}>K</button>
          <button className={`tw-key${isPressed('l')}`} onClick={() => pressChar('l', 'l')}>L</button>
          <button className={`tw-key${isPressed(';')}`} onClick={() => pressChar(';', ';', ':')}><span className="tw-top">:</span><span className="tw-bot">;</span></button>
        </div>

        <div className="tw-row tw-indent-3">
          <button className={`tw-key tw-wide${shiftHeld ? ' tw-active' : ''}${isPressed('shiftL')}`} onClick={() => pressShift('shiftL')}><span className="tw-bot">SHIFT<br />KEY</span></button>
          <button className={`tw-key${isPressed('z')}`} onClick={() => pressChar('z', 'z')}>Z</button>
          <button className={`tw-key${isPressed('x')}`} onClick={() => pressChar('x', 'x')}>X</button>
          <button className={`tw-key${isPressed('c')}`} onClick={() => pressChar('c', 'c')}>C</button>
          <button className={`tw-key${isPressed('v')}`} onClick={() => pressChar('v', 'v')}>V</button>
          <button className={`tw-key${isPressed('b')}`} onClick={() => pressChar('b', 'b')}>B</button>
          <button className={`tw-key${isPressed('n')}`} onClick={() => pressChar('n', 'n')}>N</button>
          <button className={`tw-key${isPressed('m')}`} onClick={() => pressChar('m', 'm')}>M</button>
          <button className={`tw-key${isPressed(',')}`} onClick={() => pressChar(',', ',', '?')}><span className="tw-top">?</span><span className="tw-bot">,</span></button>
          <button className={`tw-key tw-wide${shiftHeld ? ' tw-active' : ''}${isPressed('shiftR')}`} onClick={() => pressShift('shiftR')}><span className="tw-bot">SHIFT<br />KEY</span></button>
        </div>

        <div className="tw-row tw-spacerow">
          <button className="tw-spacebar" aria-label="Space" onClick={() => pressChar('space', ' ')} />
        </div>
      </div>

      <div className="sim-legend">
        <div className="sim-legend-item">
          <div className="legend-swatch" style={{ background: '#111128', border: '1px solid #333' }} />
          <span>Punched hole</span>
        </div>
        <div className="sim-legend-item">
          <div className="legend-swatch" style={{ background: '#3a3520', border: '1px solid #554' }} />
          <span>Unpunched position</span>
        </div>
      </div>

      <div className="sim-note">
        <p><strong>Hollerith Code:</strong></p>
        <ul style={{ textAlign: 'justify' }}>
          <li><strong>[DIGITS]</strong> punch a single hole in their own row (0–9).</li>
          <li><strong>[LETTERS]</strong> need two holes — a zone punch (row 12, 11, or 0) combined with a digit punch (1–9).</li>
          <li><strong>[A–I]</strong> use zone 12, <strong>[J–R]</strong> use zone 11, <strong>[S–Z]</strong> use zone 0.</li>
          <li><strong>[SHIFT LOCK] and [SHIFT KEY]</strong> toggle the number keys between their digit and symbol characters, just like a real mechanical typewriter.</li>
        </ul>

        <p><strong><br />Note that:</strong></p>
        <ul style={{ textAlign: 'justify' }}>
          <li>This simulator only punches <strong>letters, numbers, and spaces</strong> (symbols are shown but left unpunched to keep the card readable).</li>
          <li>Standard Hollerith code <strong>has no separate lowercase encoding</strong> — letter keys punch the same hole pattern regardless of shift state, matching how the original keypunch machines worked.</li>
        </ul>
      </div>
    </div>
  );
}
