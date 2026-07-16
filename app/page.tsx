"use client";

import { CSSProperties, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Chapter = {
  no: string;
  kicker: string;
  title: string;
  copy: string[];
  note?: string;
  scene: string;
  accent: string;
  interaction?: string;
};

const chapters: Chapter[] = [
  {
    no: "00",
    kicker: "序章 · 山",
    title: "墨，從山上醒來",
    copy: [
      "清晨，山脊藏在霧裏。",
      "一滴沒有名字的墨，沿着石縫落下。它記不起從何而來，只記得有人曾用雙手，把一座城的故事留在它身上。",
      "青年跟隨那道未乾的墨痕，向山下走去。",
    ],
    note: "向下捲動，讓墨跡流入城市",
    scene: "mountain",
    accent: "#48606b",
  },
  {
    no: "01",
    kicker: "第一幕 · 屋邨醒來",
    title: "一杯茶，沖開清晨",
    copy: [
      "巴士駛過，鐵閘升起，屋邨在杯碟聲中慢慢醒來。",
      "青年在茶餐廳停下。老師傅把滾燙的茶湯反覆撞進茶袋——高低之間，時間被拉成一條柔韌的線。",
      "墨滴染上茶色，也記起第一種溫度。",
    ],
    note: "非物質文化遺產 · 港式奶茶製作技藝",
    scene: "tea",
    accent: "#9b5c38",
    interaction: "按住，撞出茶香",
  },
  {
    no: "02",
    kicker: "第二幕 · 手的痕跡",
    title: "木紋裏，住着未說完的話",
    copy: [
      "墨線拐進舊工業區，機器聲與木香從半掩的門後傳來。",
      "老師傅落刀，青年俯身細看。每一下不是移走木頭，而是讓藏在木裏的形狀，重新被人看見。",
      "木屑飛起，成為墨滴記憶中的第二場雨。",
    ],
    note: "非物質文化遺產 · 木雕刻技藝",
    scene: "wood",
    accent: "#8d5d3f",
    interaction: "按住，刻出紋理",
  },
  {
    no: "03",
    kicker: "第三幕 · 屋邨之間",
    title: "一個棚，把人聚在一起",
    copy: [
      "球場的燈亮起，街坊把竹、布、香火與記憶，一件件搬到屋邨中央。",
      "青年沒有問這是誰的節日。他只是遞上一張凳、接過一盞燈，成為人群中的一雙手。",
      "當經聲在樓宇之間迴盪，墨滴記起：有些地方，是因為人願意相聚才存在。",
    ],
    note: "非物質文化遺產 · 石籬、石蔭、安蔭盂蘭勝會",
    scene: "yulan",
    accent: "#a83e35",
    interaction: "按住，點亮紙燈",
  },
  {
    no: "04",
    kicker: "第四幕 · 工業夜色",
    title: "把一條直線，屈成城市的光",
    copy: [
      "夜落在工廈外牆，窗內仍有人工作。火焰貼近玻璃，青年跟着師傅的手勢，把光管慢慢屈成一筆。",
      "那不是寫在紙上的字，卻同樣講究起、承、轉、合。",
      "霓虹亮起的一刻，黑墨第一次發出藍與紅的光。",
    ],
    note: "非物質文化遺產 · 霓虹光管製作及造型技藝",
    scene: "neon",
    accent: "#2f8495",
    interaction: "按住，讓墨線發光",
  },
  {
    no: "05",
    kicker: "第五幕 · 向海",
    title: "城市，把世界搬到眼前",
    copy: [
      "道路變闊，吊臂從海霧中升起。貨櫃一格一格堆疊，像城市寫給遠方的方印。",
      "青年站在海旁，看見貨車、工人、船與潮水各自沿着看不見的路前行。",
      "墨滴穿過鋼鐵的節奏，流向對岸。",
    ],
    note: "葵青貨櫃碼頭 · 工作、抵達與出發",
    scene: "port",
    accent: "#3d6477",
  },
  {
    no: "06",
    kicker: "第六幕 · 青衣",
    title: "鑼鼓一響，神與人都來了",
    copy: [
      "墨水渡過藍巴勒海峽，一座戲棚在青衣的風裏逐筆成形。",
      "青年走進後台，有人描眉、有人試鑼、有人把祝願寫在紅紙上。真君誕的戲開場，台下的人在同一刻抬頭。",
      "墨滴記起第三種光：舞台上，眾人共同望見的光。",
    ],
    note: "非物質文化遺產 · 青衣真君誕",
    scene: "opera",
    accent: "#a2342d",
    interaction: "按住，讓戲棚開台",
  },
  {
    no: "07",
    kicker: "第七幕 · 一棚兩誕",
    title: "同一座棚，接住另一個願",
    copy: [
      "鑼鼓沒有真正停下。布景換過，香案重整，同一座戲棚又迎來天后誕。",
      "青年在人群裏再次遇見熟悉的面孔。節慶並非重複，而是一代又一代，把相同的祝願重新說一次。",
      "海風吹動棚頂，墨跡像潮水一樣回來。",
    ],
    note: "非物質文化遺產 · 青衣天后誕",
    scene: "tinhau",
    accent: "#b66a34",
    interaction: "按住，送出祝願",
  },
  {
    no: "08",
    kicker: "第八幕 · 一桌人情",
    title: "月圓以前，先把人聚齊",
    copy: [
      "夜深，青年回到一張亮着暖燈的飯桌。蓮蓉被搓圓、餅皮包好，再放進用過許多年的木模。",
      "一按、一敲，花紋出現。那枚月餅盛着的不只是味道，還有每年都要回來的理由。",
      "墨滴落進餅模，終於記起自己來自無數雙手。",
    ],
    note: "非物質文化遺產 · 月餅製作技藝",
    scene: "mooncake",
    accent: "#c28a3c",
    interaction: "按住，印下團圓",
  },
];

const assetUrls: string[] = [];

type AudioEngine = {
  context: AudioContext;
  master: GainNode;
  atmosphere: GainNode;
  filter: BiquadFilterNode;
  timer: number;
};

function makeAudioEngine(): AudioEngine | null {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;

  const context = new AudioCtor();
  const master = context.createGain();
  const atmosphere = context.createGain();
  const filter = context.createBiquadFilter();
  master.gain.value = 0.18;
  atmosphere.gain.value = 0.32;
  filter.type = "lowpass";
  filter.frequency.value = 760;
  atmosphere.connect(filter).connect(master).connect(context.destination);

  [55, 82.5, 110].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index === 2 ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = index === 0 ? 0.045 : 0.018;
    oscillator.connect(gain).connect(atmosphere);
    oscillator.start();
  });

  const notes = [220, 247, 294, 330, 392, 330, 294, 247];
  let noteIndex = 0;
  const timer = window.setInterval(() => {
    if (context.state !== "running") return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(notes[noteIndex % notes.length], now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);
    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + 4);
    noteIndex += 1;
  }, 4200);

  return { context, master, atmosphere, filter, timer };
}

function InkTrail({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    type Drop = { x: number; y: number; r: number; a: number; vx: number; vy: number };
    const drops: Drop[] = [];
    let previous = { x: -100, y: -100, time: performance.now() };
    let animationFrame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const addDrops = (event: globalThis.PointerEvent) => {
      if (!active || (event.pointerType === "touch" && event.buttons === 0)) return;
      const now = performance.now();
      const distance = Math.hypot(event.clientX - previous.x, event.clientY - previous.y);
      const speed = distance / Math.max(16, now - previous.time);
      const amount = Math.min(4, Math.max(1, Math.round(distance / 18)));
      for (let index = 0; index < amount; index += 1) {
        const position = amount === 1 ? 1 : index / (amount - 1);
        drops.push({
          x: previous.x < 0 ? event.clientX : previous.x + (event.clientX - previous.x) * position,
          y: previous.y < 0 ? event.clientY : previous.y + (event.clientY - previous.y) * position,
          r: Math.max(3.5, 12 - speed * 4) + Math.random() * 3,
          a: 0.2 + Math.random() * 0.12,
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.08,
        });
      }
      previous = { x: event.clientX, y: event.clientY, time: now };
      if (drops.length > 180) drops.splice(0, drops.length - 180);
    };

    const draw = () => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      context.save();
      context.globalCompositeOperation = "multiply";
      for (let index = drops.length - 1; index >= 0; index -= 1) {
        const drop = drops[index];
        drop.a *= 0.968;
        drop.r += 0.055;
        drop.x += drop.vx;
        drop.y += drop.vy;
        if (drop.a < 0.008) {
          drops.splice(index, 1);
          continue;
        }
        const gradient = context.createRadialGradient(drop.x, drop.y, 0, drop.x, drop.y, drop.r);
        gradient.addColorStop(0, `rgba(13, 16, 15, ${drop.a})`);
        gradient.addColorStop(0.58, `rgba(23, 26, 24, ${drop.a * 0.46})`);
        gradient.addColorStop(1, "rgba(20, 22, 20, 0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(drop.x, drop.y, drop.r, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", addDrops, { passive: true });
    animationFrame = window.requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", addDrops);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [active]);

  return <canvas ref={canvasRef} className="ink-trail" aria-hidden="true" />;
}

function MemoryAction({ label, accent }: { label: string; accent: string }) {
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const frame = useRef<number | null>(null);
  const startedAt = useRef(0);

  const stop = useCallback(() => {
    if (frame.current) window.cancelAnimationFrame(frame.current);
    frame.current = null;
    if (!revealed) setProgress(0);
  }, [revealed]);

  const begin = useCallback(() => {
    if (revealed) return;
    startedAt.current = performance.now();
    const advance = (time: number) => {
      const next = Math.min(100, ((time - startedAt.current) / 1150) * 100);
      setProgress(next);
      if (next >= 100) {
        setRevealed(true);
        frame.current = null;
      } else {
        frame.current = window.requestAnimationFrame(advance);
      }
    };
    frame.current = window.requestAnimationFrame(advance);
  }, [revealed]);

  return (
    <button
      className={`memory-action${revealed ? " is-revealed" : ""}`}
      style={{ "--accent": accent, "--hold": `${progress}%` } as CSSProperties}
      onPointerDown={begin}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") begin();
      }}
      onKeyUp={stop}
      aria-pressed={revealed}
    >
      <span className="memory-action__wash" aria-hidden="true" />
      <span>{revealed ? "記憶已顯影" : label}</span>
      <i aria-hidden="true" />
    </button>
  );
}

export default function Home() {
  const [loadProgress, setLoadProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const audioRef = useRef<AudioEngine | null>(null);
  const storyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    const began = performance.now();
    let displayed = 0;
    let loaded = 0;

    const timer = window.setInterval(() => {
      displayed = Math.min(92, displayed + (displayed < 55 ? 3 : 1));
      if (!cancelled) setLoadProgress(displayed);
    }, 54);

    const completeAsset = () => {
      loaded += 1;
      displayed = Math.max(displayed, Math.round((loaded / assetUrls.length) * 92));
    };

    Promise.all(
      assetUrls.map(
        (url) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            image.onload = () => { completeAsset(); resolve(); };
            image.onerror = () => { completeAsset(); resolve(); };
            image.src = url;
          }),
      ),
    ).then(() => {
      const wait = Math.max(0, 2850 - (performance.now() - began));
      window.setTimeout(() => {
        if (cancelled) return;
        window.clearInterval(timer);
        setLoadProgress(100);
        window.setTimeout(() => setReady(true), 360);
      }, wait);
    });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const startAudio = useCallback(async () => {
    if (!audioRef.current) audioRef.current = makeAudioEngine();
    const engine = audioRef.current;
    if (!engine) return;
    try {
      await engine.context.resume();
      engine.master.gain.setTargetAtTime(muted ? 0 : 0.18, engine.context.currentTime, 0.5);
    } catch {
      // Browsers may wait for the explicit start gesture.
    }
  }, [muted]);

  useEffect(() => {
    if (ready) void startAudio();
  }, [ready, startAudio]);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveChapter(Number((visible.target as HTMLElement).dataset.chapter || 0));
      },
      { threshold: [0.25, 0.45, 0.65] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    const engine = audioRef.current;
    if (!engine) return;
    const frequency = 620 + activeChapter * 58;
    engine.atmosphere.gain.setTargetAtTime(0.24 + (activeChapter % 3) * 0.05, engine.context.currentTime, 1.3);
    engine.filter.frequency.setTargetAtTime(frequency, engine.context.currentTime, 1.6);
  }, [activeChapter]);

  useEffect(() => () => {
    const engine = audioRef.current;
    if (!engine) return;
    window.clearInterval(engine.timer);
    void engine.context.close();
  }, []);

  const chapter = activeChapter === chapters.length
    ? { kicker: "終章 · 墨尚未乾" }
    : chapters[Math.min(activeChapter, chapters.length - 1)];
  const chapterCount = String(chapters.length + 1).padStart(2, "0");

  const startJourney = async () => {
    await startAudio();
    setStarted(true);
    window.setTimeout(() => storyRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" }), 120);
  };

  const toggleSound = async () => {
    if (!audioRef.current) await startAudio();
    const next = !muted;
    setMuted(next);
    const engine = audioRef.current;
    if (engine) engine.master.gain.setTargetAtTime(next ? 0 : 0.18, engine.context.currentTime, 0.35);
  };

  const finaleStyle = useMemo(
    () => ({ "--chapter-accent": chapters[chapters.length - 1].accent } as CSSProperties),
    [],
  );

  return (
    <main className={`site-shell${started ? " has-started" : ""}${reducedMotion ? " reduce-motion" : ""}`}>
      <InkTrail active={ready} />

      <div className={`loader${ready ? " is-ready" : ""}${started ? " is-gone" : ""}`}>
        <div className="loader__paper" aria-hidden="true" />
        <div className="loader__art" aria-hidden="true">
          <div className="loader__sun" />
          <div className="loader__mountain loader__mountain--far" />
          <div className="loader__mountain loader__mountain--near" />
          <div className="loader__inkdrop" />
          <div className="loader__youth" />
        </div>

        {!ready ? (
          <div className="loader__status" role="status" aria-live="polite">
            <span className="loader__eyebrow">墨跡正在成形</span>
            <strong>{String(loadProgress).padStart(2, "0")}</strong>
            <span className="loader__percent">%</span>
            <div className="loader__line"><i style={{ width: `${loadProgress}%` }} /></div>
          </div>
        ) : (
          <div className="loader__arrival">
            <p>一滴墨，流過山城與海港</p>
            <h1>墨脈葵青</h1>
            <button className="start-button" onClick={startJourney}>
              <span>開始旅程</span>
              <i aria-hidden="true" />
            </button>
            <span className="loader__sound-note">聲音體驗已準備 · 建議開啟音效</span>
          </div>
        )}
      </div>

      <header className="story-header">
        <button className="wordmark" onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" })}>
          <span>墨脈</span><b>葵青</b>
        </button>
        <div className="header-actions">
          <button onClick={() => setReducedMotion((value) => !value)} aria-pressed={reducedMotion}>
            {reducedMotion ? "動畫：簡約" : "減少動畫"}
          </button>
          <button className="sound-toggle" onClick={toggleSound} aria-pressed={!muted}>
            <span>{muted ? "開啟聲音" : "聲音"}</span>
            <i className={muted ? "is-muted" : ""} aria-hidden="true"><b /><b /><b /></i>
          </button>
        </div>
      </header>

      <aside className="chapter-rail" aria-label="故事進度">
        <span>{String(activeChapter + 1).padStart(2, "0")}</span>
        <div><i style={{ height: `${((activeChapter + 1) / (chapters.length + 1)) * 100}%` }} /></div>
        <span>{chapterCount}</span>
        <p>{chapter.kicker}</p>
      </aside>

      <button
        className="skip-story"
        onClick={() => document.getElementById("finale")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" })}
      >
        略過故事
      </button>

      <section ref={storyRef} className="story" aria-label="墨脈葵青的故事">
        {chapters.map((item, index) => (
          <article
            className={`chapter chapter--${index % 2 === 0 ? "left" : "right"}${activeChapter === index ? " is-active" : ""}`}
            data-chapter={index}
            key={item.no}
            style={{ "--chapter-accent": item.accent } as CSSProperties}
          >
            <div className="chapter__sticky">
              <div className={`chapter__image scene--${item.scene}`} aria-hidden="true">
                <div className="chapter__motif">
                  <i /><i /><i /><i /><i /><i />
                </div>
              </div>
              <div className="chapter__veil" aria-hidden="true" />
              <div className="chapter__number" aria-hidden="true">{item.no}</div>
              <div className="chapter__content">
                <p className="chapter__kicker">{item.kicker}</p>
                <h2>{item.title}</h2>
                <div className="chapter__copy">
                  {item.copy.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
                {item.note && <p className="chapter__note">{item.note}</p>}
                {item.interaction && <MemoryAction label={item.interaction} accent={item.accent} />}
              </div>
              <span className="scroll-cue">繼續向下<i aria-hidden="true" /></span>
            </div>
          </article>
        ))}

        <article id="finale" className="finale" data-chapter={chapters.length} style={finaleStyle}>
          <div className="finale__panorama" aria-hidden="true" />
          <div className="finale__ink" aria-hidden="true" />
          <div className="finale__content">
            <p>終章 · 墨尚未乾</p>
            <h2>原來，一座城的記憶<br />從來不只屬於過去。</h2>
            <div className="finale__copy">
              <span>它藏在山路的風裏，</span>
              <span>在屋邨相遇的目光裏，</span>
              <span>在工業區仍然工作的雙手裏，</span>
              <span>也在每一個願意繼續行落去的人身上。</span>
            </div>
            <strong>墨還未乾。下一筆，由我們續寫。</strong>
            <button className="explore-button" onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" })}>
              <span>探索葵青</span>
              <i aria-hidden="true">↗</i>
            </button>
            <small>探索內容即將展開</small>
          </div>
        </article>
      </section>
    </main>
  );
}
