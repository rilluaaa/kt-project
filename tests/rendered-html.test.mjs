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
  assert.match(html, /kt3\.6-colour\.png/);
  assert.match(html, /探索葵青/);
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

test("uses blob seeking, a long opening-frame dwell and masked film transitions", async () => {
  const source = await readFile(new URL("../app/VideoHome.tsx", import.meta.url), "utf8");
  const ink = await readFile(new URL("../app/ThreeFilmInk.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/video.css", import.meta.url), "utf8");
  assert.match(source, /function directedTimeline/);
  assert.match(source, /p <= 0\.3/);
  assert.match(source, /response\.blob\(\)/);
  assert.match(source, /URL\.createObjectURL/);
  assert.match(source, /!video\.seeking/);
  assert.match(source, /currentTime = desired/);
  assert.match(source, /transition=\{transition\}/);
  assert.match(ink, /transitionPeak = clamp\(uTransition/);
  assert.match(css, /min-height: 560vh/);
  assert.match(css, /\.transition-occluder/);
  assert.match(css, /object-fit: contain/);
  assert.doesNotMatch(css, /\.watermark-veil/);
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
