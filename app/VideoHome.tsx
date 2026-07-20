"use client";

import {
  CSSProperties,
  lazy,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export const dynamic = "force-static";

const ThreeInkOpening = lazy(() => import("./ThreeInkOpening"));
const ThreeFilmInk = lazy(() => import("./ThreeFilmInk"));
const assetPrefix = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const assetUrl = (path: string) => `${assetPrefix}${path}`;

type Scene = {
  id: "mountain" | "street";
  place: string;
  interaction: string;
  heritage?: string;
  video: string;
  poster: string;
  lines: Array<{
    text: string;
    start: number;
    end: number;
    direction: "near-left" | "far-right" | "low-centre" | "high-left";
  }>;
};

const scenes: Scene[] = [
  {
    id: "mountain",
    place: "山城入墨",
    interaction: "喚醒山脈",
    video: assetUrl("/media/kt3.1-scroll.mp4"),
    poster: assetUrl("/media/kt3.1-poster.png"),
    lines: [
      { text: "霧穿過山脊，墨沿石縫落進城市。", start: 0.09, end: 0.34, direction: "near-left" },
      { text: "山與樓之間，葵青從海霧中醒來。", start: 0.49, end: 0.77, direction: "far-right" },
    ],
  },
  {
    id: "street",
    place: "葵涌早茶",
    interaction: "沖開茶香",
    heritage: "港式奶茶製作技藝",
    video: assetUrl("/media/kt3.2-scroll.mp4"),
    poster: assetUrl("/media/kt3.2-poster.png"),
    lines: [
      { text: "濕街接住墨線，也接住每日的腳步。", start: 0.08, end: 0.35, direction: "high-left" },
      { text: "茶香與木屑，在舊舖前交織成生活。", start: 0.5, end: 0.8, direction: "low-centre" },
    ],
  },
];

type AudioEngine = {
  audio: HTMLAudioElement;
  fadeTo: (volume: number, duration?: number) => void;
  cue: (scene: number) => void;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smooth = (value: number) => {
  const v = clamp(value);
  return v * v * (3 - 2 * v);
};
const range = (value: number, start: number, end: number) => smooth((value - start) / (end - start));
const lerp = (a: number, b: number, amount: number) => a + (b - a) * amount;
const lingerEase = (value: number, linger: number) => {
  const x = clamp(value);
  const strength = clamp(linger);
  const centred = x - 0.5;
  return (1 - strength) * x + strength * (4 * centred * centred * centred + 0.5);
};

function buildSoundtrack(): AudioEngine | null {
  if (typeof window === "undefined") return null;
  const audio = new Audio(assetUrl("/media/west-lake-wander.mp3"));
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0;
  let fadeFrame = 0;
  const fadeTo = (volume: number, duration = 900) => {
    window.cancelAnimationFrame(fadeFrame);
    const startedAt = performance.now();
    const from = audio.volume;
    const draw = (now: number) => {
      const progress = clamp((now - startedAt) / duration);
      audio.volume = lerp(from, volume, smooth(progress));
      if (progress < 1) fadeFrame = window.requestAnimationFrame(draw);
    };
    fadeFrame = window.requestAnimationFrame(draw);
  };
  return {
    audio,
    fadeTo,
    cue: () => {
      fadeTo(0.25, 170);
      window.setTimeout(() => fadeTo(0.38, 950), 260);
    },
  };
}

function directedTimeline(progress: number) {
  if (progress <= 0.08) return lerp(0, 0.025, smooth(progress / 0.08));
  if (progress <= 0.67) return lerp(0.025, 0.765, smooth((progress - 0.08) / 0.59));
  if (progress <= 0.8) return lerp(0.765, 0.81, smooth((progress - 0.67) / 0.13));
  return lerp(0.81, 0.985, smooth((progress - 0.8) / 0.2));
}

export default function VideoHome() {
  const [loading, setLoading] = useState(0);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [activeScene, setActiveScene] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [transition, setTransition] = useState(0);
  const [muted, setMuted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [effectScene, setEffectScene] = useState<number | null>(null);
  const [opening, setOpening] = useState(false);
  const [videoReady, setVideoReady] = useState(0);
  const [videoSources, setVideoSources] = useState<Array<string | null>>(() => scenes.map(() => null));
  const [inkOrigin, setInkOrigin] = useState({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const loadedVideos = useRef(new Set<number>());
  const audioRef = useRef<AudioEngine | null>(null);
  const holdFrame = useRef<number | null>(null);
  const holdBegan = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const cursorTimer = useRef<number | null>(null);
  const smoothedScroll = useRef(0);
  const smoothedVideoTime = useRef(scenes.map(() => 0));
  const activeSceneRef = useRef(0);
  const objectUrls = useRef<string[]>([]);

  const markVideoReady = (index: number) => {
    if (loadedVideos.current.has(index)) return;
    loadedVideos.current.add(index);
    setVideoReady(loadedVideos.current.size);
  };

  /* scroll-world's key reliability rule: fetch the film as a Blob before
     scrubbing. Blob URLs stay seekable even when a production host does not
     expose useful byte ranges, so scroll never gets pinned to frame zero. */
  useEffect(() => {
    let disposed = false;
    const controllers = scenes.map(() => new AbortController());
    scenes.forEach((scene, index) => {
      void fetch(scene.video, { signal: controllers[index].signal })
        .then((response) => {
          if (!response.ok) throw new Error(`film ${index} failed`);
          return response.blob();
        })
        .then((blob) => {
          if (disposed) return;
          const url = URL.createObjectURL(blob);
          objectUrls.current.push(url);
          setVideoSources((current) => current.map((source, sourceIndex) => sourceIndex === index ? url : source));
        })
        .catch(() => {
          if (disposed) return;
          setVideoSources((current) => current.map((source, sourceIndex) => sourceIndex === index ? scene.video : source));
        });
    });
    const fallback = window.setTimeout(() => {
      if (!loadedVideos.current.size) setVideoReady(1);
    }, 7000);
    return () => {
      disposed = true;
      controllers.forEach((controller) => controller.abort());
      window.clearTimeout(fallback);
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current = [];
    };
  }, []);

  useEffect(() => {
    const began = performance.now();
    let displayed = 0;
    const interval = window.setInterval(() => {
      const cap = videoReady >= 1 ? 99 : 91;
      displayed = Math.min(cap, displayed + (displayed < 58 ? 2 : 1));
      setLoading(displayed);
    }, 52);
    if (videoReady >= 1) {
      const delay = Math.max(0, 2500 - (performance.now() - began));
      window.setTimeout(() => {
        window.clearInterval(interval);
        setLoading(100);
        window.setTimeout(() => setReady(true), 360);
      }, delay);
    }
    return () => window.clearInterval(interval);
  }, [videoReady]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    const frame = window.requestAnimationFrame(update);
    media.addEventListener("change", update);
    return () => {
      window.cancelAnimationFrame(frame);
      media.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!started) return;
    let disposed = false;
    let frame = 0;
    let lastVideoSeek = 0;
    const tick = (now: number) => {
      if (disposed) return;
      const target = window.scrollY;
      smoothedScroll.current += (target - smoothedScroll.current) * (reducedMotion ? 1 : 0.085);
      const value = smoothedScroll.current;
      const viewport = Math.max(1, window.innerHeight);
      const first = sectionRefs.current[0];
      const second = sectionRefs.current[1];
      if (first && second) {
        const p0 = clamp((value - first.offsetTop) / Math.max(viewport, first.offsetHeight - viewport));
        const p1 = clamp((value - second.offsetTop) / Math.max(viewport, second.offsetHeight - viewport));
        const blend = range(value, second.offsetTop - viewport * 0.68, second.offsetTop + viewport * 0.38);
        const nextScene = blend > 0.55 || p1 > 0.015 ? 1 : 0;
        const activeProgress = nextScene === 0 ? p0 : p1;
        if (activeSceneRef.current !== nextScene) {
          activeSceneRef.current = nextScene;
          setActiveScene(nextScene);
          setHoldProgress(0);
        }
        setSceneProgress((previous) => Math.abs(previous - activeProgress) > 0.003 ? activeProgress : previous);
        setTransition((previous) => Math.abs(previous - blend) > 0.004 ? blend : previous);

        const stage = stageRef.current;
        if (stage) {
          const s0 = smooth(p0);
          const s1 = smooth(p1);
          const peak = Math.sin(blend * Math.PI);
          stage.style.setProperty("--scene-a", `${1 - blend}`);
          stage.style.setProperty("--scene-b", `${blend}`);
          stage.style.setProperty("--transition-peak", `${peak}`);
          stage.style.setProperty("--a-x", `${lerp(-0.8, 0.55, s0)}vw`);
          stage.style.setProperty("--a-y", `${lerp(0.7, -0.55, s0)}vh`);
          stage.style.setProperty("--a-scale", `${lerp(1.025, 1.055, range(p0, 0.08, 0.78))}`);
          stage.style.setProperty("--b-x", `${lerp(0.65, -0.6, s1)}vw`);
          stage.style.setProperty("--b-y", `${lerp(-0.45, 0.65, s1)}vh`);
          stage.style.setProperty("--b-scale", `${lerp(1.03, 1.06, range(p1, 0.08, 0.82))}`);
        }

        if (now - lastVideoSeek > 16) {
          lastVideoSeek = now;
          [p0, p1].forEach((progress, index) => {
            const video = videoRefs.current[index];
            if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
            const mapped = directedTimeline(lingerEase(progress, index === 0 ? 0.24 : 0.3));
            smoothedVideoTime.current[index] += (mapped - smoothedVideoTime.current[index]) * (reducedMotion ? 1 : 0.18);
            const desired = video.duration * smoothedVideoTime.current[index];
            if (!video.seeking && Math.abs(video.currentTime - desired) > 0.018) {
              try { video.currentTime = desired; } catch { /* blob metadata may still be settling */ }
            }
          });
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    smoothedScroll.current = window.scrollY;
    frame = window.requestAnimationFrame(tick);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
    };
  }, [started, reducedMotion]);

  useEffect(() => () => {
    if (cursorTimer.current) window.clearTimeout(cursorTimer.current);
    if (holdFrame.current) window.cancelAnimationFrame(holdFrame.current);
    if (audioRef.current) {
      audioRef.current.audio.pause();
      audioRef.current.audio.removeAttribute("src");
      audioRef.current.audio.load();
    }
  }, []);

  const startAudio = useCallback(async () => {
    if (!audioRef.current) audioRef.current = buildSoundtrack();
    const engine = audioRef.current;
    if (!engine) return;
    try {
      engine.audio.muted = muted;
      await engine.audio.play();
      engine.fadeTo(muted ? 0 : 0.38, 1250);
    } catch { /* first gesture will retry */ }
  }, [muted]);

  const startJourney = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setInkOrigin(pointerRef.current);
    setOpening(true);
    setBurstKey((value) => value + 1);
    void startAudio();
    window.setTimeout(() => {
      setStarted(true);
      setOpening(false);
      window.setTimeout(() => storyRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" }), 80);
    }, reducedMotion ? 120 : 900);
  };

  const toggleSound = async () => {
    await startAudio();
    const next = !muted;
    setMuted(next);
    const engine = audioRef.current;
    if (engine) {
      engine.audio.muted = next;
      if (!next) engine.fadeTo(0.38, 850);
    }
  };

  const completeHold = useCallback(() => {
    const scene = activeSceneRef.current;
    setHolding(false);
    setHoldProgress(1);
    setEffectScene(scene);
    setBurstKey((value) => value + 1);
    audioRef.current?.cue(scene);
    document.documentElement.classList.remove("scroll-locked");
    window.setTimeout(() => setHoldProgress(0), 520);
    window.setTimeout(() => setEffectScene((current) => current === scene ? null : current), 3300);
  }, []);

  const beginHold = useCallback(() => {
    if (!started || holdFrame.current) return;
    setCursorVisible(true);
    setHolding(true);
    document.documentElement.classList.add("scroll-locked");
    holdBegan.current = performance.now();
    const draw = (time: number) => {
      const next = clamp((time - holdBegan.current) / 1450);
      setHoldProgress(next);
      if (next >= 1) {
        holdFrame.current = null;
        completeHold();
      } else {
        holdFrame.current = window.requestAnimationFrame(draw);
      }
    };
    holdFrame.current = window.requestAnimationFrame(draw);
  }, [completeHold, started]);

  const endHold = useCallback(() => {
    if (!holdFrame.current) return;
    window.cancelAnimationFrame(holdFrame.current);
    holdFrame.current = null;
    document.documentElement.classList.remove("scroll-locked");
    setHolding(false);
    setHoldProgress(0);
  }, []);

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!started) return;
    pointerRef.current = { x: event.clientX, y: event.clientY };
    setInkOrigin(pointerRef.current);
    stageRef.current?.style.setProperty("--pointer-x", `${(event.clientX / Math.max(1, window.innerWidth) - 0.5) * -1.1}vw`);
    stageRef.current?.style.setProperty("--pointer-y", `${(event.clientY / Math.max(1, window.innerHeight) - 0.5) * -0.75}vh`);
    const cue = document.querySelector<HTMLElement>(".hold-cue");
    cue?.style.setProperty("--cursor-x", `${event.clientX}px`);
    cue?.style.setProperty("--cursor-y", `${event.clientY}px`);
    setCursorVisible(true);
    if (cursorTimer.current) window.clearTimeout(cursorTimer.current);
    cursorTimer.current = window.setTimeout(() => {
      if (!holding) setCursorVisible(false);
    }, 2900);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    pointerRef.current = { x: event.clientX, y: event.clientY };
    setInkOrigin(pointerRef.current);
    beginHold();
  };

  const captions = useMemo(() => scenes.flatMap((scene, sceneIndex) =>
    scene.lines.map((line, lineIndex) => ({ ...line, sceneIndex, lineIndex, scene }))
  ), []);
  const currentScene = scenes[activeScene];

  return (
    <main
      className={`experience video-experience${started ? " is-started" : ""}${opening ? " is-opening" : ""}${holding ? " is-holding" : ""}${effectScene !== null ? ` has-effect effect-scene-${effectScene}` : ""}${reducedMotion ? " reduce-motion" : ""}`}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={endHold}
      onPointerCancel={endHold}
      onPointerLeave={endHold}
    >
      <div className={`loader${ready ? " is-ready" : ""}${started ? " is-hidden" : ""}`}>
        <div className="loader-scene" style={{ "--loader-image": `url(${scenes[0].poster})` } as CSSProperties} aria-hidden="true" />
        <div className="loader-colour" aria-hidden="true" />
        <Suspense fallback={null}>
          <ThreeInkOpening progress={loading} ready={ready} opening={opening} reducedMotion={reducedMotion} />
        </Suspense>
        {!ready ? (
          <div className="loading-mark" role="status" aria-live="polite">
            <span>墨色正在展開</span>
            <strong>{String(loading).padStart(2, "0")}<small>%</small></strong>
          </div>
        ) : (
          <div className="opening-title">
            <p>一滴墨，穿過山城與燈火</p>
            <h1>熱熾葵青</h1>
            <button className="journey-start" onClick={startJourney}><span>開始旅程</span><i aria-hidden="true" /></button>
            <small>建議開啟聲音 · 滾輪控制鏡頭</small>
          </div>
        )}
      </div>

      <header className="topbar">
        <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" })}>熱熾葵青</button>
        <div>
          <button onClick={() => setReducedMotion((value) => !value)}>{reducedMotion ? "恢復動畫" : "減少動畫"}</button>
          <button className="sound" onClick={toggleSound} aria-pressed={!muted}>
            <span>{muted ? "開啟聲音" : "西湖漫遊"}</span>
            <i className={muted ? "muted" : ""} aria-hidden="true"><b /><b /><b /><b /></i>
          </button>
        </div>
      </header>

      <div className="film-world" ref={stageRef} aria-hidden="true">
        {scenes.map((scene, index) => (
          <div className={`film-scene film-scene--${index}`} key={scene.id}>
            <div className="film-plane">
              <video
                ref={(node) => { videoRefs.current[index] = node; }}
                className="scene-film"
                muted
                playsInline
                preload="auto"
                poster={scene.poster}
                src={videoSources[index] ?? undefined}
                onLoadedMetadata={() => markVideoReady(index)}
                onLoadedData={() => markVideoReady(index)}
                onCanPlay={() => markVideoReady(index)}
                onError={() => markVideoReady(index)}
              />
              <div className="film-grade" />
              <div className="watermark-veil" />
            </div>
          </div>
        ))}
        <div className="depth-fog depth-fog--far" />
        <div className="depth-fog depth-fog--near" />
        <div className="transition-occluder"><i /><i /><i /></div>
        <div className="paper-fibres" />
        <Suspense fallback={null}>
          <ThreeFilmInk
            transition={transition * 0.34}
            holdProgress={holdProgress}
            burstKey={burstKey}
            origin={inkOrigin}
            scene={activeScene}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      </div>

      <div className="caption-stage" aria-live="polite">
        {captions.map((caption) => {
          const visible = activeScene === caption.sceneIndex && sceneProgress >= caption.start && sceneProgress <= caption.end;
          return (
            <div className={`cinematic-caption caption-${caption.direction}${visible ? " is-visible" : ""}`} key={`${caption.scene.id}-${caption.lineIndex}`}>
              <p className="place">{caption.scene.place}</p>
              <p className="caption-line">{caption.text}</p>
              {caption.scene.heritage && caption.lineIndex === 1 && <p className="heritage">{caption.scene.heritage}</p>}
            </div>
          );
        })}
      </div>

      <button
        className={`hold-cue${cursorVisible ? " is-visible" : ""}${holding ? " is-holding" : ""}`}
        style={{ "--hold": holdProgress } as CSSProperties}
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
        aria-label={`${currentScene.interaction}，長按啟動動畫`}
      >
        <i aria-hidden="true" /><span>{currentScene.interaction}</span>
      </button>

      {started && <div className="scroll-cue" aria-hidden="true"><span>滾動前行</span><i /></div>}

      <section className="scroll-story" ref={storyRef} aria-label="熱熾葵青故事">
        {scenes.map((scene, index) => (
          <article className="story-scene" data-scene={scene.id} ref={(node) => { sectionRefs.current[index] = node; }} key={scene.id}>
            <span className="sr-only">{scene.place}：{scene.lines.map((line) => line.text).join(" ")}</span>
          </article>
        ))}
        <article className="prototype-ending">
          <div>
            <p>兩幕試演完成</p>
            <h2>墨仍在流動，<br />餘下七幕將沿此展開。</h2>
            <button onClick={() => sectionRefs.current[0]?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" })}>再次觀看</button>
          </div>
        </article>
      </section>
    </main>
  );
}
