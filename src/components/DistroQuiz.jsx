/**
 * DistroQuiz.jsx
 *
 * A multi-step "which Linux distro fits you?" quiz. The viewer answers a few
 * questions, each answer adds points to different distros, and the highest-scoring
 * distro is shown as the recommendation at the end.
 *
 * ## Learning Notes
 * This component demonstrates several key React concepts:
 * - Multiple pieces of state: We track three things at once with useState --
 *   which screen we're on (`step`), the answers chosen so far (`answers`), and the
 *   option highlighted on the current question (`selected`).
 * 
 * - Conditional rendering: Instead of separate pages, one component shows the
 *   intro, a question, or the result depending on `step`. The `{condition && <…/>}`
 *   pattern renders a block only when the condition is true.
 * 
 * - Lists with .map(): Questions, options, progress bars, and tags are all
 *   arrays turned into JSX with `.map()`. Each item needs a unique `key`.
 * 
 * - Updating state immutably: We never push into the old array. Instead we make
 *   a new one with `[...prev, selected]` so React notices the change and re-renders.
 * 
 * - Data-driven UI: All the content lives in plain objects/arrays near the top
 *   (`questions`, `distros`, `scoring`). The JSX below just renders whatever's there,
 *   so you can edit the quiz without touching the component logic.
 *
 * ## Props
 *   None. The quiz is self-contained -- just drop it in:
 *
 * ## Usage Example
 *   <DistroQuiz />
 *
 * ## How to customize
 *   - Add or edit a question        -> the `questions` array
 *   - Add or edit a distro          -> the `distros` object
 *   - Change how answers score      -> the `scoring` map (answer id -> distro points)
 */

import { useState } from "react";

// -- Quiz data --------------------------------------------
// Each question has display text and a list of options. Every option has a unique
// `id` (used for scoring), a short `label`, and a longer `desc`.
const questions = [
  {
    text: "How much Linux experience do you have?",
    options: [
      { id: "new", label: "New to it", desc: "I've never really used Linux before" },
      { id: "some", label: "Some experience", desc: "I've tinkered with it here and there" },
      { id: "daily", label: "Daily driver", desc: "Linux is already my main OS" },
      { id: "power", label: "Power user", desc: "I compile kernels for fun" },
    ],
  },
  {
    text: "What do you value most in an OS?",
    options: [
      { id: "stability", label: "Rock-solid stability", desc: "I want it to just work, always" },
      { id: "latest", label: "Latest software", desc: "Give me the newest versions" },
      { id: "privacy", label: "Privacy & freedom", desc: "No proprietary blobs, full control" },
      { id: "ease", label: "Ease of use", desc: "Familiar, friendly, no fuss" },
    ],
  },
  {
    text: "How do you feel about the command line?",
    options: [
      { id: "avoid", label: "Rather avoid it", desc: "GUIs please -- all the way" },
      { id: "okay", label: "I don't mind it", desc: "I'll use it when I have to" },
      { id: "good", label: "Comfortable with it", desc: "It's just another tool" },
      { id: "love", label: "I live in it", desc: "The terminal is home" },
    ],
  },
  {
    text: "What will you mainly use Linux for?",
    options: [
      { id: "everyday", label: "Everyday use", desc: "Browsing, office, media, streaming" },
      { id: "dev", label: "Development", desc: "Coding, containers, servers" },
      { id: "gaming", label: "Gaming", desc: "Steam, Proton, game performance" },
      { id: "server", label: "Homelab / server", desc: "Self-hosting, networking, tinkering" },
    ],
  },
  {
    text: "How often do you want your system to update?",
    options: [
      { id: "rare", label: "Set it and forget it", desc: "Updates only when absolutely needed" },
      { id: "regular", label: "Regular cadence", desc: "Predictable 6-month or yearly releases" },
      { id: "bleeding", label: "Always cutting edge", desc: "Latest packages the moment they drop" },
    ],
  },
];

// Every distro the quiz can recommend. The key (e.g. "mint") is what the scoring
// map below refers to; the object holds everything shown on the result screen.
const distros = {
  mint: {
    name: "Linux Mint",
    tagline: "From freedom came elegance",
    year: 2006,
    color: "#87CF3E",
    tags: ["Beginner-friendly", "Stable", "Windows-like", "Ubuntu-based"],
    url: "https://linuxmint.com",
    desc: "The smoothest on-ramp into Linux. Ships with multimedia codecs, proprietary driver support, and a familiar desktop -- it just works from day one.",
  },
  ubuntu: {
    name: "Ubuntu",
    tagline: "Linux for human beings",
    year: 2004,
    color: "#E95420",
    tags: ["Popular", "Well-supported", "Large community", "Debian-based"],
    url: "https://ubuntu.com",
    desc: "The world's most popular Linux distro. A great balance of ease-of-use and modern features, with a massive community and excellent hardware support.",
  },
  fedora: {
    name: "Fedora",
    tagline: "Freedom. Friends. Features. First.",
    year: 2003,
    color: "#3C6EB4",
    tags: ["Cutting-edge", "100% open source", "Developer-focused", "RPM"],
    url: "https://fedoraproject.org",
    desc: "Ships the latest upstream open-source software first. Sponsored by Red Hat, it's the go-to for developers who want bleeding-edge tools on a solid base.",
  },
  debian: {
    name: "Debian",
    tagline: "The universal operating system",
    year: 1993,
    color: "#A80030",
    tags: ["Ultra-stable", "Server-ready", "Massive repo", "Non-commercial"],
    url: "https://debian.org",
    desc: "The rock upon which many distros are built. Packages lag behind intentionally -- but your system will run for years without drama. A server classic.",
  },
  zorin: {
    name: "Zorin OS",
    tagline: "Make your computer better",
    year: 2009,
    color: "#15A4FB",
    tags: ["Beginner-friendly", "Windows-like", "Polished", "Ubuntu-based"],
    url: "https://zorin.com/os/",
    desc: "Designed to feel instantly familiar to Windows and macOS switchers. A polished desktop with layout presets that ease the transition into Linux.",
  },
  manjaro: {
    name: "Manjaro",
    tagline: "Enjoy the simplicity",
    year: 2011,
    color: "#35BF5C",
    tags: ["Rolling release", "Arch-based", "User-friendly", "Cutting-edge"],
    url: "https://manjaro.org",
    desc: "The accessible face of Arch. A rolling release with a friendly installer, pre-configured desktops, and curated updates -- bleeding edge without the assembly.",
  },
  mx: {
    name: "MX Linux",
    tagline: "Simple, stable, and lightweight",
    year: 2014,
    color: "#4A4A6A",
    tags: ["Lightweight", "Stable", "Great tools", "Debian-based"],
    url: "https://mxlinux.org",
    desc: "Consistently tops DistroWatch for good reason. Efficient, ships with excellent MX Tools for system management, and runs well on older hardware.",
  },
  popos: {
    name: "Pop!_OS",
    tagline: "You're in Control",
    year: 2017,
    color: "#48B9C7",
    tags: ["Gaming-ready", "Developer tools", "NVIDIA support", "Ubuntu-based"],
    url: "https://pop.system76.com",
    desc: "System76's distro ships with excellent NVIDIA support, a polished GNOME desktop, and thoughtful workflow tools -- a favourite for developers and gamers alike.",
  },
  endeavour: {
    name: "EndeavourOS",
    tagline: "Start your Endeavour",
    year: 2019,
    color: "#7F3FB8",
    tags: ["Arch-based", "Terminal-centric", "Rolling release", "Near-vanilla"],
    url: "https://endeavouros.com",
    desc: "Arch with a friendly installer and a welcoming community. Stays close to vanilla Arch, so you get the real thing with a gentler starting point.",
  },
  cachyos: {
    name: "CachyOS",
    tagline: "Performance-First Linux",
    year: 2021,
    color: "#00A98F",
    tags: ["Performance-focused", "Arch-based", "Rolling release", "Optimized"],
    url: "https://cachyos.org",
    desc: "An Arch-based distro tuned for speed, with optimized kernels and packages built for modern CPUs. Bleeding edge with raw performance as the priority.",
  },
  arch: {
    name: "Arch Linux",
    tagline: "Do it yourself, your way",
    year: 2002,
    color: "#1793D1",
    tags: ["Rolling release", "DIY", "Bleeding edge", "Highly customizable"],
    url: "https://archlinux.org",
    desc: "Built from scratch to give you exactly the system you want. Rolling releases, a legendary wiki, and total control. btw, I use Arch.",
  },
};

// Maps each answer's id to the distros it rewards, and by how much.
// Example: choosing "new" gives Mint 3 points, Zorin 3, Ubuntu 2, Pop!_OS 1.
// An answer can favour several distros, and many answers can stack onto the same one.
const scoring = {
  new: { mint: 3, zorin: 3, ubuntu: 2, popos: 1 },
  some: { ubuntu: 2, mint: 2, popos: 2, zorin: 1, manjaro: 1 },
  daily: { fedora: 2, debian: 1, mx: 1, manjaro: 1, endeavour: 1 },
  power: { arch: 3, endeavour: 2, cachyos: 2, fedora: 1, debian: 1 },
  stability: { debian: 3, mx: 2, mint: 1, ubuntu: 1 },
  latest: { fedora: 3, arch: 2, manjaro: 2, cachyos: 2, endeavour: 1 },
  privacy: { fedora: 2, debian: 1, arch: 1 },
  ease: { mint: 3, zorin: 3, ubuntu: 2, popos: 1 },
  avoid: { mint: 2, zorin: 2, ubuntu: 1, popos: 1 },
  okay: { ubuntu: 1, popos: 1, fedora: 1, manjaro: 1 },
  good: { fedora: 1, debian: 1, manjaro: 1, mx: 1 },
  love: { arch: 3, endeavour: 2, cachyos: 1, debian: 1 },
  everyday: { mint: 2, zorin: 2, ubuntu: 1, mx: 1 },
  dev: { fedora: 2, arch: 1, popos: 1, ubuntu: 1, endeavour: 1 },
  gaming: { popos: 3, cachyos: 2, manjaro: 1, ubuntu: 1, mint: 1 },
  server: { debian: 3, arch: 1, fedora: 1 },
  rare: { debian: 3, mx: 2, mint: 1 },
  regular: { ubuntu: 2, fedora: 1, zorin: 1, mint: 1, popos: 1 },
  bleeding: { arch: 3, fedora: 2, manjaro: 2, cachyos: 2, endeavour: 2 },
};

// Tally the answers and return the winning distro object.
function getResult(answers) {
  // Start every distro at 0 points: { mint: 0, ubuntu: 0, ... }
  const scores = Object.fromEntries(Object.keys(distros).map((d) => [d, 0]));

  // For each answer the user picked, add its points to the matching distros.
  // `scoring[a] ?? {}` falls back to an empty object if an answer has no points.
  answers.forEach((a) => {
    const pts = scoring[a] ?? {};
    Object.entries(pts).forEach(([d, v]) => { scores[d] += v; });
  });

  // Sort the [distroKey, score] pairs from highest to lowest and take the top one.
  // sort((a, b) => b[1] - a[1]) orders by score descending; [0][0] is that winner's key.
  const winnerKey = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  return distros[winnerKey];
}

// -- Styles -----------------------------------------------
// Some styles are functions that take a flag and return a style object, so the look
// can change with state (e.g. an option button looks different when it's active).
// The var(--…) values are CSS custom properties defined by the page's theme.
const styles = {
  progressBar: (filled) => ({
    flex: 1,
    height: 4,
    borderRadius: 2,
    background: filled ? "var(--color-text-primary)" : "var(--color-border-tertiary)",
    transition: "background 0.2s",
  }),
  optionBtn: (active) => ({
    position: "relative",
    cursor: "pointer",
    textAlign: "left",
    padding: "12px 14px",
    width: "100%",
    display: "block",
    borderRadius: "var(--border-radius-md)",
    border: active
      ? "2px solid var(--color-border-info)"
      : "0.5px solid var(--color-border-secondary)",
    background: active
      ? "var(--color-background-info)"
      : "var(--color-background-primary)",
    boxShadow: active ? "0 0 0 3px var(--color-background-info)" : "none",
    transform: active ? "translateY(-1px)" : "none",
    transition: "border-color 0.12s, background 0.12s, box-shadow 0.12s, transform 0.12s",
    fontFamily: "var(--font-sans)",
  }),
  checkmark: {
    position: "absolute",
    top: 10,
    right: 12,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1,
    color: "var(--color-text-info)",
  },
  nextBtn: (enabled) => ({
    cursor: enabled ? "pointer" : "not-allowed",
    fontSize: 14,
    padding: "8px 18px",
    borderRadius: "var(--border-radius-md)",
    border: "0.5px solid var(--color-border-secondary)",
    background: "transparent",
    color: "var(--color-text-primary)",
    opacity: enabled ? 1 : 0.35,
    fontFamily: "var(--font-sans)",
  }),
  tag: {
    fontSize: 12,
    padding: "3px 10px",
    background: "var(--color-background-secondary)",
    border: "0.5px solid var(--color-border-tertiary)",
    borderRadius: "var(--border-radius-md)",
    color: "var(--color-text-secondary)",
  },
};

export default function DistroQuiz() {
  // `step` drives which screen shows: 0 = intro, 1..totalQ = questions, >totalQ = result.
  const [step, setStep] = useState(0);
  // `answers` collects the chosen option id from each question, in order.
  const [answers, setAnswers] = useState([]);
  // `selected` is the option highlighted on the current question, before "Next" is clicked.
  const [selected, setSelected] = useState(null);

  // These are derived from state -- recalculated on every render, no extra useState needed.
  const totalQ = questions.length;
  const isIntro = step === 0;
  const isResult = step > totalQ;
  const currentQ = questions[step - 1]; // step 1 maps to questions[0], etc.

  // Lock in the selected answer and advance to the next screen.
  function handleNext() {
    if (!selected) return; // do nothing until an option is chosen
    setAnswers((prev) => [...prev, selected]); // new array = React re-renders
    setSelected(null); // clear the highlight for the next question
    setStep((s) => s + 1);
  }

  // Reset everything back to the intro so the quiz can be taken again.
  function handleRestart() {
    setStep(0);
    setAnswers([]);
    setSelected(null);
  }

  // Only compute the result once we've reached the result screen.
  const result = isResult ? getResult(answers) : null;

  return (
    <div style={{ padding: "1.5rem 0", fontFamily: "var(--font-sans)" }}>

      {/* -- Intro -- */}
      {isIntro && (
        <div>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.25rem", fontSize: 15, lineHeight: 1.6 }}>
            Answer 5 quick questions to find the Linux distribution that fits you best.
          </p>
          <button style={styles.nextBtn(true)} onClick={() => setStep(1)}>
            Start the quiz →
          </button>
        </div>
      )}

      {/* -- Question -- (shown when we're past the intro but not yet at the result) */}
      {!isIntro && !isResult && currentQ && (
        <div>
          {/* Progress bars: one per question, filled (i < step) for ones already passed */}
          <div style={{ display: "flex", gap: 6, marginBottom: "1.5rem" }}>
            {questions.map((_, i) => (
              <div key={i} style={styles.progressBar(i < step)} />
            ))}
          </div>

          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 0.4rem" }}>
            Question {step} of {totalQ}
          </p>
          <h3 style={{ margin: "0 0 1.25rem", fontSize: 18, fontWeight: 500 }}>
            {currentQ.text}
          </h3>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 10,
            marginBottom: "1.25rem",
          }}>
            {/* Render one button per option. Clicking sets it as `selected`;
                isSelected then drives the styling and the checkmark below. */}
            {currentQ.options.map((opt) => {
              const isSelected = selected === opt.id;
              return (
                <button
                  key={opt.id}
                  style={styles.optionBtn(isSelected)}
                  onClick={() => setSelected(opt.id)}
                  aria-pressed={isSelected}
                >
                  {isSelected && <span style={styles.checkmark}>✓</span>}
                  <div style={{
                    fontWeight: isSelected ? 600 : 500,
                    fontSize: 14,
                    color: isSelected ? "var(--color-text-info)" : "var(--color-text-primary)",
                    marginBottom: 3,
                    paddingRight: 16,
                  }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Button label changes on the last question. It's disabled until an
              option is picked (!!selected turns the value into a true/false). */}
          <button style={styles.nextBtn(!!selected)} disabled={!selected} onClick={handleNext}>
            {step === totalQ ? "See my result ->" : "Next ->"}
          </button>
        </div>
      )}

      {/* -- Result -- (the winning distro from getResult) */}
      {isResult && result && (
        <div>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 0.5rem" }}>
            Your recommended distro
          </p>
          <div style={{
            background: "var(--color-background-primary)",
            border: "2px solid var(--color-border-info)",
            borderRadius: "var(--border-radius-lg)",
            padding: "1.25rem",
            marginBottom: "1rem",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: result.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {result.name}
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", fontStyle: "italic" }}>
                  {result.tagline}
                </div>
              </div>
              <span style={{
                fontSize: 12, padding: "3px 10px",
                background: "var(--color-background-info)", color: "var(--color-text-info)",
                borderRadius: "var(--border-radius-md)", whiteSpace: "nowrap",
              }}>
                Since {result.year}
              </span>
            </div>

            {/* Description */}
            <p style={{ margin: "0 0 1rem", fontSize: 14, lineHeight: 1.65, color: "var(--color-text-primary)" }}>
              {result.desc}
            </p>

            {/* Tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "1rem" }}>
              {result.tags.map((t) => (
                <span key={t} style={styles.tag}>{t}</span>
              ))}
            </div>

            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: "var(--color-text-info)" }}
            >
              Official website ↗
            </a>
          </div>

          <button style={styles.nextBtn(true)} onClick={handleRestart}>
            ↺ Retake quiz
          </button>
        </div>
      )}
    </div>
  );
}
