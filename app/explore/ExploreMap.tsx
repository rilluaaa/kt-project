"use client";

import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { heritageItems, kwaiTsingTourSource, type HeritageItem } from "./heritageData";

const assetPrefix = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const mapUrl = `${assetPrefix}/explore/kwai-tsing-seven-arts-map.jpeg`;
const MAP_WIDTH = 2048;
const MAP_HEIGHT = 857;
const STORAGE_KEY = "kwai-tsing-seven-arts-v1";

type Camera = { x: number; y: number; scale: number };
type SavedProgress = { viewed: HeritageItem["id"][]; completed: HeritageItem["id"][] };
type Point = { x: number; y: number };

const initialProgress: SavedProgress = { viewed: [], completed: [] };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const pointDistance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const pointMiddle = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export default function ExploreMap() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const baseScaleRef = useRef(1);
  const pointers = useRef(new Map<number, Point>());
  const previousPointers = useRef(new Map<number, Point>());
  const focusTimer = useRef<number | null>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const [selected, setSelected] = useState<HeritageItem | null>(null);
  const [introOpen, setIntroOpen] = useState(true);
  const [atlasOpen, setAtlasOpen] = useState(false);
  const [focusing, setFocusing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [progress, setProgress] = useState<SavedProgress>(initialProgress);
  const [mapReady, setMapReady] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);

  const clampCamera = useCallback((next: Camera) => {
    const viewport = viewportRef.current;
    if (!viewport) return next;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const scaledWidth = MAP_WIDTH * next.scale;
    const scaledHeight = MAP_HEIGHT * next.scale;
    const marginX = Math.min(width * 0.28, 260);
    const marginY = Math.min(height * 0.28, 180);
    const minX = Math.min((width - scaledWidth) / 2, width - scaledWidth - marginX);
    const maxX = Math.max((width - scaledWidth) / 2, marginX);
    const minY = Math.min((height - scaledHeight) / 2, height - scaledHeight - marginY);
    const maxY = Math.max((height - scaledHeight) / 2, marginY);
    return {
      x: clamp(next.x, minX, maxX),
      y: clamp(next.y, minY, maxY),
      scale: next.scale,
    };
  }, []);

  const updateCamera = useCallback((next: Camera) => {
    const bounded = clampCamera(next);
    cameraRef.current = bounded;
    setCamera(bounded);
  }, [clampCamera]);

  const resetCamera = useCallback((animate = true) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const scale = Math.min(viewport.clientWidth / MAP_WIDTH, viewport.clientHeight / MAP_HEIGHT);
    baseScaleRef.current = scale;
    if (animate && !reducedMotion) {
      setFocusing(true);
      if (focusTimer.current) window.clearTimeout(focusTimer.current);
      focusTimer.current = window.setTimeout(() => setFocusing(false), 700);
    }
    updateCamera({
      x: (viewport.clientWidth - MAP_WIDTH * scale) / 2,
      y: (viewport.clientHeight - MAP_HEIGHT * scale) / 2,
      scale,
    });
  }, [reducedMotion, updateCamera]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let progressFrame = 0;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        progressFrame = window.requestAnimationFrame(() => {
          setProgress({ ...initialProgress, ...JSON.parse(saved) });
        });
      }
    } catch { /* Local progress is optional. */ }
    return () => window.cancelAnimationFrame(progressFrame);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => resetCamera(false));
    observer.observe(viewport);
    resetCamera(false);
    return () => observer.disconnect();
  }, [resetCamera]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      if (introOpen || selected) return;
      event.preventDefault();
      setHintVisible(false);
      const bounds = viewport.getBoundingClientRect();
      const cursor = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const current = cameraRef.current;
      const factor = Math.exp(-event.deltaY * 0.0012);
      const scale = clamp(
        current.scale * factor,
        baseScaleRef.current,
        baseScaleRef.current * 2.85,
      );
      const worldX = (cursor.x - current.x) / current.scale;
      const worldY = (cursor.y - current.y) / current.scale;
      updateCamera({
        x: cursor.x - worldX * scale,
        y: cursor.y - worldY * scale,
        scale,
      });
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [introOpen, selected, updateCamera]);

  useEffect(() => () => {
    if (focusTimer.current) window.clearTimeout(focusTimer.current);
  }, []);

  const saveProgress = useCallback((next: SavedProgress) => {
    setProgress(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* Browsing still works without storage. */ }
  }, []);

  const markViewed = useCallback((id: HeritageItem["id"]) => {
    if (progress.viewed.includes(id)) return;
    saveProgress({ ...progress, viewed: [...progress.viewed, id] });
  }, [progress, saveProgress]);

  const focusItem = useCallback((item: HeritageItem, openCard = true) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setAtlasOpen(false);
    setHintVisible(false);
    setFocusing(!reducedMotion);
    const scale = Math.min(baseScaleRef.current * (viewport.clientWidth < 720 ? 2.05 : 1.72), baseScaleRef.current * 2.85);
    const targetX = (item.x / 100) * MAP_WIDTH;
    const targetY = (item.y / 100) * MAP_HEIGHT;
    updateCamera({
      x: viewport.clientWidth * (item.x > 86 ? 0.64 : item.x < 16 ? 0.37 : 0.5) - targetX * scale,
      y: viewport.clientHeight * (item.y > 76 ? 0.58 : 0.5) - targetY * scale,
      scale,
    });
    if (focusTimer.current) window.clearTimeout(focusTimer.current);
    focusTimer.current = window.setTimeout(() => {
      setFocusing(false);
      if (openCard) {
        setSelected(item);
        markViewed(item.id);
      }
    }, reducedMotion ? 0 : 520);
  }, [markViewed, reducedMotion, updateCamera]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (introOpen || selected) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    previousPointers.current.set(event.pointerId, point);
    setFocusing(false);
    setHintVisible(false);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId) || introOpen || selected) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const active = [...pointers.current.entries()];
    if (active.length === 1) {
      const previous = previousPointers.current.get(event.pointerId);
      if (!previous) return;
      updateCamera({
        ...cameraRef.current,
        x: cameraRef.current.x + event.clientX - previous.x,
        y: cameraRef.current.y + event.clientY - previous.y,
      });
    } else if (active.length >= 2) {
      const [first, second] = active.slice(0, 2);
      const previousFirst = previousPointers.current.get(first[0]) ?? first[1];
      const previousSecond = previousPointers.current.get(second[0]) ?? second[1];
      const previousDistance = Math.max(1, pointDistance(previousFirst, previousSecond));
      const nextDistance = pointDistance(first[1], second[1]);
      const previousMiddle = pointMiddle(previousFirst, previousSecond);
      const nextMiddle = pointMiddle(first[1], second[1]);
      const current = cameraRef.current;
      const scale = clamp(
        current.scale * (nextDistance / previousDistance),
        baseScaleRef.current,
        baseScaleRef.current * 2.85,
      );
      const worldX = (previousMiddle.x - current.x) / current.scale;
      const worldY = (previousMiddle.y - current.y) / current.scale;
      updateCamera({
        x: nextMiddle.x - worldX * scale,
        y: nextMiddle.y - worldY * scale,
        scale,
      });
    }
    previousPointers.current = new Map(pointers.current);
  };

  const releasePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    previousPointers.current.delete(event.pointerId);
    previousPointers.current = new Map(pointers.current);
  };

  const zoomBy = (factor: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const current = cameraRef.current;
    const centre = { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 };
    const scale = clamp(current.scale * factor, baseScaleRef.current, baseScaleRef.current * 2.85);
    const worldX = (centre.x - current.x) / current.scale;
    const worldY = (centre.y - current.y) / current.scale;
    updateCamera({ x: centre.x - worldX * scale, y: centre.y - worldY * scale, scale });
  };

  const closeCard = () => setSelected(null);
  const viewedCount = progress.viewed.length;
  const orderedItems = useMemo(() => heritageItems, []);

  const resetProgress = () => {
    if (!window.confirm("確定清除七藝圖鑑的已閱記錄？")) return;
    saveProgress(initialProgress);
    setSelected(null);
  };

  const replayJourney = () => {
    window.location.assign(`${assetPrefix}/?replay=1`);
  };

  return (
    <main className={`heritage-map-experience${introOpen ? " is-intro" : ""}${selected ? " has-card" : ""}`}>
      <a className="map-skip-link" href="#map-controls">跳到地圖控制</a>

      <header className="map-header" inert={introOpen || Boolean(selected) ? true : undefined}>
        <div className="map-brand">
          <small>熱熾葵青</small>
          <strong>葵青七藝遊</strong>
        </div>
        <div className="map-header-actions">
          <button className="atlas-trigger" onClick={() => setAtlasOpen((value) => !value)} aria-expanded={atlasOpen}>
            <span>七藝圖鑑</span>
            <b>{viewedCount}<i>/ 7</i></b>
          </button>
          <button className="motion-trigger" onClick={() => setReducedMotion((value) => !value)}>
            {reducedMotion ? "恢復動效" : "減少動效"}
          </button>
        </div>
      </header>

      <div
        className="map-viewport"
        ref={viewportRef}
        inert={introOpen || Boolean(selected) ? true : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        aria-label="葵青七藝互動地圖，可拖曳及縮放"
      >
        <div className="map-ambient" style={{ backgroundImage: `url(${mapUrl})` }} aria-hidden="true" />
        <div
          className={`map-canvas${focusing ? " is-focusing" : ""}`}
          style={{
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
            "--hotspot-scale": `${1 / Math.max(camera.scale, 0.001)}`,
          } as CSSProperties}
        >
          <Image
            src={mapUrl}
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            alt="綠色線描葵青山水地圖，七個文化物件分布於山城、街區和海港之間"
            draggable={false}
            priority
            unoptimized
            onLoad={() => setMapReady(true)}
          />
          {orderedItems.map((item, index) => (
            <button
              className={`map-hotspot hotspot-${item.id}${progress.viewed.includes(item.id) ? " is-viewed" : ""}`}
              style={{ left: `${item.x}%`, top: `${item.y}%`, "--order": index } as CSSProperties}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => focusItem(item)}
              aria-label={`查看${item.title}`}
              key={item.id}
            >
              <span aria-hidden="true"><i /></span>
              <b>{item.shortTitle}</b>
            </button>
          ))}
        </div>

        {!mapReady && <div className="map-loading" role="status">地圖正在展開</div>}
        {hintVisible && !introOpen && (
          <div className="map-gesture-hint" aria-hidden="true">
            <i />
            <span>拖曳漫遊 · 滾輪或雙指縮放</span>
          </div>
        )}

        <nav className="map-controls" id="map-controls" aria-label="地圖控制">
          <button onClick={() => zoomBy(1.22)} aria-label="放大地圖">＋</button>
          <button onClick={() => zoomBy(0.82)} aria-label="縮小地圖">−</button>
          <button onClick={() => resetCamera()} aria-label="重設地圖位置">全圖</button>
        </nav>

        <button className="replay-journey" onClick={replayJourney}>
          <span aria-hidden="true">↶</span> 重遊旅程
        </button>
      </div>

      <aside
        className={`atlas-drawer${atlasOpen ? " is-open" : ""}`}
        aria-hidden={!atlasOpen}
        inert={!atlasOpen ? true : undefined}
      >
        <div className="atlas-heading">
          <div><small>LOCAL CULTURE ATLAS</small><h2>七藝圖鑑</h2></div>
          <button onClick={() => setAtlasOpen(false)} aria-label="關閉七藝圖鑑">×</button>
        </div>
        <p>先細看七項文化線索。正式互動遊戲會在地圖手感確認後加入。</p>
        <ol>
          {orderedItems.map((item, index) => (
            <li key={item.id}>
              <button onClick={() => focusItem(item)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{item.title}</b>
                <i>{progress.completed.includes(item.id) ? "完成" : progress.viewed.includes(item.id) ? "已閱" : "未閱"}</i>
              </button>
            </li>
          ))}
        </ol>
        <button className="reset-progress" onClick={resetProgress}>清除已閱記錄</button>
      </aside>

      {selected && (
        <section className="culture-folio" role="dialog" aria-modal="true" aria-labelledby="culture-title">
          <button className="folio-close" onClick={closeCard} aria-label="關閉文化卡">×</button>
          <div className="folio-index"><span>葵青七藝</span><b>{String(heritageItems.findIndex((item) => item.id === selected.id) + 1).padStart(2, "0")}</b></div>
          <p className="folio-category">{selected.category} · {selected.inventoryNote}</p>
          <h2 id="culture-title">{selected.title}</h2>
          <div className="folio-rule" aria-hidden="true"><i /></div>
          <h3>這項文化是甚麼？</h3>
          <p>{selected.summary}</p>
          <h3>與葵青的連繫</h3>
          <p>{selected.kwaiTsing}</p>
          <div className="folio-source">
            <small>官方資料來源</small>
            <a href={selected.sourceUrl} target="_blank" rel="noreferrer">{selected.sourceLabel}<span aria-hidden="true">↗</span></a>
            {["milk-tea", "wood-carving", "neon"].includes(selected.id) && (
              <a href={kwaiTsingTourSource.url} target="_blank" rel="noreferrer">{kwaiTsingTourSource.label}<span aria-hidden="true">↗</span></a>
            )}
          </div>
          <p className="game-preview">互動體驗將於下一階段加入</p>
        </section>
      )}

      {selected && <button className="folio-backdrop" onClick={closeCard} aria-label="關閉文化卡" />}

      <section className={`map-intro${introOpen ? " is-open" : ""}`} aria-hidden={!introOpen}>
        <div className="intro-map-wash" style={{ backgroundImage: `url(${mapUrl})` }} aria-hidden="true" />
        <div className="intro-ink" aria-hidden="true"><i /><i /><i /></div>
        <div className="intro-copy">
          <p>沿山海之脈 · 尋在地文化記憶</p>
          <h1>葵青<br />七藝遊</h1>
          <div className="intro-line" aria-hidden="true" />
          <p className="intro-description">拖動畫卷，在葵青的山、城與海之間尋找七項文化線索。每一個位置，都連着一段仍在延續的技藝或地方記憶。</p>
          <button onClick={() => setIntroOpen(false)}>展開地圖 <span aria-hidden="true">→</span></button>
        </div>
        <button className="intro-skip" onClick={() => setIntroOpen(false)}>略過序章</button>
      </section>
    </main>
  );
}
