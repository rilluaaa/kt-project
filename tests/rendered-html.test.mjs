import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
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
  assert.match(html, /data-beat="21"/);
  assert.match(html, /下一筆/);
  assert.match(html, /探索葵青/);
  assert.doesNotMatch(html, /data-chapter|故事進度|第一幕|第二幕|第三幕/);
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

  const storyBeats = html.match(/data-beat="(?:[0-9]|1[0-9]|20)"/g) ?? [];
  assert.equal(storyBeats.length, 21);

  const depthScenes = html.match(/data-depth-scene="[1-6]"/g) ?? [];
  const panoramaSlices = html.match(/class="scene-slice"/g) ?? [];
  assert.equal(depthScenes.length, 6, "all six scenes should render as 3D stages");
  assert.equal(panoramaSlices.length, 42, "each scene should render seven curved depth slices");
  assert.match(html, /<canvas class="ink-trail"/);
  assert.match(html, /古風配樂/);
});
