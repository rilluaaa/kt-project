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
  video: string;
  mobileVideo: string;
  poster: string;
  lines: Array<{ text: string; label: string; start: number; end: number; direction: CaptionDirection }>;
};

const scenes: Scene[] = [
  {
    id: "mountain",
    place: "山城入墨",
    video: assetUrl("/media/kt3.1-scroll.mp4"),
    mobileVideo: assetUrl("/media/kt3.1-scroll-mobile.mp4"),
    poster: assetUrl("/media/kt3.1-poster.webp"),
    lines: [
      { text: "葵青由昔日鄉村逐步發展成工商業與住宅並存的社區。\n山坡屋邨、街市、工場與海港聚集不同背景的居民，\n飲食文化、節慶習俗及傳統手藝亦在日常生活和工作之間延續，形成葵青獨有的地方記憶。", label: "葵青的文化土壤", start: 0.48, end: 0.88, direction: "far-right" },
    ],
  },
  {
    id: "street",
    place: "葵涌早茶",
    interaction: "沖開茶香",
    video: assetUrl("/media/kt3.2-scroll.mp4"),
    mobileVideo: assetUrl("/media/kt3.2-scroll-mobile.mp4"),
    poster: assetUrl("/media/kt3.2-poster.webp"),
    lines: [
      { text: "港式奶茶製作技藝屬於香港其中一項非物質文化遺產。\n師傅把拼配紅茶放入布袋漏勺，經煲茶、焗茶和反覆撞茶，再加入淡奶。\n這杯茶不只是飲品，也是葵涌茶餐廳、工友早晨與街坊生活共同累積的城市味道。", label: "港式奶茶製作技藝", start: 0.18, end: 0.50, direction: "high-left" },
      { text: "木雕刻先以畫稿定形，再用鑿刀刻出文字、花紋與建築構件。\n刀痕深淺與方向決定作品層次，是香港其中一項非物質文化遺產。\n這門手藝曾在葵涌的香港非物質文化遺產考察中介紹，讓工業社區師傅的經驗被重新看見。", label: "木雕刻技藝", start: 0.54, end: 0.88, direction: "low-centre" },
    ],
  },
  {
    id: "night-craft",
    place: "夜工燃光",
    interaction: "燃亮霓虹",
    video: assetUrl("/media/kt3.3-scroll.mp4"),
    mobileVideo: assetUrl("/media/kt3.3-scroll-mobile.mp4"),
    poster: assetUrl("/media/kt3.3-poster.webp"),
    lines: [
      { text: "霓虹光管製作及造型技藝屬於香港其中一項非物質文化遺產。\n屈管師傅按圖把玻璃管逐段加熱、彎曲和焊接，再抽走空氣、注入氣體及接駁電極。\n每一道發光文字與線條，都由雙手、經驗和精準火候塑造而成。", label: "霓虹光管製作及造型技藝", start: 0.20, end: 0.52, direction: "high-right" },
      { text: "葵涌的工場、舊式店舖與工業大廈，為招牌設計和霓虹製作提供工作空間。\n屈管師傅把漢字筆畫轉化為發光線條，讓商店名稱在夜裡被看見。\n這些霓虹光影亦逐漸成為葵青工業社區與街道生活的集體記憶。", label: "霓虹與葵涌工場", start: 0.56, end: 0.88, direction: "low-left" },
    ],
  },
  {
    id: "harbour",
    place: "海港成脈",
    video: assetUrl("/media/kt3.4-scroll.mp4"),
    mobileVideo: assetUrl("/media/kt3.4-scroll-mobile.mp4"),
    poster: assetUrl("/media/kt3.4-poster.webp"),
    lines: [
      { text: "葵青貨櫃碼頭是理解這個地區不可缺少的背景。\n港池、貨櫃場、工業區與交通網絡日夜運作，連接海路與陸路運輸，\n不但改變沿岸景觀，也塑造居民的工作節奏、生活方式及跨越世代的社區記憶。", label: "葵青的產業背景", start: 0.20, end: 0.52, direction: "near-left" },
      { text: "港口為葵青帶來工人、貨物和不同文化，茶餐廳、招牌工場及傳統手藝亦在產業社區中落地。\n宏大的物流系統與細微的生活技藝在海旁並置，\n讓海港不只是運輸設施，也成為理解葵青居民日常生活與地方身份的重要線索。", label: "港口與生活文化", start: 0.56, end: 0.88, direction: "high-right" },
    ],
  },
  {
    id: "opera",
    place: "鑼鼓入海",
    interaction: "點亮戲棚",
    video: assetUrl("/media/kt3.5-scroll.mp4"),
    mobileVideo: assetUrl("/media/kt3.5-scroll-mobile.mp4"),
    poster: assetUrl("/media/kt3.5-poster.webp"),
    lines: [
      { text: "戲棚搭建技藝被列入香港非物質文化遺產。\n師傅按照場地、觀眾人數和演出需要，以竹、杉木及鋅鐵片搭成可拆卸的臨時劇場。\n棚內會劃分舞台、後台與觀眾席，讓神功戲、節慶活動及宗教儀式在社區空間中臨時落地。", label: "戲棚搭建技藝", start: 0.20, end: 0.52, direction: "low-left" },
      { text: "葵青曾舉辦戲棚傳統文化活動，以臨時戲棚連結粵劇、節慶、飲食與街坊參與。\n戲棚搭建技藝因此不只是建築方法，\n更是一項讓居民相聚的香港非物質文化遺產；棚架搭起舞台，同時也重新連起社區關係。", label: "戲棚與葵青社區", start: 0.56, end: 0.88, direction: "far-right" },
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
// Keep only a trace of the former catch-up feel. A value near zero stays close
// to the physical scroll position and avoids the slow-start / fast-finish jump.
const LIGHT_SCROLL_ACCELERATION = 0.06;
const SCROLL_COAST_STRENGTH = 0.035;
const SCROLL_COAST_DAMPING = 0.87;
const SCROLL_COAST_DELAY_MS = 72;

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
  const [posterSources, setPosterSources] = useState(() => scenes.map((_, index) => index === 0));
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
  const activeSceneRef = useRef(0);
  const loadingBegan = useRef(0);
  const requiredReadyCount = useRef(scenes.length);
  const minimumGateMs = useRef(1750);

  const refreshLoading = useCallback(() => {
    const required = requiredReadyCount.current;
    const downloaded = fetchProgress.current.slice(0, required).reduce((sum, value) => sum + value, 0) / required;
    const decoded = Array.from(loadedVideos.current).filter((index) => index < required).length / required;
    setLoading(Math.min(100, Math.floor(downloaded * 94 + decoded * 6)));
  }, []);

  const markVideoReady = useCallback((index: number) => {
    if (loadedVideos.current.has(index)) return;
    loadedVideos.current.add(index);
    refreshLoading();
    const decodedRequired = Array.from(loadedVideos.current).filter((loadedIndex) => loadedIndex < requiredReadyCount.current).length;
    if (decodedRequired >= requiredReadyCount.current) setAssetsReady(true);
  }, [refreshLoading]);

  const warmVideo = useCallback((index: number, video: HTMLVideoElement) => {
    if (loadedVideos.current.has(index) || !Number.isFinite(video.duration) || video.duration <= 0) return;
    markVideoReady(index);
  }, [markVideoReady]);

  /* Both layouts finish downloading every scrub film behind the loading gate.
     Mobile selects a compact 1080x720 encode, so entry is faster without
     postponing any scene download until after the journey has started. */
  useEffect(() => {
    let disposed = false;
    let stateFrame = 0;
    const indexes = scenes.map((_, index) => index);
    const urls: string[] = [];
    loadingBegan.current = performance.now();
    fetchProgress.current.fill(0);
    const useMobileFilms = window.matchMedia("(max-width: 720px), (pointer: coarse)").matches;
    requiredReadyCount.current = scenes.length;
    minimumGateMs.current = useMobileFilms ? 650 : 1750;

    stateFrame = window.requestAnimationFrame(() => {
      setPosterSources(scenes.map(() => true));
    });
    const controllers = indexes.map(() => new AbortController());
    const fetchFilm = async (index: number, signal: AbortSignal) => {
      const source = useMobileFilms ? scenes[index].mobileVideo : scenes[index].video;
      try {
        const response = await fetch(source, { signal });
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
        setVideoSources((current) => current.map((currentSource, sourceIndex) => sourceIndex === index ? source : currentSource));
      }
    };
    void Promise.all(indexes.map((index) => fetchFilm(index, controllers[index].signal)));
    return () => {
      disposed = true;
      window.cancelAnimationFrame(stateFrame);
      controllers.forEach((controller) => controller.abort());
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [refreshLoading]);

  useEffect(() => {
    if (assetsReady) {
      const delay = Math.max(0, minimumGateMs.current - (performance.now() - loadingBegan.current));
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
    let lastWheelAt = -Infinity;
    let coastVelocity = 0;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const drift = [
      [-1.25, 0.9, 1.15, -0.85],
      [1.1, -0.7, -1.2, 0.8],
      [-0.85, -0.75, 1.05, 0.7],
      [1.2, 0.7, -1.05, -0.8],
      [-1.05, 0.65, 1.15, -0.7],
    ];

    const onWheel = (event: WheelEvent) => {
      if (reducedMotion || coarsePointer || effectScene !== null) return;
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? window.innerHeight
          : 1;
      const impulse = clamp(event.deltaY * unit, -180, 180) * SCROLL_COAST_STRENGTH;
      coastVelocity = lerp(coastVelocity, impulse, 0.46);
      lastWheelAt = performance.now();
    };
    window.addEventListener("wheel", onWheel, { passive: true });

    const tick = (now: number) => {
      if (disposed) return;
      if (
        !reducedMotion
        && !coarsePointer
        && effectScene === null
        && now - lastWheelAt > SCROLL_COAST_DELAY_MS
        && Math.abs(coastVelocity) > 0.08
      ) {
        window.scrollBy({ top: coastVelocity, behavior: "auto" });
        coastVelocity *= SCROLL_COAST_DAMPING;
      }
      const target = window.scrollY;
      smoothedScroll.current = reducedMotion
        ? target
        : lerp(target, smoothedScroll.current, LIGHT_SCROLL_ACCELERATION);
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
          const desired = video.duration * mapped;
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
      window.removeEventListener("wheel", onWheel);
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
            <div
              className="film-plane"
              style={posterSources[index] ? { "--poster-image": `url(${scene.poster})` } as CSSProperties : undefined}
            >
              <video
                ref={(node) => { videoRefs.current[index] = node; }}
                className="scene-film"
                muted
                playsInline
                preload="auto"
                poster={posterSources[index] ? scene.poster : undefined}
                src={videoSources[index] ?? undefined}
                onLoadedMetadata={(event) => warmVideo(index, event.currentTarget)}
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
            <div
              className="finale-film-image"
              data-finale-image={assetUrl("/media/kt3.6-colour.webp")}
              style={posterSources[scenes.length - 1]
                ? { "--finale-image": `url(${assetUrl("/media/kt3.6-colour.webp")})` } as CSSProperties
                : undefined}
              aria-hidden="true"
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
              <p className={`heritage heritage--${caption.scene.id}`}>{caption.label}</p>
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
          <div className="finale-copy-hold" aria-hidden="true" />
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
