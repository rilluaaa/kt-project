import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const sceneFiles = [
  "scene-01-mountain-city.webp",
  "scene-02-street-crafts.webp",
  "scene-03-estate-night.webp",
  "scene-04-harbour-port.webp",
  "scene-05-tsing-yi-opera.webp",
  "scene-06-mooncake-home.webp",
];

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

test("server-renders the complete 墨脈葵青 experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-Hant">/);
  assert.match(html, /<title>墨脈葵青｜一滴墨，流過山城與海港<\/title>/);
  assert.match(html, /墨跡正在展開/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-label="墨脈葵青故事"/);
  assert.match(html, /data-beat="0"/);
  assert.match(html, /data-beat="9"/);
  assert.match(html, /山城入墨/);
  assert.match(html, /團圓留印/);
  assert.doesNotMatch(html, /第一幕|第九幕/);
  assert.match(html, /下一筆/);
  assert.match(html, /探索葵青/);
  assert.match(html, /九幕已完 · 墨脈仍在流動/);
  assert.doesNotMatch(html, /即將展開/);
  assert.doesNotMatch(html, /data-chapter|故事進度/);
});

test("includes all seven heritage memories and accessible controls", async () => {
  const response = await render();
  const html = await response.text();
  const memories = [
    "港式奶茶製作技藝",
    "木雕刻技藝",
    "石籬、石蔭、安蔭盂蘭勝會",
    "霓虹光管製作及造型技藝",
    "青衣真君誕",
    "青衣天后誕",
    "月餅製作技藝",
  ];

  for (const memory of memories) assert.match(html, new RegExp(memory));
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /減少動畫/);
  assert.doesNotMatch(html, /按住|progress rail|chapter/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Starter Project/);
});

test("references the complete six-scene continuous ink panorama", async () => {
  const response = await render();
  const html = await response.text();

  for (const sceneFile of sceneFiles) {
    assert.match(html, new RegExp(sceneFile.replace(".", "\\.")));
    const asset = await stat(new URL(`../public/ink/${sceneFile}`, import.meta.url));
    assert.ok(asset.size > 100_000, `${sceneFile} should contain a production scene`);
  }

  const storyBeats = html.match(/data-story-beat="true"/g) ?? [];
  assert.equal(storyBeats.length, 9);

  const depthScenes = html.match(/data-depth-scene="[1-6]"/g) ?? [];
  assert.equal(depthScenes.length, 6, "all six scenes should render as 3D stages");
  assert.doesNotMatch(html, /class="scene-slice"/, "the old image-card panorama should not run behind the true 3D world");
  assert.equal((html.match(/class="scene-fallback"/g) ?? []).length, 6, "each source image should remain as a lightweight WebGL fallback");
  assert.match(html, /<canvas class="ink-trail"/);
  assert.match(html, /古箏配樂/);
});

test("ships one continuous nine-act Three.js world with WebGL ink interaction", async () => {
  const worldSource = await readFile(new URL("../app/ThreeMountainStage.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(worldSource, /new THREE\.WebGLRenderer/);
  assert.match(worldSource, /new THREE\.PerspectiveCamera/);
  assert.match(worldSource, /new THREE\.OrthographicCamera/);
  assert.match(worldSource, /GLTFLoader/);
  assert.match(worldSource, /ink-scroll-world\.glb/);
  assert.match(worldSource, /scene-01-mountain-city\.webp/);
  assert.match(worldSource, /const actTexture = \[0, 1, 1, 2, 2, 3, 4, 4, 5\]/);
  assert.match(worldSource, /samplePath/);
  assert.match(worldSource, /uTransitionFog/);
  assert.match(worldSource, /transitionField/);
  assert.match(worldSource, /uOrigin/);
  assert.match(worldSource, /burstRadius/);
  assert.doesNotMatch(worldSource, /new THREE\.(?:Box|Sphere|Capsule|Tube)Geometry/);
  const model = await stat(new URL("../public/models/ink-scroll-world.glb", import.meta.url));
  assert.ok(model.size > 500_000, "the Blender-authored nine-act world should be exported");
  assert.match(page, /has-webgl-cursor-ink/);
  assert.match(page, /is-cursor-bound/);
  assert.match(page, /const activeInteraction = current\?\.interaction \?\? null/);
  assert.match(page, /window\.addEventListener\("pointerenter"/);
  assert.match(page, /ThreeMountainStage/);
  assert.doesNotMatch(page, /ThreeMilkTeaStage/);
  assert.doesNotMatch(page, /scene-02-milk-tea\.mp4/);
  assert.match(css, /\.mountain-webgl\.is-unavailable/);
});

test("renders loading percentage and journey entrance with a shared WebGL ink field", async () => {
  const source = await readFile(new URL("../app/ThreeInkOpening.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /new THREE\.WebGLRenderer/);
  assert.match(source, /fragmentShader/);
  assert.match(source, /uProgress/);
  assert.match(source, /uOpening/);
  assert.match(source, /capillary/);
  assert.match(source, /digitReserve/);
  assert.match(source, /loading-mark strong/);
  assert.match(source, /journey-start/);
  assert.match(page, /ThreeInkOpening/);
  assert.match(css, /\.opening-ink-webgl/);
  assert.match(css, /\.journey-start::before \{\s*display: none;/);
  assert.match(css, /\.loading-mark strong::before/);
});

test("uses a long-form generative guzheng score instead of a short repeating loop", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /const guzheng =/);
  assert.match(source, /const phrases = \[/);
  assert.match(source, /const phraseRoute = \[/);
  assert.match(source, /const longCycle =/);
  assert.match(source, /古箏配樂/);
  assert.doesNotMatch(source, /const dizi =/);
});
