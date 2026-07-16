"use client";

import { CSSProperties, lazy, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

const ThreeMountainStage = lazy(() => import("./ThreeMountainStage"));
const ThreeInkOpening = lazy(() => import("./ThreeInkOpening"));

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

type CameraKeyframe = {
  yaw: number;
  pitch: number;
  roll: number;
  depth: number;
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
  { id: "mist", image: 0, place: "山脊 · 清晨", text: ["霧還未散。", "山城在紙上，靜靜呼吸。"], align: "left", focus: [36, 42], scale: 1.02 },
  { id: "ink-falls", image: 0, text: ["一滴沒有名字的墨，", "沿着石縫，向城市落下。"], align: "right", focus: [52, 48], scale: 1.08 },
  { id: "youth-follows", image: 0, text: ["青年跟在後面。", "他不知道，墨裏藏着誰的記憶。"], align: "left", focus: [66, 60], scale: 1.13 },
  { id: "estate-morning", image: 1, place: "葵涌 · 屋邨醒來", text: ["巴士駛過，鐵閘升起。", "城市在杯碟聲中醒來。"], align: "right", focus: [34, 48], scale: 1.03 },
  { id: "milk-tea", image: 1, text: ["滾燙的茶湯，被反覆拉成一條線。", "高低之間，是老師傅留下的節奏。"], align: "left", focus: [55, 51], scale: 1.11, heritage: "港式奶茶製作技藝", interaction: "沖開茶香" },
  { id: "tea-memory", image: 1, text: ["墨滴染上茶色。", "也記起第一種溫度。"], align: "center", focus: [68, 56], scale: 1.18 },
  { id: "wood-door", image: 1, place: "舊工業區 · 午後", text: ["半掩的門後，", "機器聲裏混着淡淡木香。"], align: "right", focus: [72, 50], scale: 1.06 },
  { id: "wood-carving", image: 1, text: ["每一刀，都不是把木頭移走。", "而是讓藏在裏面的形狀，被重新看見。"], align: "left", focus: [82, 52], scale: 1.2, heritage: "木雕刻技藝", interaction: "刻出木紋" },
  { id: "estate-gathering", image: 2, place: "石籬、石蔭、安蔭 · 入夜", text: ["球場亮起燈。", "竹、布、香火與人，慢慢聚到屋邨中央。"], align: "right", focus: [34, 50], scale: 1.03, dark: true },
  { id: "yulan", image: 2, text: ["青年遞上一張凳，也接過一盞燈。", "地方，因為有人願意相聚而存在。"], align: "left", focus: [52, 53], scale: 1.12, dark: true, heritage: "石籬、石蔭、安蔭盂蘭勝會", interaction: "點亮紙燈" },
  { id: "neon-workshop", image: 2, place: "工廈 · 深夜", text: ["火焰靠近玻璃。", "一條直線，被慢慢屈成城市的光。"], align: "right", focus: [69, 43], scale: 1.17, dark: true },
  { id: "neon", image: 2, text: ["起、承、轉、合。", "霓虹，也是寫在夜色上的一筆。"], align: "left", focus: [76, 54], scale: 1.23, dark: true, heritage: "霓虹光管製作及造型技藝", interaction: "讓墨線發光" },
  { id: "road-to-sea", image: 3, place: "貨櫃碼頭 · 黎明以前", text: ["道路變闊。", "吊臂從海霧裏升起。"], align: "right", focus: [32, 48], scale: 1.02, dark: true },
  { id: "containers", image: 3, text: ["貨櫃一格一格堆疊，", "像城市蓋給遠方的方印。"], align: "left", focus: [58, 55], scale: 1.1, dark: true },
  { id: "crossing", image: 3, text: ["船、貨車、工人與潮水，", "沿着各自看不見的路前行。"], align: "center", focus: [76, 48], scale: 1.16, dark: true },
  { id: "opera-arrives", image: 4, place: "青衣 · 戲棚", text: ["墨水渡過海面。", "一座戲棚，在風裏逐筆成形。"], align: "right", focus: [34, 48], scale: 1.03, dark: true },
  { id: "chun-kwan", image: 4, text: ["有人描眉，有人試鑼。", "真君誕開台，台下的人一同抬頭。"], align: "left", focus: [56, 48], scale: 1.13, dark: true, heritage: "青衣真君誕", interaction: "讓戲棚開台" },
  { id: "tin-hau", image: 4, text: ["布景換過，香案重整。", "同一座棚，又接住另一個願。"], align: "right", focus: [72, 49], scale: 1.2, dark: true, heritage: "青衣天后誕", interaction: "送出祝願" },
  { id: "home", image: 5, place: "一盞家燈 · 夜深", text: ["青年回到一張暖着的飯桌。", "有人搓圓蓮蓉，有人拿出用過多年的木模。"], align: "left", focus: [35, 50], scale: 1.03 },
  { id: "mooncake", image: 5, text: ["一按、一敲，花紋出現。", "每年回來的，不只是味道。"], align: "right", focus: [58, 51], scale: 1.12, heritage: "月餅製作技藝", interaction: "印下團圓" },
  { id: "remember", image: 5, text: ["墨滴終於記起——", "自己來自無數雙手，無數次相聚。"], align: "center", focus: [74, 50], scale: 1.18 },
];

const cameraKeyframes: CameraKeyframe[] = [
  { yaw: -8, pitch: 3, roll: -0.6, depth: -18 },
  { yaw: -2, pitch: -2, roll: 0.3, depth: 18 },
  { yaw: 8, pitch: 2, roll: 0.8, depth: 42 },
  { yaw: -9, pitch: 2, roll: -0.7, depth: -12 },
  { yaw: -1, pitch: -3, roll: 0.2, depth: 38 },
  { yaw: 7, pitch: 3, roll: 0.9, depth: 66 },
  { yaw: -5, pitch: -1, roll: -0.5, depth: 20 },
  { yaw: 11, pitch: 2, roll: 0.8, depth: 72 },
  { yaw: -10, pitch: 3, roll: -0.7, depth: -10 },
  { yaw: -2, pitch: -3, roll: 0.4, depth: 44 },
  { yaw: 7, pitch: 2, roll: 0.7, depth: 60 },
  { yaw: 12, pitch: -2, roll: 1, depth: 82 },
  { yaw: -11, pitch: 2, roll: -0.8, depth: -12 },
  { yaw: -3, pitch: -3, roll: 0.2, depth: 34 },
  { yaw: 8, pitch: 2, roll: 0.8, depth: 62 },
  { yaw: -9, pitch: 3, roll: -0.8, depth: -8 },
  { yaw: 0, pitch: -2, roll: 0.2, depth: 42 },
  { yaw: 10, pitch: 2, roll: 0.8, depth: 74 },
  { yaw: -8, pitch: 2, roll: -0.5, depth: -4 },
  { yaw: -1, pitch: -3, roll: 0.3, depth: 46 },
  { yaw: 9, pitch: 2, roll: 0.7, depth: 76 },
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
    data[index] = (Math.random() * 2 - 1) * (0.55 + Math.sin(index / 17000) * 0.22);
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
  const delay = context.createDelay(3);
  const feedback = context.createGain();
  const compressor = context.createDynamicsCompressor();

  master.gain.value = 0.5;
  music.gain.value = 0.38;
  ambience.gain.value = 0.12;
  filter.type = "lowpass";
  filter.frequency.value = 2400;
  filter.Q.value = 0.7;
  delay.delayTime.value = 0.62;
  feedback.gain.value = 0.19;
  compressor.threshold.value = -24;
  compressor.knee.value = 22;
  compressor.ratio.value = 3.5;

  delay.connect(feedback).connect(delay);
  music.connect(filter).connect(master);
  music.connect(delay).connect(master);
  ambience.connect(master);
  master.connect(compressor).connect(context.destination);

  const wind = context.createBufferSource();
  const windFilter = context.createBiquadFilter();
  const windGain = context.createGain();
  wind.buffer = createNoiseBuffer(context, 10);
  wind.loop = true;
  windFilter.type = "bandpass";
  windFilter.frequency.value = 350;
  windFilter.Q.value = 0.38;
  windGain.gain.value = 0.08;
  wind.connect(windFilter).connect(windGain).connect(ambience);
  wind.start();

  [49, 73.5, 98].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = index === 0 ? 0.045 : 0.015;
    oscillator.connect(gain).connect(music);
    oscillator.start();
  });

  const stringBuffers = new Map<number, AudioBuffer>();
  const getStringBuffer = (frequency: number) => {
    const key = Math.round(frequency);
    const cached = stringBuffers.get(key);
    if (cached) return cached;
    const seconds = 4.2;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
    const data = buffer.getChannelData(0);
    const period = Math.max(2, Math.round(context.sampleRate / frequency));
    for (let index = 0; index < period; index += 1) data[index] = Math.random() * 2 - 1;
    for (let index = period; index < data.length; index += 1) {
      data[index] = (data[index - period] + data[index - period + 1]) * 0.4987;
    }
    stringBuffers.set(key, buffer);
    return buffer;
  };

  const guzheng = (frequency: number, now: number, volume = 0.085, pan = 0, bend = true) => {
    const source = context.createBufferSource();
    const tone = context.createBiquadFilter();
    const body = context.createBiquadFilter();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    source.buffer = getStringBuffer(frequency);
    source.playbackRate.setValueAtTime(bend ? 0.992 : 1, now);
    if (bend) source.playbackRate.exponentialRampToValueAtTime(1, now + 0.16);
    tone.type = "lowpass";
    tone.frequency.setValueAtTime(4200, now);
    tone.frequency.exponentialRampToValueAtTime(820, now + 3.8);
    body.type = "peaking";
    body.frequency.value = 620;
    body.Q.value = 0.85;
    body.gain.value = 4.5;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(volume * 0.34, now + 0.26);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.35);
    panner.pan.value = pan;
    source.connect(tone).connect(body).connect(gain).connect(panner).connect(music);
    source.start(now);
    source.stop(now + 4.5);
  };

  const woodblock = (now: number, bright = false) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(bright ? 1180 : 720, now);
    oscillator.frequency.exponentialRampToValueAtTime(bright ? 520 : 310, now + 0.15);
    gain.gain.setValueAtTime(bright ? 0.035 : 0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    oscillator.connect(gain).connect(music);
    oscillator.start(now);
    oscillator.stop(now + 0.22);
  };

  const gong = (now: number, volume = 0.026) => {
    [142, 213, 327, 492].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume / (1 + index * 0.45), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.8 + index * 0.5);
      oscillator.connect(gain).connect(music);
      oscillator.start(now);
      oscillator.stop(now + 6.2);
    });
  };

  const scale = [146.83, 164.81, 196, 220, 246.94, 293.66, 329.63, 392, 440, 493.88, 587.33];
  const phrases = [
    [5, -1, 7, 6, 5, 3, -1, 2, 3, 5, 6, -1, 5, 3, 2, -1],
    [3, 5, 6, -1, 8, 7, 5, -1, 6, 5, 3, 2, -1, 3, 5, -1],
    [7, -1, 8, 10, 9, 8, -1, 7, 5, 6, 7, -1, 5, 3, 2, -1],
    [2, 3, 5, 3, -1, 6, 5, 3, 2, -1, 0, 2, 3, 5, -1, -1],
    [6, 7, 9, -1, 8, 7, 6, 5, -1, 3, 5, 6, 3, 2, -1, -1],
    [5, 3, 2, -1, 3, 5, 7, 6, 5, -1, 8, 7, 5, 3, 2, -1],
    [8, 10, 9, 8, -1, 7, 9, 8, 6, 5, -1, 3, 5, 6, -1, -1],
    [3, -1, 2, 0, 2, 3, 5, -1, 6, 5, 3, 2, 0, -1, 2, -1],
    [7, 8, 10, -1, 8, 7, 5, 6, -1, 5, 3, 2, 3, 5, -1, -1],
    [5, 6, 8, 7, 5, -1, 3, 5, 6, -1, 7, 5, 3, 2, 0, -1],
    [2, 5, 3, 2, -1, 0, 2, 3, 5, 6, -1, 5, 3, 2, -1, -1],
    [6, -1, 8, 7, 9, 8, 6, -1, 5, 7, 6, 5, 3, 2, 0, -1],
  ];
  const phraseRoute = [0, 4, 1, 7, 2, 5, 9, 3, 6, 10, 8, 11];
  let step = 0;
  const beatMs = 610;
  const timer = window.setInterval(() => {
    if (context.state !== "running") return;
    const now = context.currentTime + 0.035;
    const phraseNumber = Math.floor(step / 16) % phraseRoute.length;
    const longCycle = Math.floor(step / (16 * phraseRoute.length)) % 5;
    const beat = step % 16;
    const routeShift = [0, 5, 2, 9, 7][longCycle];
    const phrase = phrases[phraseRoute[(phraseNumber + routeShift) % phraseRoute.length]];
    const note = phrase[beat];
    const phraseEnergy = 0.86 + Math.sin((phraseNumber + longCycle * 2.3) * 1.71) * 0.1;
    if (note >= 0) {
      const accent = beat === 0 || beat === 8 ? 1.18 : beat === 4 || beat === 12 ? 0.94 : 0.78;
      const pan = Math.sin((step * 0.71 + phraseNumber) * 0.62) * 0.42;
      guzheng(scale[note], now, 0.072 * accent * phraseEnergy, pan, beat % 4 !== 3);
    }
    if (beat === 0) guzheng(scale[[0, 2, 3, 2][phraseNumber % 4]] * 0.5, now, 0.052, -0.34, false);
    if (beat === 8 && phraseNumber % 3 !== 1) guzheng(scale[[2, 3, 0][phraseNumber % 3]] * 0.5, now, 0.04, 0.3, false);
    if (beat === 13 && phraseNumber % 2 === 0) {
      [3, 5, 6, 7, 9].forEach((scaleIndex, offset) => guzheng(scale[scaleIndex], now + offset * 0.072, 0.027 - offset * 0.002, -0.42 + offset * 0.2, false));
    }
    if (beat === 15 && phraseNumber % 4 === 3) gong(now, 0.012);
    if (beat === 6 && phraseNumber % 3 === 2) woodblock(now, false);
    step += 1;
  }, beatMs);

  return { context, master, music, ambience, filter, delay, timer };
}

type InkParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  growth: number;
  wobble: number;
  tail: Array<[number, number]>;
};

function InkReactor({ visible, pointerEnabled, holdProgress, burstKey, dark, origin }: { visible: boolean; pointerEnabled: boolean; holdProgress: number; burstKey: number; dark: boolean; origin: { x: number; y: number } | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(holdProgress);
  const burstRef = useRef(burstKey);
  const darkRef = useRef(dark);
  const originRef = useRef(origin);
  const pointerEnabledRef = useRef(pointerEnabled);

  useEffect(() => { progressRef.current = holdProgress; }, [holdProgress]);
  useEffect(() => { burstRef.current = burstKey; }, [burstKey]);
  useEffect(() => { darkRef.current = dark; }, [dark]);
  useEffect(() => { originRef.current = origin; }, [origin]);
  useEffect(() => { pointerEnabledRef.current = pointerEnabled; }, [pointerEnabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const particles: InkParticle[] = [];
    let previous = { x: -100, y: -100 };
    let frame = 0;
    let seenBurst = burstRef.current;
    let openingWash = -1;
    let openingCentre = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const spawn = (x: number, y: number, speed: number, radius: number, count = 1) => {
      for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (0.35 + Math.random() * 0.85);
        particles.push({
          x: x + (Math.random() - 0.5) * radius,
          y: y + (Math.random() - 0.5) * radius,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity - speed * 0.08,
          radius: radius * (0.45 + Math.random() * 0.9),
          alpha: 0.28 + Math.random() * 0.38,
          growth: 0.035 + Math.random() * 0.12,
          wobble: Math.random() * Math.PI * 2,
          tail: [],
        });
      }
      if (particles.length > 520) particles.splice(0, particles.length - 520);
    };

    const pointer = (event: globalThis.PointerEvent) => {
      if (!visible || !pointerEnabledRef.current || (event.pointerType === "touch" && event.buttons === 0)) return;
      const distance = Math.hypot(event.clientX - previous.x, event.clientY - previous.y);
      const count = Math.min(5, Math.max(1, Math.round(distance / 16)));
      for (let index = 0; index < count; index += 1) {
        const mix = count === 1 ? 1 : index / (count - 1);
        const x = previous.x < 0 ? event.clientX : previous.x + (event.clientX - previous.x) * mix;
        const y = previous.y < 0 ? event.clientY : previous.y + (event.clientY - previous.y) * mix;
        spawn(x, y, 0.18, 5 + Math.random() * 7);
      }
      previous = { x: event.clientX, y: event.clientY };
    };

    const drawParticle = (particle: InkParticle, color: string) => {
      if (particle.tail.length > 1) {
        context.beginPath();
        context.moveTo(particle.tail[0][0], particle.tail[0][1]);
        for (let index = 1; index < particle.tail.length; index += 1) context.lineTo(particle.tail[index][0], particle.tail[index][1]);
        context.strokeStyle = `rgba(${color}, ${particle.alpha * 0.24})`;
        context.lineWidth = Math.max(0.45, particle.radius * 0.12);
        context.stroke();
      }
      const wash = context.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius * 1.8);
      wash.addColorStop(0, `rgba(${color}, ${particle.alpha})`);
      wash.addColorStop(0.42, `rgba(${color}, ${particle.alpha * 0.72})`);
      wash.addColorStop(0.76, `rgba(${color}, ${particle.alpha * 0.24})`);
      wash.addColorStop(1, `rgba(${color}, 0)`);
      context.fillStyle = wash;
      context.beginPath();
      const points = 9;
      for (let point = 0; point <= points; point += 1) {
        const angle = (point / points) * Math.PI * 2;
        const irregularity = 0.78 + Math.sin(angle * 3 + particle.wobble) * 0.14 + Math.cos(angle * 5 - particle.wobble) * 0.08;
        const x = particle.x + Math.cos(angle) * particle.radius * irregularity;
        const y = particle.y + Math.sin(angle) * particle.radius * irregularity;
        if (point === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.closePath();
      context.fill();
    };

    const draw = () => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const color = darkRef.current ? "226, 219, 202" : "7, 11, 9";
      context.globalCompositeOperation = "source-over";

      if (openingWash >= 0) {
        openingWash += 0.026;
        const span = Math.hypot(window.innerWidth, window.innerHeight);
        const radius = span * (0.035 + openingWash * 0.88);
        const wash = context.createRadialGradient(openingCentre.x, openingCentre.y, radius * 0.06, openingCentre.x, openingCentre.y, radius);
        wash.addColorStop(0, "rgba(4, 7, 5, 0.98)");
        wash.addColorStop(0.76, "rgba(7, 10, 8, 0.94)");
        wash.addColorStop(0.9, "rgba(12, 16, 13, 0.64)");
        wash.addColorStop(1, "rgba(12, 16, 13, 0)");
        context.fillStyle = wash;
        context.beginPath();
        for (let point = 0; point <= 72; point += 1) {
          const angle = (point / 72) * Math.PI * 2;
          const edge = 0.91 + Math.sin(angle * 5.3 + openingWash * 7) * 0.045 + Math.cos(angle * 11.7) * 0.035;
          const x = openingCentre.x + Math.cos(angle) * radius * edge;
          const y = openingCentre.y + Math.sin(angle) * radius * edge;
          if (point === 0) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.closePath();
        context.fill();
        if (openingWash > 1.12) openingWash = -1;
      }

      if (progressRef.current > 0.01) {
        const pressure = Math.max(1, Math.round(progressRef.current * 4));
        const centre = originRef.current || { x: window.innerWidth / 2, y: window.innerHeight - Math.max(75, window.innerHeight * 0.09) };
        spawn(centre.x, centre.y, 0.5 + progressRef.current * 1.4, 8 + progressRef.current * 19, pressure);
      }
      if (burstRef.current !== seenBurst) {
        seenBurst = burstRef.current;
        const centre = originRef.current || { x: window.innerWidth / 2, y: window.innerHeight - Math.max(75, window.innerHeight * 0.09) };
        if (originRef.current) {
          openingCentre = centre;
          openingWash = 0;
        }
        spawn(centre.x, centre.y, originRef.current ? 9.4 : 7.2, originRef.current ? 15 : 8, originRef.current ? 360 : 210);
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.tail.push([particle.x, particle.y]);
        if (particle.tail.length > 8) particle.tail.shift();
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.984;
        particle.vy = particle.vy * 0.984 + 0.008;
        particle.radius += particle.growth;
        particle.alpha *= progressRef.current > 0.01 ? 0.987 : 0.972;
        particle.wobble += 0.018;
        if (particle.alpha < 0.008) {
          particles.splice(index, 1);
          continue;
        }
        drawParticle(particle, color);
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

function SceneEffect({ effect }: { effect: { id: string; key: number } | null }) {
  if (!effect) return null;
  const styleFor = (index: number, extra: Record<string, string | number> = {}) => ({ "--i": index, ...extra } as CSSProperties);
  return (
    <div className={`scene-effect effect-${effect.id}`} key={effect.key} aria-hidden="true">
      {effect.id === "milk-tea" && <><div className="tea-stream" />{Array.from({ length: 8 }, (_, index) => <i className="tea-steam" style={styleFor(index)} key={index} />)}</>}
      {effect.id === "wood-carving" && <><div className="carve-mark" />{Array.from({ length: 22 }, (_, index) => <i className="wood-chip" style={styleFor(index)} key={index} />)}</>}
      {effect.id === "yulan" && <>{Array.from({ length: 15 }, (_, index) => <i className="paper-lantern" style={styleFor(index, { "--x": `${6 + ((index * 37) % 88)}%` })} key={index} />)}</>}
      {effect.id === "neon" && <div className="neon-calligraphy"><i /><i /><i /></div>}
      {effect.id === "chun-kwan" && <><div className="opera-curtain curtain-left" /><div className="opera-curtain curtain-right" /><div className="gong-wave"><i /><i /><i /></div></>}
      {effect.id === "tin-hau" && <>{Array.from({ length: 28 }, (_, index) => <i className="wish-spark" style={styleFor(index, { "--x": `${8 + ((index * 29) % 84)}%` })} key={index} />)}</>}
      {effect.id === "mooncake" && <div className="moon-stamp">{Array.from({ length: 8 }, (_, index) => <i style={styleFor(index)} key={index} />)}</div>}
    </div>
  );
}

const lerp = (start: number, end: number, amount: number) => start + (end - start) * amount;
const smoothstep = (value: number) => value * value * (3 - 2 * value);

export default function Home() {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [motion, setMotion] = useState({ index: 0, amount: 0 });
  const [activeBeat, setActiveBeat] = useState(0);
  const [muted, setMuted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [blooming, setBlooming] = useState(false);
  const [openingBloom, setOpeningBloom] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [inkOrigin, setInkOrigin] = useState<{ x: number; y: number } | null>(null);
  const [sceneEffect, setSceneEffect] = useState<{ id: string; key: number } | null>(null);
  const storyRef = useRef<HTMLElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLElement>(null);
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
      engine.master.gain.setTargetAtTime(muted ? 0 : 0.5, engine.context.currentTime, 0.5);
    } catch {
      // Mobile browsers may wait for the start gesture.
    }
  }, [muted]);

  useEffect(() => {
    if (!started) return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-story-beat]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const centre = window.innerHeight * 0.52;
      let index = 0;
      for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
        const rect = nodes[nodeIndex].getBoundingClientRect();
        if (rect.top <= centre) index = nodeIndex;
        if (rect.top <= centre && rect.bottom > centre) break;
      }
      const rect = nodes[index]?.getBoundingClientRect();
      const amount = rect ? Math.min(1, Math.max(0, (centre - rect.top) / Math.max(1, rect.height))) : 0;
      setMotion((previous) => previous.index === index && Math.abs(previous.amount - amount) < 0.002 ? previous : { index, amount });
      setActiveBeat((previous) => previous === index ? previous : index);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const visual = visualRef.current;
    const experience = experienceRef.current;
    if (!visual) return;
    const move = (event: globalThis.PointerEvent) => {
      const x = event.clientX / Math.max(1, window.innerWidth) - 0.5;
      const y = event.clientY / Math.max(1, window.innerHeight) - 0.5;
      visual.style.setProperty("--pointer-yaw", `${x * -3.2}deg`);
      visual.style.setProperty("--pointer-pitch", `${y * 2.1}deg`);
      visual.style.setProperty("--pointer-x", `${x * -1.1}vw`);
      visual.style.setProperty("--pointer-y", `${y * -0.8}vh`);
      experience?.style.setProperty("--ink-x", `${event.clientX}px`);
      experience?.style.setProperty("--ink-y", `${event.clientY}px`);
    };
    const reset = () => {
      visual.style.setProperty("--pointer-yaw", "0deg");
      visual.style.setProperty("--pointer-pitch", "0deg");
      visual.style.setProperty("--pointer-x", "0vw");
      visual.style.setProperty("--pointer-y", "0vh");
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", reset);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", reset);
    };
  }, [started]);

  useEffect(() => {
    const engine = audioRef.current;
    if (!engine) return;
    const image = beats[activeBeat]?.image || 0;
    engine.filter.frequency.setTargetAtTime(1750 + image * 190, engine.context.currentTime, 1.8);
    engine.ambience.gain.setTargetAtTime(image === 3 ? 0.18 : image >= 4 ? 0.145 : 0.1, engine.context.currentTime, 1.5);
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
      if (engine.context.state !== "closed") void engine.context.close().catch(() => undefined);
    }
  }, []);

  const current = beats[Math.min(activeBeat, beats.length - 1)];
  const activeInteraction = current?.interaction && !revealed.has(current.id) ? current.interaction : null;

  const completeHold = useCallback(() => {
    if (!current?.interaction || revealed.has(current.id)) return;
    const effectKey = Date.now();
    setRevealed((previous) => new Set(previous).add(current.id));
    setHoldProgress(100);
    setBlooming(true);
    setSceneEffect({ id: current.id, key: effectKey });
    window.setTimeout(() => setBlooming(false), 1900);
    window.setTimeout(() => setSceneEffect((active) => active?.key === effectKey ? null : active), 3100);
  }, [current, revealed]);

  const beginHold = useCallback(() => {
    if (!activeInteraction || holdFrame.current) return;
    setInkOrigin(null);
    holdStarted.current = performance.now();
    const draw = (time: number) => {
      const next = Math.min(100, ((time - holdStarted.current) / 1450) * 100);
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

  const startJourney = async (event: ReactMouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setInkOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    setOpeningBloom(true);
    setBurstKey((value) => value + 1);
    void startSoundtrack();
    window.setTimeout(() => {
      setStarted(true);
      setOpeningBloom(false);
      setInkOrigin(null);
      window.setTimeout(() => storyRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" }), 80);
    }, reducedMotion ? 80 : 720);
  };

  const toggleSound = async () => {
    if (!audioRef.current) await startSoundtrack();
    const next = !muted;
    setMuted(next);
    const engine = audioRef.current;
    if (engine) engine.master.gain.setTargetAtTime(next ? 0 : 0.5, engine.context.currentTime, 0.4);
  };

  const visual = useMemo(() => {
    const currentBeat = beats[Math.min(motion.index, beats.length - 1)];
    const nextBeat = beats[Math.min(motion.index + 1, beats.length - 1)];
    const currentCamera = cameraKeyframes[Math.min(motion.index, cameraKeyframes.length - 1)];
    const nextCamera = cameraKeyframes[Math.min(motion.index + 1, cameraKeyframes.length - 1)];
    const amount = reducedMotion ? 0 : smoothstep(motion.amount);
    const focusX = lerp(currentBeat.focus[0], nextBeat.focus[0], amount);
    const focusY = lerp(currentBeat.focus[1], nextBeat.focus[1], amount);
    const scale = lerp(currentBeat.scale, nextBeat.scale, amount);
    const sceneMix = currentBeat.image !== nextBeat.image ? Math.min(1, Math.max(0, (amount - 0.48) / 0.52)) : 0;
    return {
      activeImage: currentBeat.image,
      incomingImage: currentBeat.image !== nextBeat.image ? nextBeat.image : null,
      sceneMix,
      style: {
        "--focus-x": `${focusX}%`,
        "--focus-y": `${focusY}%`,
        "--camera-x": `${(50 - focusX) * 0.42}vw`,
        "--camera-y": `${(50 - focusY) * 0.24}vh`,
        "--camera-z": `${(scale - 1) * 760 + lerp(currentCamera.depth, nextCamera.depth, amount)}px`,
        "--camera-yaw": `${lerp(currentCamera.yaw, nextCamera.yaw, amount)}deg`,
        "--camera-pitch": `${lerp(currentCamera.pitch, nextCamera.pitch, amount)}deg`,
        "--camera-roll": `${lerp(currentCamera.roll, nextCamera.roll, amount)}deg`,
      } as CSSProperties,
    };
  }, [motion, reducedMotion]);

  const revealedImages = useMemo(() => new Set(Array.from(revealed).map((id) => beats.find((beat) => beat.id === id)?.image)), [revealed]);
  const cursorInteraction = Boolean(activeInteraction);
  const interactionEffectKey = sceneEffect?.key ?? 0;

  return (
    <main
      className={`experience${started ? " is-started" : ""}${current?.dark ? " is-dark" : ""}${blooming ? " is-blooming" : ""}${openingBloom ? " is-opening-bloom" : ""}${cursorInteraction ? " has-webgl-cursor-ink" : ""}${reducedMotion ? " reduce-motion" : ""}`}
      ref={experienceRef}
      onPointerDown={handlePointerDown}
      onPointerUp={endHold}
      onPointerCancel={endHold}
      onPointerLeave={endHold}
    >
      <InkReactor visible={ready} pointerEnabled={!cursorInteraction} holdProgress={cursorInteraction ? 0 : holdProgress / 100} burstKey={burstKey} dark={Boolean(current?.dark)} origin={inkOrigin} />

      <div className={`loader${ready ? " is-ready" : ""}${started ? " is-hidden" : ""}`}>
        <div className="loader-scene" aria-hidden="true" />
        <div className="loader-wash" aria-hidden="true" />
        <Suspense fallback={null}>
          <ThreeInkOpening progress={progress} ready={ready} opening={openingBloom} reducedMotion={reducedMotion} />
        </Suspense>
        {!ready ? (
          <div className="loading-mark" role="status" aria-live="polite">
            <span>墨跡正在展開</span>
            <strong>{String(progress).padStart(2, "0")}<small>%</small></strong>
          </div>
        ) : (
          <div className="opening-title">
            <p>一滴墨，流過山城與海港</p>
            <h1>墨脈葵青</h1>
            <button onClick={startJourney} className="journey-start"><span>開始旅程</span><i aria-hidden="true" /></button>
            <small>建議開啟聲音</small>
          </div>
        )}
      </div>

      <header className="topbar">
        <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" })}>墨脈葵青</button>
        <div>
          <button onClick={() => setReducedMotion((value) => !value)}>{reducedMotion ? "恢復動畫" : "減少動畫"}</button>
          <button className="sound" onClick={toggleSound} aria-pressed={!muted}>
            <span>{muted ? "開啟聲音" : "古箏配樂"}</span><i className={muted ? "muted" : ""} aria-hidden="true"><b /><b /><b /><b /></i>
          </button>
        </div>
      </header>

      <div className="visual-stack" style={visual.style} ref={visualRef} aria-hidden="true">
        {sceneImages.map((image, sceneIndex) => {
          const opacity = sceneIndex === visual.activeImage ? 1 - visual.sceneMix : sceneIndex === visual.incomingImage ? visual.sceneMix : 0;
          return (
            <div
              className={`scene-stage${revealedImages.has(sceneIndex) ? " is-revealed" : ""}`}
              data-depth-scene={sceneIndex + 1}
              style={{ "--scene-opacity": opacity } as CSSProperties}
              key={image}
            >
              <div className="scene-fallback" style={{ backgroundImage: `url(${image})` }} />
            </div>
          );
        })}
        <div className="atmosphere atmosphere--far" />
        <div className="atmosphere atmosphere--near" />
        <div className="paper-grain" />
      </div>

      {started && (
        <Suspense fallback={null}>
          <ThreeMountainStage
            opacity={1}
            cameraPhase={motion.index + motion.amount}
            pointerActive={cursorInteraction}
            holdProgress={holdProgress / 100}
            effectKey={interactionEffectKey}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      )}

      <SceneEffect effect={sceneEffect?.id === "milk-tea" ? null : sceneEffect} />

      {activeInteraction && (
        <button
          className="ink-control is-cursor-bound"
          style={{ "--ink-progress": `${holdProgress / 100}` } as CSSProperties}
          onPointerDown={(event) => { event.stopPropagation(); beginHold(); }}
          onPointerUp={(event) => { event.stopPropagation(); endHold(); }}
          onPointerCancel={endHold}
          onKeyDown={(event) => {
            if (event.key !== " " && event.key !== "Enter") return;
            event.preventDefault();
            beginHold();
          }}
          onKeyUp={(event) => {
            if (event.key !== " " && event.key !== "Enter") return;
            event.preventDefault();
            endHold();
          }}
          aria-label={activeInteraction}
        >
          <i className="ink-control__fill" aria-hidden="true" />
          <span>{activeInteraction}</span>
        </button>
      )}

      {started && <div className="scroll-cue" aria-hidden="true"><span>滾動前行</span><i /></div>}

      <section className="scroll-story" ref={storyRef} aria-label="墨脈葵青故事">
        {beats.map((beat, index) => (
          <article
            className={`story-beat align-${beat.align}${beat.dark ? " text-light" : ""}${activeBeat === index ? " is-current" : ""}`}
            data-beat={index}
            data-story-beat
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
            <small>九幕已完 · 墨脈仍在流動</small>
          </div>
        </article>
      </section>
    </main>
  );
}
