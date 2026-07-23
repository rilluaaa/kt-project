import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the five-scene 熱熾葵青 film journey and colour finale", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="zh-Hant">/);
  assert.match(html, /<title>熱熾葵青｜一滴墨，穿過山城與燈火<\/title>/);
  assert.match(html, /墨色正在展開/);
  assert.match(html, /熱熾葵青故事/);
  for (const scene of ["mountain", "street", "night-craft", "harbour", "opera"]) {
    assert.match(html, new RegExp(`data-scene="${scene}"`));
  }
  for (const title of ["山城入墨", "葵涌早茶", "夜工燃光", "海港成脈", "鑼鼓入海"]) {
    assert.match(html, new RegExp(title));
  }
  assert.match(html, /港式奶茶製作技藝屬於香港其中一項非物質文化遺產/);
  assert.match(html, /木雕刻先以畫稿定形/);
  assert.match(html, /葵青貨櫃碼頭是理解這個地區不可缺少的背景/);
  assert.match(html, /戲棚搭建技藝被列入香港非物質文化遺產/);
  assert.match(html, /kt3\.6-colour\.webp/);
  assert.match(html, /探索葵青/);
  assert.match(html, /山海相接/);
  assert.match(html, /工藝在場/);
  assert.match(html, /燈火相聚/);
  assert.doesNotMatch(html, /兩幕試演完成|餘下七幕|第一幕|第二幕|故事進度/);
});

test("ships five native-quality short-GOP scroll films with exact posters", async () => {
  const html = await (await render()).text();
  const source = await readFile(new URL("../app/VideoHome.tsx", import.meta.url), "utf8");
  for (let index = 1; index <= 5; index += 1) {
    const file = `kt3.${index}-scroll.mp4`;
    assert.match(source, new RegExp(file.replace(".", "\\.")));
    assert.match(source, new RegExp(`kt3\\.${index}-poster\\.webp`));
    const asset = await stat(new URL(`../public/media/${file}`, import.meta.url));
    assert.ok(asset.size > 8_000_000, `${file} should retain the high-quality 1764px source film`);
  }
  await assert.rejects(stat(new URL("../public/models/ink-scroll-world.glb", import.meta.url)));
  assert.doesNotMatch(html, /ThreeMountainStage|ink-scroll-world\.glb/);
});

test("uses desktop blob seeking, lightly accelerated film timing and masked film transitions", async () => {
  const source = await readFile(new URL("../app/VideoHome.tsx", import.meta.url), "utf8");
  const ink = await readFile(new URL("../app/ThreeFilmInk.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/video.css", import.meta.url), "utf8");
  assert.match(source, /function directedTimeline/);
  assert.match(source, /function directedTimeline\(progress: number\)/);
  assert.match(source, /return lerp\(0, 0\.995, clamp\(progress\)\)/);
  assert.match(source, /LIGHT_SCROLL_ACCELERATION = 0\.06/);
  assert.match(source, /SCROLL_COAST_STRENGTH = 0\.048/);
  assert.match(source, /SCROLL_COAST_DAMPING = 0\.9/);
  assert.match(source, /window\.scrollBy\(\{ top: coastVelocity/);
  assert.match(source, /window\.addEventListener\("wheel", onWheel/);
  assert.match(source, /lerp\(target, smoothedScroll\.current, LIGHT_SCROLL_ACCELERATION\)/);
  assert.match(source, /const desired = video\.duration \* mapped/);
  assert.match(source, /smoothedScroll/);
  assert.doesNotMatch(source, /smoothedVideoTime/);
  assert.doesNotMatch(source, /introScrollBand|motionStarts|startVelocity/);
  assert.match(source, /response\.blob\(\)/);
  assert.match(source, /Promise\.all\(indexes\.map/);
  assert.match(source, /decodedRequired >= requiredReadyCount\.current/);
  assert.match(source, /preload="auto"/);
  assert.match(source, /URL\.createObjectURL/);
  assert.match(source, /!video\.seeking/);
  assert.match(source, /currentTime = desired/);
  assert.match(source, /transition=\{transition\}/);
  assert.match(ink, /float transitionInk = smoothstep/);
  assert.match(ink, /holdPresence = smoothstep/);
  assert.match(css, /min-height: 650vh/);
  assert.match(css, /\.transition-occluder/);
  assert.match(css, /object-fit: cover/);
  assert.doesNotMatch(css, /\.watermark-veil/);
});

test("ships nine long-form heritage captions with enlarged contextual labels", async () => {
  const page = await readFile(new URL("../app/VideoHome.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/video.css", import.meta.url), "utf8");
  assert.doesNotMatch(page, /className="place"/);
  assert.match(page, /film-scene--final/);
  assert.match(page, /finaleFilmRef/);
  assert.match(page, /className=\{`heritage heritage--\$\{caption\.scene\.id\}`\}/);
  const captionEntries = [...page.matchAll(/\{ text: "((?:[^"\\]|\\.)+)", label: "([^"]+)"/g)];
  assert.equal(captionEntries.length, 9);
  for (const [, encodedText, label] of captionEntries) {
    const captionText = JSON.parse(`"${encodedText}"`);
    const visibleLength = [...captionText.replaceAll("\n", "")].length;
    assert.ok(visibleLength >= 75 && visibleLength <= 105, `${label} should remain within the approved long-form range`);
    const lineLengths = captionText.split("\n").map((line) => [...line].length);
    assert.equal(lineLengths.length, 3, `${label} should render as three deliberate lines`);
    assert.ok(Math.max(...lineLengths) - Math.min(...lineLengths) <= 3, `${label} should keep all three lines visually balanced`);
  }
  assert.doesNotMatch(page, /從地方走近非遺|香港非遺|葵涌非遺遊蹤/);
  assert.match(page, /className="explore-page"/);
  assert.match(page, /className="finale-copy-hold"/);
  assert.match(css, /\.finale-copy-hold \{[\s\S]*?height: 44vh/);
  assert.match(page, /className="explore-button"/);
  assert.match(page, /熱熾葵青，[\s\S]*燈火未央。/);
  assert.match(css, /\.video-experience \.heritage \{[\s\S]*?color: #24483a/);
  assert.match(css, /\.video-experience \.heritage--night-craft,[\s\S]*?color: #d1ad70/);
  assert.match(css, /\.caption-line \{[\s\S]*?white-space: pre-line/);
  assert.match(css, /\.finale-film-image \{[\s\S]*?background: var\(--finale-image\) center \/ cover no-repeat/);
  assert.match(css, /\.explore-page \{[\s\S]*?background:/);
  assert.match(css, /linear-gradient\(132deg/);
  assert.doesNotMatch(css, /margin-top: -16vh/);
  assert.match(css, /\.explore-button \{[\s\S]*?background: #f5f2e8;[\s\S]*?color: #06100b/);
  assert.doesNotMatch(css, /\.finale-backdrop/);
});

test("long press offers three replayable WebGL effects and a bounded paper-ink fluid trail", async () => {
  const page = await readFile(new URL("../app/VideoHome.tsx", import.meta.url), "utf8");
  const effect = await readFile(new URL("../app/SceneInteraction.tsx", import.meta.url), "utf8");
  const ink = await readFile(new URL("../app/ThreeFilmInk.tsx", import.meta.url), "utf8");
  assert.match(page, /new Set\(\[1, 2, 4\]\)/);
  assert.doesNotMatch(page, /interaction: "喚醒山脈"/);
  assert.match(page, /interaction: "沖開茶香"/);
  assert.match(page, /interaction: "燃亮霓虹"/);
  assert.match(page, /interaction: "點亮戲棚"/);
  assert.match(page, /const beginHold/);
  assert.match(page, /const completeHold/);
  assert.match(page, /setEffectKey/);
  assert.match(effect, /drawImage\(sourceVideo/);
  assert.match(effect, /new THREE\.CanvasTexture/);
  assert.match(effect, /duration = reducedMotion \? 1200 : 4200/);
  assert.match(effect, /uTexture/);
  assert.match(ink, /uHold/);
  assert.match(ink, /capillary/);
  assert.match(ink, /INK_TRAIL_TUNING/);
  assert.match(ink, /pointerLag: 0\.46/);
  assert.match(ink, /trailLifetime: 1\.2/);
  assert.match(ink, /wetDepositLifetime: 2\.2/);
  assert.match(ink, /pressureIterations: 2/);
  assert.match(ink, /new THREE\.WebGLRenderTarget/);
  assert.match(ink, /lineDistance/);
  assert.match(ink, /window\.addEventListener\("pointermove", onPointerMove/);
  assert.match(ink, /window\.removeEventListener\("pointermove", onPointerMove\)/);
  assert.match(ink, /visibilitychange/);
  assert.doesNotMatch(ink, /vec3 green|vec3 amber/);
  assert.match(page, /start: 0\.20, end: 0\.52/);
});

test("preloads every compact 1080p-class mobile film before entry", async () => {
  const page = await readFile(new URL("../app/VideoHome.tsx", import.meta.url), "utf8");
  assert.match(page, /useMobileFilms/);
  assert.match(page, /\(max-width: 720px\), \(pointer: coarse\)/);
  assert.match(page, /requiredReadyCount\.current = scenes\.length/);
  assert.match(page, /minimumGateMs\.current = useMobileFilms \? 650 : 1750/);
  assert.match(page, /useMobileFilms \? scenes\[index\]\.mobileVideo : scenes\[index\]\.video/);
  assert.match(page, /Promise\.all\(indexes\.map/);
  assert.match(page, /URL\.createObjectURL\(blob\)/);
  assert.match(page, /preload="auto"/);
  assert.match(page, /onLoadedMetadata/);
  assert.match(page, /posterSources\[scenes\.length - 1\]/);
  assert.doesNotMatch(page, /index === 0 \? scene\.mobileVideo : null/);
  assert.doesNotMatch(page, /index <= nextIndex \? scenes\[index\]\.mobileVideo : null/);
  for (let index = 1; index <= 5; index += 1) {
    assert.match(page, new RegExp(`kt3\\.${index}-scroll-mobile\\.mp4`));
    const mobileFilm = await stat(new URL(`../public/media/kt3.${index}-scroll-mobile.mp4`, import.meta.url));
    assert.ok(mobileFilm.size > 3_500_000 && mobileFilm.size < 6_000_000);
  }
});

test("keeps the physical opening ink and ships the replacement continuous soundtrack", async () => {
  const opening = await readFile(new URL("../app/ThreeInkOpening.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/VideoHome.tsx", import.meta.url), "utf8");
  assert.match(opening, /new THREE\.WebGLRenderer/);
  assert.match(opening, /uProgress/);
  assert.match(opening, /uOpening/);
  assert.match(opening, /capillary/);
  assert.match(opening, /openingAlpha/);
  assert.match(page, /west-lake-wander\.mp3/);
  assert.match(page, /audio\.loop = true/);
  const soundtrack = await stat(new URL("../public/media/west-lake-wander.mp3", import.meta.url));
  assert.ok(soundtrack.size > 5_000_000, "the replacement BGM should be shipped at source quality");
});
