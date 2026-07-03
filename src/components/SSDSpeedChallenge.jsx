import { useState, useRef, useCallback } from 'react';
import { Cpu, HardDrive, Zap, RotateCcw } from 'lucide-react';

// --- Device profiles, sourced from the article's own numbers ---
// concurrency: how many requests the device can service at once
// stepMs: time for one request to complete once it's being serviced
// latencyLabel / iops / throughput: display stats
const DEVICES = {
  hdd: {
    label: 'HDD',
    sub: '7,200 RPM',
    icon: HardDrive,
    accent: '#FF0080',
    concurrency: 1,
    stepMs: 480,
    latency: '~6 ms',
    iops: '~150',
    throughput: '~150 MB/s',
    barPct: { speed: 12, latency: 95, iops: 4 },
    blurb: 'One request at a time — the arm has to physically seek before each read.',
    legend: 'One request serviced at a time (physical seek).',
  },
  sata: {
    label: 'SATA SSD',
    sub: 'AHCI · 1 queue × 32',
    icon: Zap,
    accent: '#00FFFF',
    concurrency: 6,
    stepMs: 140,
    latency: '~100 µs',
    iops: '~50,000',
    throughput: '~550 MB/s',
    barPct: { speed: 55, latency: 15, iops: 45 },
    blurb: 'No seek time, but AHCI still caps the drive to a single command queue.',
    legend: 'No seek time, but capped to one AHCI queue, 32 commands deep.',
  },
  nvme: {
    label: 'NVMe SSD',
    sub: 'PCIe · 65,535 queues',
    icon: Cpu,
    accent: '#39FF14',
    concurrency: 16,
    stepMs: 70,
    latency: '~20 µs',
    iops: '1,000,000+',
    throughput: '~7,000 MB/s',
    barPct: { speed: 100, latency: 3, iops: 100 },
    blurb: 'Thousands of queues in flight at once — requests barely wait at all.',
    legend: 'Talks directly over PCIe with up to 65,535 parallel queues.',
  },
};

const ORDER = ['hdd', 'sata', 'nvme'];
const QUEUE_SIZE = 16;

function makeQueue() {
  return Array.from({ length: QUEUE_SIZE }, (_, i) => ({
    id: i,
    addr: '0x' + Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0').toUpperCase(),
    status: 'queued', // queued | active | done
  }));
}

export default function SSDSpeedChallenge() {
  const [deviceKey, setDeviceKey] = useState('nvme');
  const [queue, setQueue] = useState(makeQueue);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const timers = useRef([]);

  const device = DEVICES[deviceKey];
  const Icon = device.icon;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const selectDevice = (key) => {
    if (running) return;
    setDeviceKey(key);
    setQueue(makeQueue());
    setCycles(0);
  };

  const reset = () => {
    clearTimers();
    setRunning(false);
    setDeviceKey('nvme');
    setQueue(makeQueue());
    setCycles(0);
  };

  const runQueue = useCallback(() => {
    clearTimers();
    const fresh = makeQueue();
    setQueue(fresh);
    setRunning(true);
    setCycles(0);

    const { concurrency, stepMs } = DEVICES[deviceKey];
    let pending = fresh.map((r) => r.id);
    let batchIndex = 0;

    const runBatch = () => {
      if (pending.length === 0) {
        setRunning(false);
        return;
      }
      const batch = pending.slice(0, concurrency);
      pending = pending.slice(concurrency);
      batchIndex += 1;
      setCycles(batchIndex);

      setQueue((prev) =>
        prev.map((r) => (batch.includes(r.id) ? { ...r, status: 'active' } : r))
      );

      const t1 = setTimeout(() => {
        setQueue((prev) =>
          prev.map((r) => (batch.includes(r.id) ? { ...r, status: 'done' } : r))
        );
        const t2 = setTimeout(runBatch, 90);
        timers.current.push(t2);
      }, stepMs);
      timers.current.push(t1);
    };

    runBatch();
  }, [deviceKey]);

  return (
    <div
      className="w-full max-w-3xl mx-auto border-2 rounded-md overflow-hidden bg-black"
      style={{ borderColor: device.accent, fontFamily: "'Space Mono', monospace" }}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black border-b-2" style={{ borderColor: device.accent }}>
        <span
          className="text-xs sm:text-sm tracking-[0.2em] uppercase"
          style={{ color: device.accent, fontFamily: "'Mokoto Glitch', 'Space Mono', monospace" }}
        >
          SSD Speed Challenge
        </span>
        <button
          onClick={reset}
          className="flex items-center gap-1 text-[10px] sm:text-xs uppercase tracking-wide text-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors"
          aria-label="Reset simulator to NVMe SSD"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 p-4">
        {/* Device selector */}
        <div className="flex sm:flex-col gap-2" role="group" aria-label="Storage device selector">
          {ORDER.map((key) => {
            const d = DEVICES[key];
            const DIcon = d.icon;
            const selected = key === deviceKey;
            return (
              <button
                key={key}
                onClick={() => selectDevice(key)}
                disabled={running}
                aria-pressed={selected}
                className="flex-1 sm:flex-none flex sm:flex-col items-center gap-1 sm:gap-1.5 border rounded px-2 py-2 text-center transition-all disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  borderColor: selected ? d.accent : '#333',
                  backgroundColor: selected ? `${d.accent}1A` : 'transparent',
                  color: selected ? d.accent : '#888',
                  outlineColor: d.accent,
                }}
              >
                <DIcon size={16} aria-hidden="true" />
                <span className="text-[10px] sm:text-xs font-bold">{d.label}</span>
                <span className="hidden sm:block text-[9px] text-white/40">{d.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Main panel */}
        <div className="flex flex-col gap-4">
          {/* Data path: CPU <-> device */}
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded px-4 py-3">
            <div className="flex flex-col items-center gap-1">
              <div className="border border-white/30 rounded p-2">
                <Cpu size={22} className="text-white/80" aria-hidden="true" />
              </div>
              <span className="text-[9px] text-white/40 uppercase">CPU</span>
            </div>

            <div className="flex-1 mx-3 h-px relative" style={{ backgroundColor: `${device.accent}44` }}>
              {running && (
                <div
                  className="absolute -top-[3px] h-[7px] w-[7px] rounded-full animate-pulse"
                  style={{ backgroundColor: device.accent, left: `${(cycles * 37) % 90}%` }}
                />
              )}
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="border rounded p-2" style={{ borderColor: device.accent }}>
                <Icon size={22} style={{ color: device.accent }} aria-hidden="true" />
              </div>
              <span className="text-[9px] uppercase" style={{ color: device.accent }}>
                {device.label}
              </span>
            </div>
          </div>

          {/* Request queue visualization */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-white/40 uppercase tracking-wide">
                Read Queue — {device.concurrency === 1 ? 'sequential' : `${device.concurrency}-wide parallel`}
              </span>
              <button
                onClick={runQueue}
                disabled={running}
                className="text-[10px] uppercase tracking-wide border rounded px-3 py-1 transition-colors disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: device.accent, color: device.accent, outlineColor: device.accent }}
              >
                {running ? 'Running…' : 'Fire Queue'}
              </button>
            </div>
            <div className="grid grid-cols-8 gap-1.5" role="img" aria-label={`${QUEUE_SIZE} pending read requests, ${device.concurrency === 1 ? 'serviced one at a time' : `serviced ${device.concurrency} at a time`}`}>
              {queue.map((r) => (
                <div
                  key={r.id}
                  className="aspect-square rounded-sm flex items-center justify-center text-[8px] transition-all duration-150"
                  style={{
                    backgroundColor:
                      r.status === 'done'
                        ? `${device.accent}33`
                        : r.status === 'active'
                        ? device.accent
                        : '#1a1a1a',
                    color: r.status === 'active' ? '#000' : '#555',
                    border: `1px solid ${r.status === 'queued' ? '#2a2a2a' : device.accent}`,
                  }}
                  title={r.addr}
                >
                  {r.status === 'active' ? '●' : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Stats bars */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Access Speed', pct: device.barPct.speed, value: device.throughput },
              { label: 'Latency', pct: device.barPct.latency, value: device.latency },
              { label: 'IOPS', pct: device.barPct.iops, value: device.iops },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1.5">
                <div className="w-full h-20 bg-white/5 rounded-sm relative flex items-end overflow-hidden">
                  <div
                    className="w-full transition-all duration-500 ease-out"
                    style={{ height: `${Math.max(stat.pct, 4)}%`, backgroundColor: device.accent }}
                  />
                </div>
                <span className="text-[9px] text-white/40 uppercase tracking-wide">{stat.label}</span>
                <span className="text-[10px] font-bold" style={{ color: device.accent }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-white/50 leading-relaxed border-t border-white/10 pt-3">
            {device.blurb}
          </p>

          {/* Legend: explains each interface's communication method, per the
              proposal's "Explanations of SATA and NVMe communication methods" */}
          <div className="flex flex-col gap-1.5 border-t border-white/10 pt-3">
            {ORDER.map((key) => {
              const d = DEVICES[key];
              return (
                <div key={key} className="flex items-start gap-2">
                  <span
                    className="mt-[3px] h-2 w-2 rounded-sm shrink-0"
                    style={{ backgroundColor: d.accent }}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] text-white/50 leading-relaxed">
                    <span className="font-bold" style={{ color: d.accent }}>
                      {d.label}
                    </span>{' '}
                    — {d.legend}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[9px] text-white/30 leading-relaxed">
            <span className="font-bold text-white/40">Simplified model:</span> concurrency and
            per-request timing above are illustrative, scaled from each interface's real queue
            depth and typical latency — not a cycle-accurate simulation of controller firmware.
          </p>
        </div>
      </div>
    </div>
  );
}