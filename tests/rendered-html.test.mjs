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
  assert.match(html, /茶湯拉成幼線，在蒸氣裏沖出清晨。/);
  assert.match(html, /木屑隨刻刀落下，舊舖把手藝留在街角。/);
  assert.match(html, /kt3\.6-colour\.png/);
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
    assert.match(html, new RegExp(`kt3\\.${index}-poster\\.png`));
    const asset = await stat(new URL(`../public/media/${file}`, import.meta.url));
    assert.ok(asset.size > 8_000_000, `${file} should retain the high-quality 1764px source film`);
  }
  await assert.rejects(stat(new URL("../public/models/ink-scroll-world.glb", import.meta.url)));
  assert.doesNotMatch(html, /ThreeMountainStage|ink-scroll-world\.glb/);
});

test("uses blob seeking, a brief opening beat and masked film transitions", async () => {
  const source = await readFile(new URL("../app/VideoHome.tsx", import.meta.url), "utf8");
  const ink = await readFile(new URL("../app/ThreeFilmInk.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/video.css", import.meta.url), "utf8");
  assert.match(source, /function directedTimeline/);
  assert.match(source, /const introScrollBand = 0\.04/);
  assert.match(source, /return lerp\(0, motionStart, smooth\(p \/ introScrollBand\)\)/);
  assert.match(source, /const startVelocity = 0\.24/);
  assert.match(source, /smoothedVideoTime\.current\[index\] = 0/);
  assert.doesNotMatch(source, /p <= 0\.032/);
  assert.match(source, /const motionStarts = \[0\.293, 0\.205, 0\.462, 0\.294, 0\.198\]/);
  assert.match(source, /response\.blob\(\)/);
  assert.match(source, /Promise\.all\(indexes\.map/);
  assert.match(source, /loadedVideos\.current\.size === scenes\.length/);
  assert.match(source, /preload="auto"/);
  assert.match(source, /URL\.createObjectURL/);
  assert.match(source, /!video\.seeking/);
  assert.match(source, /currentTime = desired/);
  assert.match(source, /transition=\{transition\}/);
  assert.match(ink, /transitionPeak = clamp\(uTransition/);
  assert.match(ink, /holdPresence = smoothstep/);
  assert.match(css, /min-height: 560vh/);
  assert.match(css, /\.transition-occluder/);
  assert.match(css, /object-fit: cover/);
  assert.doesNotMatch(css, /\.watermark-veil/);
});

test("keeps captions monochrome, removes side labels and holds one seamless finale plane", async () => {
  const page = await readFile(new URL("../app/VideoHome.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/video.css", import.meta.url), "utf8");
  assert.doesNotMatch(page, /className="place"/);
  assert.match(page, /film-scene--final/);
  assert.match(page, /finaleFilmRef/);
  assert.match(page, /caption\.scene\.id === "street" \? 0 : 1/);
  assert.match(page, /className="explore-page"/);
  assert.match(page, /className="explore-button"/);
  assert.match(page, /熱熾葵青，[\s\S]*仍在每次相聚之間亮起。/);
  assert.match(css, /\.video-experience \.heritage \{[\s\S]*?color: #050807/);
  assert.match(css, /\.finale-film-image \{[\s\S]*?object-fit: cover/);
  assert.match(css, /\.explore-page \{[\s\S]*?background:/);
  assert.match(css, /rgba\(16, 62, 44, 0\)/);
  assert.match(css, /\.explore-button \{[\s\S]*?background: #f5f2e8;[\s\S]*?color: #06100b/);
  assert.doesNotMatch(css, /\.finale-backdrop/);
});

test("long press offers three replayable WebGL effects based on the live film frame", async () => {
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
  assert.match(ink, /uniform vec2 uTrail\[20\]/);
  assert.match(ink, /trailInk/);
  assert.match(ink, /distanceToStroke/);
  assert.match(ink, /\/ 2600/);
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
