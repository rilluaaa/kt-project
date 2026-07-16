"use client";

import { CSSProperties, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Beat = {
  id: string;
  image: number;
  place?: string;
  text: string[];
  align: "left" | "right" | "center";
  focus: [number, number];
  scale: number;
  dark?: boolean;
  heritage?: string;
  interaction?: string;
};

const sceneImages = [
  "/ink/scene-01-mountain-city.webp",
  "/ink/scene-02-street-crafts.webp",
  "/ink/scene-03-estate-night.webp",
  "/ink/scene-04-harbour-port.webp",
  "/ink/scene-05-tsing-yi-opera.webp",
  "/ink/scene-06-mooncake-home.webp",
];

const beats: Beat[] = [
  {
    id: "mist",
    image: 0,
    place: "山脊 · 清晨",
    text: ["霧還未散。", "山城在紙上，靜靜呼吸。"],
    align: "left",
    focus: [36, 42],
    scale: 1.02,
  },
  {
    id: "ink-falls",
    image: 0,
    text: ["一滴沒有名字的墨，", "沿着石縫，向城市落下。"],
    align: "right",
    focus: [52, 48],
    scale: 1.08,
  },
  {
    id: "youth-follows",
    image: 0,
    text: ["青年跟在後面。", "他不知道，墨裏藏着誰的記憶。"],
    align: "left",
    focus: [66, 60],
    scale: 1.13,
  },
  {
    id: "estate-morning",
    image: 1,
    place: "葵涌 · 屋邨醒來",
    text: ["巴士駛過，鐵閘升起。", "城市在杯碟聲中醒來。"],
    align: "right",
    focus: [34, 48],
    scale: 1.03,
  },
  {
    id: "milk-tea",
    image: 1,
    text: ["滾燙的茶湯，被反覆拉成一條線。", "高低之間，是老師傅留下的節奏。"],
    align: "left",
    focus: [55, 51],
    scale: 1.11,
    heritage: "港式奶茶製作技藝",
    interaction: "沖開茶香",
  },
  {
    id: "tea-memory",
    image: 1,
    text: ["墨滴染上茶色。", "也記起第一種溫度。"],
    align: "center",
    focus: [68, 56],
    scale: 1.18,
  },
  {
    id: "wood-door",
    image: 1,
    place: "舊工業區 · 午後",
    text: ["半掩的門後，", "機器聲裏混着淡淡木香。"],
    align: "right",
    focus: [72, 50],
    scale: 1.06,
  },
  {
    id: "wood-carving",
    image: 1,
    text: ["每一刀，都不是把木頭移走。", "而是讓藏在裏面的形狀，被重新看見。"],
    align: "left",
    focus: [82, 52],
    scale: 1.2,
    heritage: "木雕刻技藝",
    interaction: "刻出木紋",
  },
  {
    id: "estate-gathering",
    image: 2,
    place: "石籬、石蔭、安蔭 · 入夜",
    text: ["球場亮起燈。", "竹、布、香火與人，慢慢聚到屋邨中央。"],
    align: "right",
    focus: [34, 50],
    scale: 1.03,
    dark: true,
  },
  {
    id: "yulan",
    image: 2,
    text: ["青年遞上一張凳，也接過一盞燈。", "地方，因為有人願意相聚而存在。"],
    align: "left",
    focus: [52, 53],
    scale: 1.12,
    dark: true,
    heritage: "石籬、石蔭、安蔭盂蘭勝會",
    interaction: "點亮紙燈",
  },
  {
    id: "neon-workshop",
    image: 2,
    place: "工廈 · 深夜",
    text: ["火焰靠近玻璃。", "一條直線，被慢慢屈成城市的光。"],
    align: "right",
    focus: [69, 43],
    scale: 1.17,
    dark: true,
  },
  {
    id: "neon",
    image: 2,
    text: ["起、承、轉、合。", "霓虹，也是寫在夜色上的一筆。"],
    align: "left",
    focus: [76, 54],
    scale: 1.23,
    dark: true,
    heritage: "霓虹光管製作及造型技藝",
    interaction: "讓墨線發光",
  },
  {
    id: "road-to-sea",
    image: 3,
    place: "貨櫃碼頭 · 黎明以前",
    text: ["道路變闊。", "吊臂從海霧裏升起。"],
    align: "right",
    focus: [32, 48],
    scale: 1.02,
    dark: true,
  },
  {
    id: "containers",
    image: 3,
    text: ["貨櫃一格一格堆疊，", "像城市蓋給遠方的方印。"],
    align: "left",
    focus: [58, 55],
    scale: 1.1,
    dark: true,
  },
  {
    id: "crossing",
    image: 3,
    text: ["船、貨車、工人與潮水，", "沿着各自看不見的路前行。"],
    align: "center",
    focus: [76, 48],
    scale: 1.16,
    dark: true,
  },
  {
    id: "opera-arrives",
    image: 4,
    place: "青衣 · 戲棚",
    text: ["墨水渡過海面。", "一座戲棚，在風裏逐筆成形。"],
    align: "right",
    focus: [34, 48],
    scale: 1.03,
    dark: true,
  },
  {
    id: "chun-kwan",
    image: 4,
    text: ["有人描眉，有人試鑼。", "真君誕開台，台下的人一同抬頭。"],
    align: "left",
    focus: [56, 48],
    scale: 1.13,
    dark: true,
    heritage: "青衣真君誕",
    interaction: "讓戲棚開台",
  },
  {
    id: "tin-hau",
    image: 4,
    text: ["布景換過，香案重整。", "同一座棚，又接住另一個願。"],
    align: "right",
    focus: [72, 49],
    scale: 1.2,
    dark: true,
    heritage: "青衣天后誕",
    interaction: "送出祝願",
  },
  {
    id: "home",
    image: 5,
    place: "一盞家燈 · 夜深",
    text: ["青年回到一張暖着的飯桌。", "有人搓圓蓮蓉，有人拿出用過多年的木模。"],
    align: "left",
    focus: [35, 50],
    scale: 1.03,
  },
  {
    id: "mooncake",
    image: 5,
    text: ["一按、一敲，花紋出現。", "每年回來的，不只是味道。"],
    align: "right",
    focus: [58, 51],
    scale: 1.12,
    heritage: "月餅製作技藝",
    interaction: "印下團圓",
  },
  {
    id: "remember",
    image: 5,
    text: ["墨滴終於記起——", "自己來自無數雙手，無數次相聚。"],
    align: "center",
    focus: [74, 50],
    scale: 1.18,
  },
];

type AudioEngine = {
  context: AudioContext;
  master: GainNode;
  music: GainNode;
  ambience: GainNode;
  filter: BiquadFilterNode;
  delay: DelayNode;
  timer: number;
};

function createNoiseBuffer(context: AudioContext, seconds: number) {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (0.55 + Math.sin(index / 16000) * 0.25);
  }
  return buffer;
}

function buildSoundtrack(): AudioEngine | null {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;

  const context = new AudioCtor();
  const master = context.createGain();
  const music = context.createGain();
  const ambience = context.createGain();
  const filter = context.createBiquadFilter();
  const delay = context.createDelay(2.5);
  const delayFeedback = context.createGain();
  const compressor = context.createDynamicsCompressor();

  master.gain.value = 0.54;
  music.gain.value = 0.34;
  ambience.gain.value = 0.12;
  filter.type = "lowpass";
  filter.frequency.value = 2100;
  filter.Q.value = 0.8;
  delay.delayTime.value = 0.46;
  delayFeedback.gain.value = 0.24;
  compressor.threshold.value = -22;
  compressor.knee.value = 18;
  compressor.ratio.value = 4;

  delay.connect(delayFeedback).connect(delay);
  music.connect(filter).connect(master);
  music.connect(delay).connect(master);
  ambience.connect(master);
  master.connect(compressor).connect(context.destination);

  const wind = context.createBufferSource();
  const windFilter = context.createBiquadFilter();
  const windGain = context.createGain();
  wind.buffer = createNoiseBuffer(context, 8);
  wind.loop = true;
  windFilter.type = "bandpass";
  windFilter.frequency.value = 420;
  windFilter.Q.value = 0.45;
  windGain.gain.value = 0.09;
  wind.connect(windFilter).connect(windGain).connect(ambience);
  wind.start();

  [55, 82.5, 110].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index === 2 ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = index === 0 ? 0.055 : 0.022;
    oscillator.connect(gain).connect(music);
    oscillator.start();
  });

  const pentatonic = [220, 247, 294, 330, 392, 440, 392, 330, 294, 247];
  const melody = [0, 2, 4, -1, 3, 2, 1, -1, 0, 2, 5, 4, 3, -1, 2, 1, 0, -1, 1, 3, 4, -1, 2, 0, 1, 2, 4, 3, 2, -1, 1, 0];
  let step = 0;
  const beatMs = 480;

  const pluck = (frequency: number, now: number, duration = 1.8, volume = 0.1) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const tone = context.createBiquadFilter();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.998, now + duration);
    tone.type = "lowpass";
    tone.frequency.setValueAtTime(2700, now);
    tone.frequency.exponentialRampToValueAtTime(700, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(tone).connect(gain).connect(music);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.05);
  };

  const bass = (frequency: number, now: number) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, now + 1.2);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.13, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    oscillator.connect(gain).connect(music);
    oscillator.start(now);
    oscillator.stop(now + 1.5);
  };

  const wood = (now: number, bright = false) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(bright ? 1260 : 760, now);
    oscillator.frequency.exponentialRampToValueAtTime(bright ? 680 : 390, now + 0.16);
    gain.gain.setValueAtTime(bright ? 0.045 : 0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    oscillator.connect(gain).connect(music);
    oscillator.start(now);
    oscillator.stop(now + 0.22);
  };

  const chord = (root: number, now: number) => {
    [1, 1.5, 2].forEach((ratio, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.value = root * ratio;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(index === 0 ? 0.042 : 0.018, now + 1.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 7.2);
      oscillator.connect(gain).connect(music);
      oscillator.start(now);
      oscillator.stop(now + 7.4);
    });
  };

  const timer = window.setInterval(() => {
    if (context.state !== "running") return;
    const now = context.currentTime + 0.03;
    const index = step % melody.length;
    const note = melody[index];
    if (note >= 0) pluck(pentatonic[note], now, index % 8 === 0 ? 2.7 : 1.6, index % 4 === 0 ? 0.12 : 0.075);
    if (index % 8 === 0) bass(index % 16 === 0 ? 55 : 73.4, now);
    if (index % 4 === 2) wood(now, index % 8 === 6);
    if (index % 16 === 0) chord(index % 32 === 0 ? 110 : 98, now);
    if (index === 15 || index === 31) pluck(587, now + 0.18, 4.6, 0.045);
    step += 1;
  }, beatMs);

  return { context, master, music, ambience, filter, delay, timer };
}

function InkTrail({ visible }: { visible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    type Drop = { x: number; y: number; r: number; alpha: number; drift: number };
    const drops: Drop[] = [];
    let previous = { x: -100, y: -100 };
    let frame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const pointer = (event: globalThis.PointerEvent) => {
      if (!visible || (event.pointerType === "touch" && event.buttons === 0)) return;
      const distance = Math.hypot(event.clientX - previous.x, event.clientY - previous.y);
      const count = Math.min(5, Math.max(1, Math.round(distance / 14)));
      for (let index = 0; index < count; index += 1) {
        const mix = count === 1 ? 1 : index / (count - 1);
        drops.push({
          x: previous.x < 0 ? event.clientX : previous.x + (event.clientX - previous.x) * mix,
          y: previous.y < 0 ? event.clientY : previous.y + (event.clientY - previous.y) * mix,
          r: 4 + Math.random() * 8,
          alpha: 0.22 + Math.random() * 0.16,
          drift: (Math.random() - 0.5) * 0.16,
        });
      }
      previous = { x: event.clientX, y: event.clientY };
      if (drops.length > 220) drops.splice(0, drops.length - 220);
    };
    const draw = () => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      context.globalCompositeOperation = "multiply";
      for (let index = drops.length - 1; index >= 0; index -= 1) {
        const drop = drops[index];
        drop.alpha *= 0.966;
        drop.r += 0.08;
        drop.y += drop.drift;
        if (drop.alpha < 0.006) {
          drops.splice(index, 1);
          continue;
        }
        const wash = context.createRadialGradient(drop.x, drop.y, 0, drop.x, drop.y, drop.r);
        wash.addColorStop(0, `rgba(8, 12, 10, ${drop.alpha})`);
        wash.addColorStop(0.52, `rgba(16, 19, 17, ${drop.alpha * 0.46})`);
        wash.addColorStop(1, "rgba(20, 22, 20, 0)");
        context.fillStyle = wash;
        context.beginPath();
        context.arc(drop.x, drop.y, drop.r, 0, Math.PI * 2);
        context.fill();
      }
      frame = window.requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", pointer, { passive: true });
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", pointer);
      window.cancelAnimationFrame(frame);
    };
  }, [visible]);

  return <canvas className="ink-trail" ref={canvasRef} aria-hidden="true" />;
}

export default function Home() {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [activeBeat, setActiveBeat] = useState(0);
  const [muted, setMuted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [blooming, setBlooming] = useState(false);
  const storyRef = useRef<HTMLElement>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const holdFrame = useRef<number | null>(null);
  const holdStarted = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const began = performance.now();
    let completed = 0;
    let displayed = 0;
    const ticker = window.setInterval(() => {
      displayed = Math.min(91, displayed + (displayed < 56 ? 2 : 1));
      if (!cancelled) setProgress(displayed);
    }, 58);

    Promise.all(sceneImages.map((src) => new Promise<void>((resolve) => {
      const image = new Image();
      const done = () => {
        completed += 1;
        displayed = Math.max(displayed, Math.round((completed / sceneImages.length) * 92));
        resolve();
      };
      image.onload = done;
      image.onerror = done;
      image.src = src;
    }))).then(() => {
      const minimum = Math.max(0, 2900 - (performance.now() - began));
      window.setTimeout(() => {
        if (cancelled) return;
        window.clearInterval(ticker);
        setProgress(100);
        window.setTimeout(() => setReady(true), 380);
      }, minimum);
    });

    return () => {
      cancelled = true;
      window.clearInterval(ticker);
    };
  }, []);

  const startSoundtrack = useCallback(async () => {
    if (!audioRef.current) audioRef.current = buildSoundtrack();
    const engine = audioRef.current;
    if (!engine) return;
    try {
      await engine.context.resume();
      engine.master.gain.setTargetAtTime(muted ? 0 : 0.54, engine.context.currentTime, 0.45);
    } catch {
      // Mobile browsers may wait for the start gesture.
    }
  }, [muted]);

  useEffect(() => {
    if (ready) void startSoundtrack();
  }, [ready, startSoundtrack]);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-beat]"));
    const observer = new IntersectionObserver((entries) => {
      const current = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (current) setActiveBeat(Number((current.target as HTMLElement).dataset.beat || 0));
    }, { threshold: [0.32, 0.52, 0.72] });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    const engine = audioRef.current;
    if (!engine) return;
    const image = beats[activeBeat]?.image || 0;
    engine.filter.frequency.setTargetAtTime(1550 + image * 230, engine.context.currentTime, 1.5);
    engine.ambience.gain.setTargetAtTime(image === 3 ? 0.19 : image >= 4 ? 0.15 : 0.1, engine.context.currentTime, 1.5);
  }, [activeBeat]);

  useEffect(() => {
    setHoldProgress(0);
    if (holdFrame.current) window.cancelAnimationFrame(holdFrame.current);
    holdFrame.current = null;
  }, [activeBeat]);

  useEffect(() => () => {
    const engine = audioRef.current;
    if (engine) {
      window.clearInterval(engine.timer);
      void engine.context.close();
    }
  }, []);

  const current = beats[Math.min(activeBeat, beats.length - 1)];
  const activeInteraction = current?.interaction && !revealed.has(current.id) ? current.interaction : null;

  const completeHold = useCallback(() => {
    if (!current?.interaction || revealed.has(current.id)) return;
    setRevealed((previous) => new Set(previous).add(current.id));
    setHoldProgress(100);
    setBlooming(true);
    window.setTimeout(() => setBlooming(false), 1500);
  }, [current, revealed]);

  const beginHold = useCallback(() => {
    if (!activeInteraction || holdFrame.current) return;
    holdStarted.current = performance.now();
    const draw = (time: number) => {
      const next = Math.min(100, ((time - holdStarted.current) / 1250) * 100);
      setHoldProgress(next);
      if (next >= 100) {
        holdFrame.current = null;
        completeHold();
      } else {
        holdFrame.current = window.requestAnimationFrame(draw);
      }
    };
    holdFrame.current = window.requestAnimationFrame(draw);
  }, [activeInteraction, completeHold]);

  const endHold = useCallback(() => {
    if (holdFrame.current) window.cancelAnimationFrame(holdFrame.current);
    holdFrame.current = null;
    if (!revealed.has(current.id)) setHoldProgress(0);
  }, [current?.id, revealed]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!activeInteraction) return;
    const target = event.target as HTMLElement;
    if (target.closest(".topbar") || target.closest(".explore-button")) return;
    beginHold();
  };

  const startJourney = async () => {
    await startSoundtrack();
    setStarted(true);
    window.setTimeout(() => storyRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" }), 110);
  };

  const toggleSound = async () => {
    if (!audioRef.current) await startSoundtrack();
    const next = !muted;
    setMuted(next);
    const engine = audioRef.current;
    if (engine) engine.master.gain.setTargetAtTime(next ? 0 : 0.54, engine.context.currentTime, 0.35);
  };

  const activeImage = current?.image || 0;
  const visualStyle = useMemo(() => ({
    "--focus-x": `${current?.focus[0] || 50}%`,
    "--focus-y": `${current?.focus[1] || 50}%`,
    "--scene-scale": String(current?.scale || 1),
  } as CSSProperties), [current]);

  return (
    <main
      className={`experience${started ? " is-started" : ""}${current?.dark ? " is-dark" : ""}${blooming ? " is-blooming" : ""}${reducedMotion ? " reduce-motion" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerUp={endHold}
      onPointerCancel={endHold}
      onPointerLeave={endHold}
    >
      <InkTrail visible={ready} />

      <div className={`loader${ready ? " is-ready" : ""}${started ? " is-hidden" : ""}`}>
        <div className="loader-scene" aria-hidden="true" />
        <div className="loader-wash" aria-hidden="true" />
        {!ready ? (
          <div className="loading-mark" role="status" aria-live="polite">
            <div className="loading-drop" aria-hidden="true"><i /></div>
            <span>墨跡正在展開</span>
            <strong>{String(progress).padStart(2, "0")}<small>%</small></strong>
          </div>
        ) : (
          <div className="opening-title">
            <p>一滴墨，流過山城與海港</p>
            <h1>墨脈葵青</h1>
            <button onClick={startJourney} className="journey-start">
              <span>開始旅程</span><i aria-hidden="true" />
            </button>
            <small>建議開啟聲音</small>
          </div>
        )}
      </div>

      <header className="topbar">
        <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" })}>墨脈葵青</button>
        <div>
          <button onClick={() => setReducedMotion((value) => !value)}>{reducedMotion ? "恢復動畫" : "減少動畫"}</button>
          <button className="sound" onClick={toggleSound} aria-pressed={!muted}>
            <span>{muted ? "開啟聲音" : "聲音"}</span><i className={muted ? "muted" : ""} aria-hidden="true"><b /><b /><b /><b /></i>
          </button>
        </div>
      </header>

      <div className="visual-stack" style={visualStyle} aria-hidden="true">
        {sceneImages.map((image, index) => (
          <div
            className={`visual-layer${activeImage === index ? " is-active" : ""}${Array.from(revealed).some((id) => beats.find((beat) => beat.id === id)?.image === index) ? " is-revealed" : ""}`}
            style={{ backgroundImage: `url(${image})` }}
            key={image}
          />
        ))}
        <div className="continuous-ink" />
        <div className="paper-grain" />
      </div>

      <div className="ink-bloom" aria-hidden="true"><i /><i /><i /></div>

      {activeInteraction && (
        <button
          className="ink-control"
          style={{ "--ink-progress": `${holdProgress / 100}` } as CSSProperties}
          onPointerDown={(event) => { event.stopPropagation(); beginHold(); }}
          onPointerUp={(event) => { event.stopPropagation(); endHold(); }}
          onPointerCancel={endHold}
          aria-label={activeInteraction}
        >
          <i className="ink-control__fill" aria-hidden="true" />
          <span>{activeInteraction}</span>
        </button>
      )}

      <section className="scroll-story" ref={storyRef} aria-label="墨脈葵青故事">
        {beats.map((beat, index) => (
          <article
            className={`story-beat align-${beat.align}${beat.dark ? " text-light" : ""}${activeBeat === index ? " is-current" : ""}`}
            data-beat={index}
            key={beat.id}
          >
            <div className="beat-copy">
              {beat.place && <p className="place">{beat.place}</p>}
              {beat.text.map((line) => <p className="line" key={line}>{line}</p>)}
              {beat.heritage && <p className="heritage">{beat.heritage}</p>}
            </div>
          </article>
        ))}

        <article className="ending" data-beat={beats.length}>
          <div>
            <p>墨還未乾。</p>
            <h2>下一筆，<br />由我們續寫。</h2>
            <button className="explore-button" onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" })}>
              探索葵青 <span aria-hidden="true">↗</span>
            </button>
            <small>探索內容即將展開</small>
          </div>
        </article>
      </section>
    </main>
  );
}
