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

test("server-renders the 熱熾葵青 two-scene film prototype", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="zh-Hant">/);
  assert.match(html, /<title>熱熾葵青｜一滴墨，穿過山城與燈火<\/title>/);
  assert.match(html, /墨色正在展開/);
  assert.match(html, /熱熾葵青故事/);
  assert.match(html, /data-scene="mountain"/);
  assert.match(html, /data-scene="street"/);
  assert.match(html, /山城入墨/);
  assert.match(html, /葵涌早茶/);
  assert.match(html, /兩幕試演完成/);
  assert.match(html, /餘下七幕將沿此展開/);
  assert.doesNotMatch(html, /第一幕|第二幕|故事進度/);
});

test("ships both scroll-scrubbed production videos and no runtime Blender world", async () => {
  const html = await (await render()).text();
  const files = ["kt3.1-mountain.mp4", "kt3.2-street.mp4"];
  for (const file of files) {
    assert.match(html, new RegExp(file.replace(".", "\\.")));
    const asset = await stat(new URL(`../public/media/${file}`, import.meta.url));
    assert.ok(asset.size > 2_000_000, `${file} should contain a production film`);
  }
  await assert.rejects(stat(new URL("../public/models/ink-scroll-world.glb", import.meta.url)));
  assert.doesNotMatch(html, /ThreeMountainStage|ink-scroll-world\.glb/);
});

test("uses a damped film timeline with directed camera beats and physical transition", async () => {
  const source = await readFile(new URL("../app/VideoHome.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/video.css", import.meta.url), "utf8");
  assert.match(source, /function directedTimeline/);
  assert.match(source, /smoothedScroll\.current/);
  assert.match(source, /currentTime = desired/);
  assert.match(source, /--a-yaw/);
  assert.match(source, /--b-pitch/);
  assert.match(source, /transition-occluder/);
  assert.match(css, /\.film-world/);
  assert.match(css, /perspective: 1250px/);
  assert.match(css, /\.watermark-veil/);
  assert.match(css, /\.cinematic-caption/);
});

test("long press has wet-ink progress, full-screen payoff and replay support", async () => {
  const page = await readFile(new URL("../app/VideoHome.tsx", import.meta.url), "utf8");
  const ink = await readFile(new URL("../app/ThreeFilmInk.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/video.css", import.meta.url), "utf8");
  assert.match(page, /const beginHold/);
  assert.match(page, /const completeHold/);
  assert.match(page, /setBurstKey/);
  assert.match(page, /scroll-locked/);
  assert.match(page, /長按啟動動畫/);
  assert.match(ink, /new THREE\.WebGLRenderer/);
  assert.match(ink, /uHold/);
  assert.match(ink, /uBurst/);
  assert.match(ink, /uTransition/);
  assert.match(css, /\.hold-cue/);
  assert.match(css, /\.effect-scene-0/);
  assert.match(css, /\.effect-scene-1/);
});

test("keeps the shared WebGL loading ink and long-form guzheng score", async () => {
  const opening = await readFile(new URL("../app/ThreeInkOpening.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/VideoHome.tsx", import.meta.url), "utf8");
  assert.match(opening, /new THREE\.WebGLRenderer/);
  assert.match(opening, /uProgress/);
  assert.match(opening, /uOpening/);
  assert.match(opening, /capillary/);
  assert.match(page, /const phrases = \[/);
  assert.match(page, /const phraseRoute = \[/);
  assert.match(page, /const longCycle =/);
  assert.match(page, /古箏配樂/);
});
