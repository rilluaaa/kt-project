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
import Image from "next/image";

export const dynamic = "force-static";

const ThreeInkOpening = lazy(() => import("./ThreeInkOpening"));
const ThreeFilmInk = lazy(() => import("./ThreeFilmInk"));
const SceneInteraction = lazy(() => import("./SceneInteraction"));
const assetPrefix = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const assetUrl = (path: string) => `${assetPrefix}${path}`;

type CaptionDirection =
  | "near-left"
  | "far-right"
  | "high-left"
  | "low-centre"
  | "high-right"
  | "low-left";

type Scene = {
  id: "mountain" | "street" | "night-craft" | "harbour" | "opera";
  place: string;
  interaction?: string;
  heritage?: string;
  video: string;
  poster: string;
  lines: Array<{ text: string; start: number; end: number; direction: CaptionDirection }>;
};

const scenes: Scene[] = [
  {
    id: "mountain",
    place: "山城入墨",
    video: assetUrl("/media/kt3.1-scroll.mp4"),
    poster: assetUrl("/media/kt3.1-poster.png"),
    lines: [
      { text: "霧穿過山脊，墨沿石縫落進城市。", start: 0.32, end: 0.55, direction: "near-left" },
      { text: "山與樓之間，葵青從海霧中醒來。", start: 0.62, end: 0.84, direction: "far-right" },
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
      { text: "茶湯拉成幼線，在蒸氣裏沖出清晨。", start: 0.25, end: 0.50, direction: "high-left" },
      { text: "木屑隨刻刀落下，舊舖把手藝留在街角。", start: 0.59, end: 0.83, direction: "low-centre" },
    ],
  },
  {
    id: "night-craft",
    place: "夜工燃光",
    interaction: "燃亮霓虹",
    heritage: "霓虹燈管製作技藝",
    video: assetUrl("/media/kt3.3-scroll.mp4"),
    poster: assetUrl("/media/kt3.3-poster.png"),
    lines: [
      { text: "燈火沿着匠人的手藝，在夜色裏逐筆亮起。", start: 0.34, end: 0.58, direction: "high-right" },
      { text: "金屬、竹影與人情，磨成葵涌的一夜光。", start: 0.64, end: 0.86, direction: "low-left" },
    ],
  },
  {
    id: "harbour",
    place: "海港成脈",
    video: assetUrl("/media/kt3.4-scroll.mp4"),
    poster: assetUrl("/media/kt3.4-poster.png"),
    lines: [
      { text: "吊臂提起晨霧，貨櫃把城市的脈搏排成長線。", start: 0.31, end: 0.56, direction: "near-left" },
      { text: "潮水一進一退，海港仍把遠方送到眼前。", start: 0.63, end: 0.85, direction: "high-right" },
    ],
  },
  {
    id: "opera",
    place: "鑼鼓入海",
    interaction: "點亮戲棚",
    heritage: "竹棚戲台與社區節慶",
    video: assetUrl("/media/kt3.5-scroll.mp4"),
    poster: assetUrl("/media/kt3.5-poster.png"),
    lines: [
      { text: "竹棚靠着海風搭起，一聲鑼鼓叫亮整個夜晚。", start: 0.32, end: 0.57, direction: "low-left" },
      { text: "燈影照住台前台後，也照住一代代相聚的人。", start: 0.63, end: 0.86, direction: "far-right" },
    ],
  },
];

const interactionSceneIndexes = new Set([1, 2, 4]);

type AudioEngine = {
  audio: HTMLAudioElement;
  fadeTo: (volume: number, duration?: number) => void;
  cue: () => void;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smooth = (value: number) => {
  const v = clamp(value);
  return v * v * (3 - 2 * v);
};
const range = (value: number, start: number, end: number) => smooth((value - start) / (end - start));
const lerp = (a: number, b: number, amount: number) => a + (b - a) * amount;

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
      fadeTo(0.25, 180);
      window.setTimeout(() => fadeTo(0.38, 1100), 300);
    },
  };
}

/* Keep the source film's full timing intact; the scene height controls how
   slowly that timeline is scrubbed instead of treating its opening specially. */
function directedTimeline(progress: number) {
  return lerp(0, 0.995, clamp(progress));
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
  const [opening, setOpening] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [videoSources, setVideoSources] = useState<Array<string | null>>(() => scenes.map(() => null));
  const [cursorVisible, setCursorVisible] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [effectScene, setEffectScene] = useState<number | null>(null);
  const [effectVideo, setEffectVideo] = useState<HTMLVideoElement | null>(null);
  const [effectKey, setEffectKey] = useState(0);
  const [inkOrigin, setInkOrigin] = useState({ x: 0, y: 0 });

  const stageRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const filmSceneRefs = useRef<Array<HTMLDivElement | null>>([]);
  const finaleFilmRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const loadedVideos = useRef(new Set<number>());
  const fetchProgress = useRef(scenes.map(() => 0));
  const audioRef = useRef<AudioEngine | null>(null);
  const holdFrame = useRef<number | null>(null);
  const holdBegan = useRef(0);
  const cursorTimer = useRef<number | null>(null);
  const smoothedScroll = useRef(0);
  const smoothedVideoTime = useRef(scenes.map(() => 0));
  const activeSceneRef = useRef(0);
  const loadingBegan = useRef(0);

  const refreshLoading = useCallback(() => {
    const downloaded = fetchProgress.current.reduce((sum, value) => sum + value, 0) / scenes.length;
    const decoded = loadedVideos.current.size / scenes.length;
    setLoading(Math.min(100, Math.floor(downloaded * 94 + decoded * 6)));
  }, []);

  const markVideoReady = useCallback((index: number) => {
    if (loadedVideos.current.has(index)) return;
    smoothedVideoTime.current[index] = 0;
    loadedVideos.current.add(index);
    refreshLoading();
    if (loadedVideos.current.size === scenes.length) setAssetsReady(true);
  }, [refreshLoading]);

  const warmVideo = useCallback((index: number, video: HTMLVideoElement) => {
    if (loadedVideos.current.has(index) || !Number.isFinite(video.duration) || video.duration <= 0) return;
    markVideoReady(index);
  }, [markVideoReady]);

  /* Download every film into a seekable Blob and decode its entry frame while
     the gate is still visible. The journey never has to fetch while moving. */
  useEffect(() => {
    let disposed = false;
    const indexes = scenes.map((_, index) => index);
    const controllers = indexes.map(() => new AbortController());
    const urls: string[] = [];
    loadingBegan.current = performance.now();
    fetchProgress.current.fill(0);
    const fetchFilm = async (index: number, signal: AbortSignal) => {
      try {
        const response = await fetch(scenes[index].video, { signal });
        if (!response.ok) throw new Error(`film ${index} failed`);
        const total = Number(response.headers.get("content-length")) || 0;
        let blob: Blob;
        if (response.body) {
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let received = 0;
          let reported = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.byteLength;
            const next = total > 0 ? Math.min(0.99, received / total) : Math.min(0.9, reported + 0.015);
            if (next - reported >= 0.012) {
              reported = next;
              fetchProgress.current[index] = next;
              refreshLoading();
            }
          }
          blob = new Blob(chunks, { type: response.headers.get("content-type") ?? "video/mp4" });
        } else {
          blob = await response.blob();
        }
        if (disposed) return;
        fetchProgress.current[index] = 1;
        refreshLoading();
        const url = URL.createObjectURL(blob);
        urls.push(url);
        setVideoSources((current) => current.map((source, sourceIndex) => sourceIndex === index ? url : source));
      } catch {
        if (disposed) return;
        fetchProgress.current[index] = 1;
        refreshLoading();
        setVideoSources((current) => current.map((source, sourceIndex) => sourceIndex === index ? scenes[index].video : source));
      }
    };
    void Promise.all(indexes.map((index, position) => fetchFilm(index, controllers[position].signal)));
    return () => {
      disposed = true;
      controllers.forEach((controller) => controller.abort());
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [refreshLoading]);

  useEffect(() => {
    if (assetsReady) {
      const delay = Math.max(0, 1750 - (performance.now() - loadingBegan.current));
      const finish = window.setTimeout(() => {
        setLoading(100);
        window.setTimeout(() => setReady(true), 360);
      }, delay);
      return () => window.clearTimeout(finish);
    }
  }, [assetsReady]);

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
    const drift = [
      [-1.25, 0.9, 1.15, -0.85],
      [1.1, -0.7, -1.2, 0.8],
      [-0.85, -0.75, 1.05, 0.7],
      [1.2, 0.7, -1.05, -0.8],
      [-1.05, 0.65, 1.15, -0.7],
    ];

    const tick = (now: number) => {
      if (disposed) return;
      const target = window.scrollY;
      smoothedScroll.current += (target - smoothedScroll.current) * (reducedMotion ? 1 : 0.09);
      const value = smoothedScroll.current;
      const viewport = Math.max(1, window.innerHeight);
      const progress = sectionRefs.current.map((section) => {
        if (!section) return 0;
        return clamp((value - section.offsetTop) / Math.max(1, section.offsetHeight - viewport));
      });

      let current = 0;
      sectionRefs.current.forEach((section, index) => {
        if (section && value >= section.offsetTop - 1) current = index;
      });
      current = Math.min(scenes.length - 1, current);
      const currentProgress = progress[current] ?? 0;
      const blend = range(currentProgress, 0.875, 1);
      const transitionPeak = Math.sin(blend * Math.PI);

      if (activeSceneRef.current !== current) {
        activeSceneRef.current = current;
        setActiveScene(current);
        setHoldProgress(0);
        setCursorVisible(false);
      }
      setSceneProgress((previous) => Math.abs(previous - currentProgress) > 0.003 ? currentProgress : previous);
      setTransition((previous) => Math.abs(previous - transitionPeak) > 0.004 ? transitionPeak : previous);

      filmSceneRefs.current.forEach((element, index) => {
        if (!element) return;
        const opacity = index === current
          ? 1 - blend
          : current < scenes.length - 1 && index === current + 1
            ? blend
            : 0;
        const p = progress[index] ?? 0;
        const eased = smooth(p);
        const [fromX, fromY, toX, toY] = drift[index];
        element.style.setProperty("--scene-opacity", `${opacity}`);
        element.style.setProperty("--scene-x", `${lerp(fromX, toX, eased)}vw`);
        element.style.setProperty("--scene-y", `${lerp(fromY, toY, eased)}vh`);
        element.style.setProperty("--scene-scale", `${lerp(1.012, 1.052, range(p, 0.28, 0.86))}`);
      });
      finaleFilmRef.current?.style.setProperty(
        "--scene-opacity",
        `${current === scenes.length - 1 ? blend : 0}`,
      );
      stageRef.current?.style.setProperty("--transition-peak", `${transitionPeak}`);

      if (now - lastVideoSeek > 18 && effectScene === null) {
        lastVideoSeek = now;
        const sought = current < scenes.length - 1 && blend > 0.01 ? [current, current + 1] : [current];
        sought.forEach((index) => {
          const video = videoRefs.current[index];
          if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
          const mapped = directedTimeline(progress[index] ?? 0);
          smoothedVideoTime.current[index] += (mapped - smoothedVideoTime.current[index]) * (reducedMotion ? 1 : 0.2);
          const desired = video.duration * smoothedVideoTime.current[index];
          if (!video.seeking && Math.abs(video.currentTime - desired) > 0.018) {
            try { video.currentTime = desired; } catch { /* Blob metadata can still be settling. */ }
          }
        });
      }
      frame = window.requestAnimationFrame(tick);
    };
    smoothedScroll.current = window.scrollY;
    frame = window.requestAnimationFrame(tick);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
    };
  }, [effectScene, reducedMotion, started]);

  useEffect(() => () => {
    if (cursorTimer.current) window.clearTimeout(cursorTimer.current);
    if (holdFrame.current) window.cancelAnimationFrame(holdFrame.current);
    document.documentElement.classList.remove("scroll-locked");
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
    } catch { /* A later user gesture will retry. */ }
  }, [muted]);

  const startJourney = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setInkOrigin(origin);
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
    if (audioRef.current) {
      audioRef.current.audio.muted = next;
      if (!next) audioRef.current.fadeTo(0.38, 850);
    }
  };

  const interactionAvailable = started
    && effectScene === null
    && interactionSceneIndexes.has(activeScene)
    && sceneProgress >= 0.34
    && sceneProgress <= 0.82
    && Boolean(videoSources[activeScene]);

  const completeHold = useCallback(() => {
    const scene = activeSceneRef.current;
    setHolding(false);
    setHoldProgress(1);
    setBurstKey((value) => value + 1);
    setEffectVideo(videoRefs.current[scene]);
    setEffectScene(scene);
    setEffectKey((value) => value + 1);
    setCursorVisible(false);
    audioRef.current?.cue();
    window.setTimeout(() => setHoldProgress(0), 420);
  }, []);

  const beginHold = useCallback(() => {
    if (!interactionAvailable || holdFrame.current) return;
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
  }, [completeHold, interactionAvailable]);

  const endHold = useCallback(() => {
    if (!holdFrame.current) return;
    window.cancelAnimationFrame(holdFrame.current);
    holdFrame.current = null;
    document.documentElement.classList.remove("scroll-locked");
    setHolding(false);
    setHoldProgress(0);
  }, []);

  const finishInteraction = useCallback(() => {
    document.documentElement.classList.remove("scroll-locked");
    setEffectScene(null);
    setEffectVideo(null);
    setHoldProgress(0);
  }, []);

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!started || effectScene !== null) return;
    const origin = { x: event.clientX, y: event.clientY };
    setInkOrigin(origin);
    stageRef.current?.style.setProperty("--pointer-x", `${(event.clientX / Math.max(1, window.innerWidth) - 0.5) * -0.8}vw`);
    stageRef.current?.style.setProperty("--pointer-y", `${(event.clientY / Math.max(1, window.innerHeight) - 0.5) * -0.55}vh`);
    const cue = document.querySelector<HTMLElement>(".hold-cue");
    cue?.style.setProperty("--cursor-x", `${event.clientX}px`);
    cue?.style.setProperty("--cursor-y", `${event.clientY}px`);
    if (interactionAvailable) setCursorVisible(true);
    if (cursorTimer.current) window.clearTimeout(cursorTimer.current);
    cursorTimer.current = window.setTimeout(() => {
      if (!holding) setCursorVisible(false);
    }, 2900);
  };

  const captions = useMemo(() => scenes.flatMap((scene, sceneIndex) =>
    scene.lines.map((line, lineIndex) => ({ ...line, sceneIndex, lineIndex, scene })),
  ), []);
  const currentScene = scenes[activeScene];

  return (
    <main
      className={`experience video-experience${started ? " is-started" : ""}${opening ? " is-opening" : ""}${holding ? " is-holding" : ""}${effectScene !== null ? " is-interacting" : ""}${reducedMotion ? " reduce-motion" : ""}`}
      onPointerMove={handlePointerMove}
      onPointerUp={endHold}
      onPointerCancel={endHold}
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
            <button className="journey-start" onClick={startJourney}><span>開始旅程</span></button>
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
          <div
            className={`film-scene film-scene--${index}`}
            ref={(node) => { filmSceneRefs.current[index] = node; }}
            key={scene.id}
          >
            <div className="film-plane" style={{ "--poster-image": `url(${scene.poster})` } as CSSProperties}>
              <video
                ref={(node) => { videoRefs.current[index] = node; }}
                className="scene-film"
                muted
                playsInline
                preload="auto"
                poster={scene.poster}
                src={videoSources[index] ?? undefined}
                onLoadedData={(event) => warmVideo(index, event.currentTarget)}
                onCanPlay={(event) => warmVideo(index, event.currentTarget)}
                onSeeked={() => markVideoReady(index)}
                onError={() => markVideoReady(index)}
              />
              <div className="film-grade" />
            </div>
          </div>
        ))}
        <div className="film-scene film-scene--final" ref={finaleFilmRef}>
          <div className="film-plane">
            <Image
              className="finale-film-image"
              src={assetUrl("/media/kt3.6-colour.png")}
              alt=""
              fill
              unoptimized
              sizes="100vw"
            />
            <div className="film-grade" />
          </div>
        </div>
        <div className="depth-fog depth-fog--far" />
        <div className="depth-fog depth-fog--near" />
        <div className="transition-occluder"><i /><i /><i /><i /></div>
        <div className="paper-fibres" />
        <Suspense fallback={null}>
          <ThreeFilmInk
            transition={transition}
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
          const visible = effectScene === null
            && activeScene === caption.sceneIndex
            && sceneProgress >= caption.start
            && sceneProgress <= caption.end;
          return (
            <div className={`cinematic-caption caption-${caption.direction}${visible ? " is-visible" : ""}`} key={`${caption.scene.id}-${caption.lineIndex}`}>
              <p className="caption-line">{caption.text}</p>
              {caption.scene.heritage
                && caption.lineIndex === (caption.scene.id === "street" ? 0 : 1)
                && <p className="heritage">{caption.scene.heritage}</p>}
            </div>
          );
        })}
      </div>

      {currentScene.interaction && interactionSceneIndexes.has(activeScene) && (
        <button
          className={`hold-cue${interactionAvailable ? " is-available" : ""}${cursorVisible ? " is-visible" : ""}${holding ? " is-holding" : ""}`}
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
          <i aria-hidden="true"><b /><b /><b /></i><span>{currentScene.interaction}</span>
        </button>
      )}

      {effectScene !== null && (
        <Suspense fallback={null}>
          <SceneInteraction
            effectKey={effectKey}
            scene={effectScene}
            sourceVideo={effectVideo}
            reducedMotion={reducedMotion}
            onComplete={finishInteraction}
          />
        </Suspense>
      )}

      {started && <div className="scroll-cue" aria-hidden="true"><span>滾動前行</span><i /></div>}

      <section className="scroll-story" id="film-story" ref={storyRef} aria-label="熱熾葵青故事">
        {scenes.map((scene, index) => (
          <article className="story-scene" data-scene={scene.id} ref={(node) => { sectionRefs.current[index] = node; }} key={scene.id}>
            <span className="sr-only">{scene.place}：{scene.lines.map((line) => line.text).join(" ")}</span>
          </article>
        ))}
        <section className="finale" aria-label="相聚葵青">
          <div className="finale-visual">
            <div className="finale-grade" />
            <div className="finale-copy">
              <p>一城燈火，終於回到一張飯桌。</p>
              <h2>墨脈未止，<br />人情仍在延續。</h2>
            </div>
          </div>
          <section className="explore-page" aria-labelledby="explore-title">
            <div className="explore-wash" aria-hidden="true"><i /><i /><i /></div>
            <div className="explore-intro">
              <p>山、城、海與人情，仍有更多路徑等待展開。</p>
              <h2 id="explore-title">熱熾葵青，<br />燈火未央。</h2>
              <button
                className="explore-button"
                onClick={() => sectionRefs.current[0]?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" })}
              >
                <span>探索葵青</span><b aria-hidden="true">→</b>
              </button>
            </div>
            <div className="explore-notes" aria-label="葵青探索方向">
              <article><small>山海相接</small><h3>由石梨山俯瞰港灣</h3><p>沿高低起伏的城市線，重新看見山勢、屋邨與海港如何相連。</p></article>
              <article><small>工藝在場</small><h3>走進街巷與舊舖</h3><p>從一杯奶茶、一張木枱到一筆霓虹，細看仍在日常延續的手藝。</p></article>
              <article><small>燈火相聚</small><h3>聽見社區的節奏</h3><p>戲棚、鑼鼓與飯桌，記住人們在同一片燈火下相遇的時刻。</p></article>
            </div>
            <p className="explore-signoff">熱熾葵青 · 一滴墨，穿過山城與燈火</p>
          </section>
        </section>
      </section>
    </main>
  );
}
