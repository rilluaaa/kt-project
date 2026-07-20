"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  effectKey: number;
  scene: number;
  sourceVideo: HTMLVideoElement | null;
  reducedMotion: boolean;
  onComplete: () => void;
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uTextureSize;
  uniform float uTime;
  uniform float uProgress;
  uniform float uScene;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.54;
    for (int i = 0; i < 6; i++) {
      v += noise(p) * a;
      p = p * mat2(1.71, -1.04, 1.04, 1.71) + vec2(7.2, 3.9);
      a *= 0.5;
    }
    return v;
  }

  vec2 containUv(vec2 uv) {
    float screenAspect = uResolution.x / max(1.0, uResolution.y);
    float textureAspect = uTextureSize.x / max(1.0, uTextureSize.y);
    if (screenAspect > textureAspect) {
      float width = textureAspect / screenAspect;
      return vec2((uv.x - 0.5) / width + 0.5, uv.y);
    }
    float height = screenAspect / textureAspect;
    return vec2(uv.x, (uv.y - 0.5) / height + 0.5);
  }

  vec2 coverUv(vec2 uv) {
    float screenAspect = uResolution.x / max(1.0, uResolution.y);
    float textureAspect = uTextureSize.x / max(1.0, uTextureSize.y);
    if (screenAspect > textureAspect) {
      float height = textureAspect / screenAspect;
      return vec2(uv.x, (uv.y - 0.5) * height + 0.5);
    }
    float width = screenAspect / textureAspect;
    return vec2((uv.x - 0.5) * width + 0.5, uv.y);
  }

  float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }

  float softCircle(vec2 uv, vec2 centre, float radius, float softness) {
    return 1.0 - smoothstep(radius - softness, radius + softness, length(uv - centre));
  }

  void main() {
    float p = clamp(uProgress, 0.0, 1.0);
    float pulse = sin(p * 3.14159265);
    float t = uTime;
    vec2 screenUv = vUv;
    float paper = fbm(screenUv * vec2(11.0, 8.0) + vec2(t * 0.035, -t * 0.022));
    vec2 flow = vec2(
      fbm(screenUv * 4.2 + vec2(t * 0.08, 8.0)),
      fbm(screenUv * 4.6 + vec2(-5.0, -t * 0.065))
    ) - 0.5;

    float zoom = 1.0 + pulse * (uScene < 1.5 ? 0.075 : uScene < 3.0 ? 0.092 : 0.065);
    vec2 camera = (screenUv - 0.5) / zoom + 0.5;
    if (uScene > 1.5 && uScene < 3.0) camera += vec2(-0.018, 0.008) * pulse;
    if (uScene > 3.5) camera += vec2(0.014, -0.01) * pulse;
    vec2 uv = containUv(camera);
    vec2 displaced = uv + flow * (0.003 + pulse * 0.008);
    float inside = step(0.0, displaced.x) * step(displaced.x, 1.0) * step(0.0, displaced.y) * step(displaced.y, 1.0);

    vec2 backgroundUv = coverUv(camera);
    vec2 blurStep = vec2(0.008, 0.008 * uTextureSize.x / max(1.0, uTextureSize.y));
    vec3 blurred = texture2D(uTexture, backgroundUv).rgb * 0.36;
    blurred += texture2D(uTexture, backgroundUv + vec2(blurStep.x, 0.0)).rgb * 0.16;
    blurred += texture2D(uTexture, backgroundUv - vec2(blurStep.x, 0.0)).rgb * 0.16;
    blurred += texture2D(uTexture, backgroundUv + vec2(0.0, blurStep.y)).rgb * 0.16;
    blurred += texture2D(uTexture, backgroundUv - vec2(0.0, blurStep.y)).rgb * 0.16;
    blurred *= vec3(0.42, 0.58, 0.49);

    vec3 base = texture2D(uTexture, clamp(displaced, 0.001, 0.999)).rgb;
    vec3 colour = mix(blurred, base, inside);
    vec2 texel = 1.4 / uTextureSize;
    float centreLum = luminance(base);
    float edge = abs(centreLum - luminance(texture2D(uTexture, clamp(displaced + vec2(texel.x, 0.0), 0.001, 0.999)).rgb));
    edge += abs(centreLum - luminance(texture2D(uTexture, clamp(displaced + vec2(0.0, texel.y), 0.001, 0.999)).rgb));
    edge = smoothstep(0.045, 0.19, edge);

    vec3 deepGreen = vec3(0.025, 0.15, 0.095);
    vec3 jade = vec3(0.16, 0.58, 0.37);
    vec3 amber = vec3(0.94, 0.56, 0.19);
    vec3 warmPaper = vec3(0.9, 0.82, 0.62);
    float effect = 0.0;

    if (uScene < 1.5) {
      /* Milk tea: rising steam, the pour arc and a restrained lamp glow. */
      float rise = fract(screenUv.y * 1.4 + p * 1.55);
      float steamX = 0.59 + sin(screenUv.y * 18.0 + t * 1.9) * 0.027 + flow.x * 0.07;
      float steam = exp(-abs(screenUv.x - steamX) * 62.0)
        * smoothstep(0.28, 0.58, screenUv.y)
        * (1.0 - smoothstep(0.91, 1.0, screenUv.y))
        * smoothstep(0.15, 0.5, rise);
      float arcRadius = abs(length((screenUv - vec2(0.61, 0.57)) * vec2(1.0, 1.45)) - 0.22);
      float pourArc = smoothstep(0.018, 0.004, arcRadius)
        * smoothstep(0.48, 0.73, screenUv.x)
        * smoothstep(0.34, 0.66, screenUv.y);
      float lamp = softCircle(screenUv, vec2(0.62, 0.42), 0.22, 0.18);
      colour = mix(colour, warmPaper, steam * pulse * 0.62);
      colour += amber * (lamp * 0.2 + pourArc * 0.42) * pulse;
      colour = mix(colour, deepGreen, edge * pulse * 0.14);
      effect = max(steam * 0.52, pourArc);
    } else if (uScene < 3.0) {
      /* Neon craft: the real frame remains intact while its drawn edges ignite. */
      float scan = smoothstep(0.0, 0.16, 0.17 - abs(screenUv.x - (0.06 + p * 1.02)));
      float wire = edge * (0.42 + 0.58 * sin((screenUv.x + screenUv.y) * 34.0 - t * 4.0) * 0.5 + 0.5);
      float glow = softCircle(screenUv, vec2(0.72, 0.58), 0.31, 0.22);
      colour += jade * wire * scan * pulse * 1.25;
      colour += amber * wire * (1.0 - scan) * pulse * 0.48;
      colour = mix(colour, deepGreen, glow * pulse * 0.13);
      effect = max(wire * scan, glow * 0.3);
    } else {
      /* Opera shed: lanterns wake in sequence, then a gong-like ring crosses the harbour. */
      float lanternA = softCircle(screenUv, vec2(0.62, 0.28), 0.055, 0.06);
      float lanternB = softCircle(screenUv, vec2(0.72, 0.34), 0.052, 0.055);
      float lanternC = softCircle(screenUv, vec2(0.79, 0.42), 0.048, 0.05);
      float lights = lanternA * smoothstep(0.12, 0.24, p)
        + lanternB * smoothstep(0.25, 0.38, p)
        + lanternC * smoothstep(0.38, 0.5, p);
      float gongRadius = length((screenUv - vec2(0.67, 0.55)) * vec2(uResolution.x / uResolution.y, 1.0));
      float ring = smoothstep(0.024, 0.006, abs(gongRadius - p * 0.78));
      float ribbon = smoothstep(0.058, 0.012, abs(screenUv.y - 0.58 - sin(screenUv.x * 9.0 + t) * 0.055))
        * smoothstep(0.02, 0.95, screenUv.x);
      colour += amber * (lights * 0.58 + ring * 0.32) * pulse;
      colour = mix(colour, deepGreen, ribbon * pulse * 0.34);
      colour += jade * edge * ribbon * pulse * 0.42;
      effect = max(lights, max(ring, ribbon * 0.52));
    }

    float entryNoise = fbm(screenUv * 5.7 + flow * 1.8 + vec2(p * 1.8, -p));
    float entryReveal = smoothstep(0.04, 0.24, p + (entryNoise - 0.5) * 0.16);
    vec3 wetInk = mix(vec3(0.008, 0.019, 0.013), deepGreen, paper * 0.22);
    colour = mix(wetInk, colour, entryReveal);
    float granulation = smoothstep(0.55, 0.9, fbm(screenUv * 42.0 + flow * 4.0));
    colour = mix(colour, wetInk, granulation * pulse * 0.06);
    colour += effect * vec3(0.035, 0.055, 0.035) * pulse;

    float vignette = smoothstep(0.88, 0.28, length(screenUv - 0.5));
    colour *= mix(0.75, 1.05, vignette);
    float alpha = smoothstep(0.015, 0.09, p) * (1.0 - smoothstep(0.88, 1.0, p));
    gl_FragColor = vec4(colour, alpha);
  }
`;

export default function SceneInteraction({ effectKey, scene, sourceVideo, reducedMotion, onComplete }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !sourceVideo || sourceVideo.readyState < 2 || !sourceVideo.videoWidth) {
      const fallback = window.setTimeout(() => onCompleteRef.current(), 500);
      return () => window.clearTimeout(fallback);
    }

    const snapshot = document.createElement("canvas");
    snapshot.width = sourceVideo.videoWidth;
    snapshot.height = sourceVideo.videoHeight;
    const context = snapshot.getContext("2d", { alpha: false });
    if (!context) {
      const fallback = window.setTimeout(() => onCompleteRef.current(), 500);
      return () => window.clearTimeout(fallback);
    }
    context.drawImage(sourceVideo, 0, 0, snapshot.width, snapshot.height);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
    } catch {
      const fallback = window.setTimeout(() => onCompleteRef.current(), 500);
      return () => window.clearTimeout(fallback);
    }
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const texture = new THREE.CanvasTexture(snapshot);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const scene3d = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uTexture: { value: texture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTextureSize: { value: new THREE.Vector2(snapshot.width, snapshot.height) },
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uScene: { value: scene },
    };
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    scene3d.add(new THREE.Mesh(geometry, material));

    const size = new THREE.Vector2();
    const resize = () => {
      const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.35));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.getDrawingBufferSize(size);
      uniforms.uResolution.value.copy(size);
    };
    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    let disposed = false;
    let completed = false;
    const began = performance.now();
    const duration = reducedMotion ? 1200 : 4200;
    const draw = (now: number) => {
      if (disposed) return;
      const progress = Math.min(1, (now - began) / duration);
      uniforms.uTime.value = now * 0.001;
      uniforms.uProgress.value = progress;
      renderer.render(scene3d, camera);
      if (progress >= 1) {
        if (!completed) {
          completed = true;
          onCompleteRef.current();
        }
        return;
      }
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      texture.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [effectKey, reducedMotion, scene, sourceVideo]);

  return <div className={`scene-interaction scene-interaction--${scene}`} ref={hostRef} aria-hidden="true" />;
}
