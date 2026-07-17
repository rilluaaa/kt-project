"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type MountainStageProps = {
  opacity: number;
  cameraPhase: number;
  pointerActive: boolean;
  holdProgress: number;
  effectKey: number;
  reducedMotion: boolean;
};

type CameraProfile = {
  panX: number;
  panY: number;
  zoom: number;
  roll: number;
  lens: number;
  parallaxX: number;
  parallaxY: number;
  fog: number;
};

const assetPrefix = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const scenePaths = [
  "/ink/scene-01-mountain-city.webp",
  "/ink/scene-02-street-crafts.webp",
  "/ink/scene-03-estate-night.webp",
  "/ink/scene-04-harbour-port.webp",
  "/ink/scene-05-tsing-yi-opera.webp",
  "/ink/scene-06-mooncake-home.webp",
];

const actTexture = [0, 1, 1, 2, 2, 3, 4, 4, 5];
const darkActs = [false, false, false, true, true, true, true, true, false];

/* The profiles deliberately alternate orbit, push, crane and fog-crossing moves. */
const cameraProfiles: CameraProfile[] = [
  { panX: -0.025, panY: 0.012, zoom: 1.03, roll: -0.006, lens: -0.05, parallaxX: -0.35, parallaxY: 0.08, fog: 0.12 },
  { panX: 0.105, panY: -0.055, zoom: 1.21, roll: 0.008, lens: 0.16, parallaxX: 0.48, parallaxY: -0.16, fog: 0.2 },
  { panX: -0.095, panY: 0.045, zoom: 1.34, roll: -0.012, lens: -0.18, parallaxX: -0.58, parallaxY: 0.18, fog: 0.08 },
  { panX: 0.07, panY: -0.085, zoom: 1.16, roll: 0.01, lens: 0.22, parallaxX: 0.36, parallaxY: -0.42, fog: 0.28 },
  { panX: -0.115, panY: -0.015, zoom: 1.29, roll: -0.014, lens: -0.2, parallaxX: -0.62, parallaxY: -0.1, fog: 0.14 },
  { panX: 0.11, panY: 0.065, zoom: 1.4, roll: 0.009, lens: 0.19, parallaxX: 0.55, parallaxY: 0.22, fog: 0.18 },
  { panX: -0.08, panY: -0.09, zoom: 1.18, roll: -0.012, lens: -0.22, parallaxX: -0.4, parallaxY: -0.38, fog: 0.3 },
  { panX: 0.12, panY: 0.02, zoom: 1.33, roll: 0.014, lens: 0.2, parallaxX: 0.64, parallaxY: 0.08, fog: 0.16 },
  { panX: -0.04, panY: -0.04, zoom: 1.13, roll: -0.006, lens: -0.08, parallaxX: -0.24, parallaxY: -0.16, fog: 0.24 },
  { panX: 0.065, panY: 0.045, zoom: 1.28, roll: 0.008, lens: 0.12, parallaxX: 0.34, parallaxY: 0.18, fog: 0.12 },
];

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
  uniform sampler2D uMapA;
  uniform sampler2D uMapB;
  uniform sampler2D uMountainAlt;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform vec2 uEffectOrigin;
  uniform vec2 uParallax;
  uniform vec4 uCamera;
  uniform float uLens;
  uniform float uSceneMix;
  uniform float uAltMix;
  uniform float uFog;
  uniform float uTime;
  uniform float uPointerActive;
  uniform float uHold;
  uniform float uEffect;
  uniform float uAct;
  uniform float uInkLight;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    float a = hash(cell);
    float b = hash(cell + vec2(1.0, 0.0));
    float c = hash(cell + vec2(0.0, 1.0));
    float d = hash(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
  }

  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.53;
    for (int octave = 0; octave < 5; octave++) {
      value += noise(point) * amplitude;
      point = point * mat2(1.65, -1.08, 1.08, 1.65) + vec2(9.7, 4.1);
      amplitude *= 0.5;
    }
    return value;
  }

  vec2 cameraUv(vec2 uv) {
    float viewportAspect = uResolution.x / max(1.0, uResolution.y);
    vec2 cover = vec2(min(viewportAspect / 1.5, 1.0), min(1.5 / viewportAspect, 1.0));
    vec2 point = (uv - 0.5) * cover;
    float cosine = cos(uCamera.w);
    float sine = sin(uCamera.w);
    point = mat2(cosine, -sine, sine, cosine) * point;
    point /= max(1.0, uCamera.z);
    point.x *= 1.0 + point.y * uLens * 0.22;
    point.y += (point.x * point.x - 0.09) * uLens * 0.12;
    point += uCamera.xy;
    return clamp(point + 0.5, vec2(0.002), vec2(0.998));
  }

  vec4 dimensionalSample(sampler2D map, vec2 uv) {
    vec4 base = texture2D(map, uv);
    float luminance = dot(base.rgb, vec3(0.299, 0.587, 0.114));
    float inkDepth = smoothstep(0.92, 0.12, luminance);
    float detail = abs(dFdx(luminance)) + abs(dFdy(luminance));
    float nearMask = clamp(inkDepth * 0.58 + detail * 5.5, 0.0, 1.0);
    vec2 nearUv = clamp(uv + uParallax * (0.009 + inkDepth * 0.018), vec2(0.002), vec2(0.998));
    vec2 farUv = clamp(uv - uParallax * 0.004, vec2(0.002), vec2(0.998));
    vec4 nearLayer = texture2D(map, nearUv);
    vec4 farLayer = texture2D(map, farUv);
    vec4 depthPlate = mix(farLayer, nearLayer, nearMask * 0.72);
    return mix(base, depthPlate, 0.62);
  }

  float inkReveal(vec2 uv, float progress, float seed) {
    float field = fbm(uv * vec2(3.2, 4.6) + vec2(seed, -seed * 0.37));
    field += uv.x * 0.24 - uv.y * 0.1;
    float threshold = 1.33 - progress * 1.7;
    return smoothstep(threshold - 0.09, threshold + 0.09, field);
  }

  void main() {
    vec2 uv = cameraUv(vUv);
    vec4 firstPlate = dimensionalSample(uMapA, uv);
    vec4 alternate = dimensionalSample(uMountainAlt, uv);
    float alternateMask = inkReveal(vUv, uAltMix, 2.7);
    firstPlate = mix(firstPlate, alternate, alternateMask);

    vec4 secondPlate = dimensionalSample(uMapB, uv);
    float sceneMask = inkReveal(vec2(1.0 - vUv.x, vUv.y), uSceneMix, 7.2 + uAct);
    vec4 image = mix(firstPlate, secondPlate, sceneMask);

    float grain = noise(gl_FragCoord.xy * 0.48 + vec2(uTime * 0.7, 0.0));
    float mist = fbm(vUv * vec2(3.0, 2.1) + vec2(uTime * 0.018, -uTime * 0.012));
    float mistBand = smoothstep(0.25, 0.82, mist) * uFog;
    vec3 paper = vec3(0.925, 0.897, 0.824);
    image.rgb = mix(image.rgb, paper, mistBand * 0.16);
    image.rgb += (grain - 0.5) * 0.018;

    float shortest = min(uResolution.x, uResolution.y);
    vec2 frag = gl_FragCoord.xy / uResolution;
    vec2 pointerPoint = (gl_FragCoord.xy - uPointer * uResolution) / shortest;
    float pointerDistance = length(pointerPoint);
    float pointerAngle = atan(pointerPoint.y, pointerPoint.x);
    float pointerNoise = fbm(pointerPoint * 8.0 - vec2(uTime * 0.08, uTime * 0.04));
    float holdRadius = 0.038 + uHold * 0.205 + (pointerNoise - 0.5) * (0.018 + uHold * 0.035);
    float holdInk = smoothstep(holdRadius + 0.018, holdRadius - 0.012, pointerDistance) * uPointerActive;
    float wetEdge = smoothstep(holdRadius + 0.05, holdRadius, pointerDistance) - holdInk * 0.72;
    float fibres = pow(max(0.0, sin(pointerAngle * (7.0 + mod(uAct, 5.0)) + pointerNoise * 6.0)), 12.0);
    fibres *= smoothstep(holdRadius * 1.45, holdRadius * 0.6, pointerDistance) * uPointerActive * (0.2 + uHold * 0.8);

    vec2 burstPoint = (gl_FragCoord.xy - uEffectOrigin * uResolution) / shortest;
    float burstDistance = length(burstPoint);
    float burstAngle = atan(burstPoint.y, burstPoint.x);
    float burstNoise = fbm(burstPoint * (3.8 + mod(uAct, 3.0)) - vec2(uTime * 0.07, uTime * 0.03));
    float burstRadius = uEffect * 1.36 + (burstNoise - 0.5) * (0.09 + uEffect * 0.17);
    float burstWash = smoothstep(burstRadius + 0.08, burstRadius - 0.08, burstDistance);
    float burstLife = smoothstep(0.0, 0.08, uEffect) * (1.0 - smoothstep(0.78, 1.0, uEffect));
    float ring = smoothstep(0.045, 0.004, abs(burstDistance - uEffect * 1.13 - (burstNoise - 0.5) * 0.1));
    float rays = pow(max(0.0, sin(burstAngle * (8.0 + mod(uAct, 6.0)) + burstNoise * 9.0)), 16.0);
    rays *= smoothstep(burstRadius + 0.16, burstRadius - 0.02, burstDistance);

    float inkAlpha = clamp(holdInk * 0.62 + wetEdge * 0.24 + fibres * 0.28, 0.0, 0.82);
    inkAlpha = max(inkAlpha, (burstWash * 0.72 + ring * 0.54 + rays * 0.18) * burstLife);
    vec3 darkInk = vec3(0.012, 0.019, 0.016);
    vec3 lightInk = vec3(0.91, 0.86, 0.73);
    vec3 inkColour = mix(darkInk, lightInk, uInkLight);
    image.rgb = mix(image.rgb, inkColour, inkAlpha);

    float vignette = smoothstep(0.82, 0.22, length(vUv - 0.5));
    image.rgb *= mix(0.91, 1.02, vignette);
    gl_FragColor = vec4(image.rgb, 1.0);
  }
`;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
};
const mix = (start: number, end: number, amount: number) => start + (end - start) * amount;

export default function ThreeMountainStage({ opacity, cameraPhase, pointerActive, holdProgress, effectKey, reducedMotion }: MountainStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ cameraPhase, pointerActive, holdProgress, reducedMotion });
  const effectKeyRef = useRef(effectKey);

  useEffect(() => {
    propsRef.current = { cameraPhase, pointerActive, holdProgress, reducedMotion };
  }, [cameraPhase, pointerActive, holdProgress, reducedMotion]);

  useEffect(() => {
    effectKeyRef.current = effectKey;
  }, [effectKey]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false, powerPreference: "high-performance" });
    } catch {
      host.classList.add("is-unavailable");
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xeee9dc, 1);
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const loader = new THREE.TextureLoader();
    const textures = scenePaths.map((path) => {
      const texture = loader.load(`${assetPrefix}${path}`);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = 2;
      return texture;
    });
    const mountainAlt = loader.load(`${assetPrefix}/ink/scene-01-mountain-orbit-v1.webp`);
    mountainAlt.colorSpace = THREE.SRGBColorSpace;
    mountainAlt.minFilter = THREE.LinearMipmapLinearFilter;
    mountainAlt.magFilter = THREE.LinearFilter;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uMapA: { value: textures[0] },
      uMapB: { value: textures[0] },
      uMountainAlt: { value: mountainAlt },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uEffectOrigin: { value: new THREE.Vector2(0.5, 0.5) },
      uParallax: { value: new THREE.Vector2(0, 0) },
      uCamera: { value: new THREE.Vector4(0, 0, 1, 0) },
      uLens: { value: 0 },
      uSceneMix: { value: 0 },
      uAltMix: { value: 0 },
      uFog: { value: 0.1 },
      uTime: { value: 0 },
      uPointerActive: { value: 0 },
      uHold: { value: 0 },
      uEffect: { value: 0 },
      uAct: { value: 0 },
      uInkLight: { value: 0 },
    };
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(geometry, material));

    const pointer = new THREE.Vector2(0.5, 0.5);
    const pointerTarget = pointer.clone();
    const effectOrigin = pointer.clone();
    let seenEffectKey = effectKeyRef.current;
    let effectStarted = -1;
    let frame = 0;
    let disposed = false;
    let visible = !document.hidden;

    const onPointerMove = (event: PointerEvent) => {
      pointerTarget.set(
        event.clientX / Math.max(1, window.innerWidth),
        1 - event.clientY / Math.max(1, window.innerHeight),
      );
    };
    const onVisibility = () => { visible = !document.hidden; };
    const resize = () => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 0.9 : 1.2));
      renderer.setSize(width, height, false);
      renderer.getDrawingBufferSize(uniforms.uResolution.value);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    resize();

    const draw = (now: number) => {
      if (disposed) return;
      if (!visible) {
        frame = window.requestAnimationFrame(draw);
        return;
      }

      const props = propsRef.current;
      const phase = Math.min(8.999, Math.max(0, props.cameraPhase));
      const act = Math.min(8, Math.floor(phase));
      const amount = props.reducedMotion ? 0 : phase - act;
      const cameraAmount = ease(amount);
      const nextAct = Math.min(8, act + 1);
      const profileA = cameraProfiles[act];
      const profileB = cameraProfiles[Math.min(cameraProfiles.length - 1, act + 1)];
      const textureA = actTexture[act];
      const textureB = actTexture[nextAct];
      const sceneMix = textureA === textureB ? 0 : ease((amount - 0.72) / 0.28);
      const altMix = act === 0 ? ease((amount - 0.16) / 0.54) : 0;

      uniforms.uMapA.value = textures[textureA];
      uniforms.uMapB.value = textures[textureB];
      uniforms.uSceneMix.value = sceneMix;
      uniforms.uAltMix.value = altMix;
      uniforms.uCamera.value.set(
        mix(profileA.panX, profileB.panX, cameraAmount),
        mix(profileA.panY, profileB.panY, cameraAmount),
        mix(profileA.zoom, profileB.zoom, cameraAmount),
        mix(profileA.roll, profileB.roll, cameraAmount),
      );
      uniforms.uLens.value = mix(profileA.lens, profileB.lens, cameraAmount);
      uniforms.uParallax.value.set(
        mix(profileA.parallaxX, profileB.parallaxX, cameraAmount),
        mix(profileA.parallaxY, profileB.parallaxY, cameraAmount),
      );
      uniforms.uFog.value = mix(profileA.fog, profileB.fog, cameraAmount);
      uniforms.uAct.value = act;
      uniforms.uInkLight.value = darkActs[act] ? 0.82 : 0;
      pointer.lerp(pointerTarget, props.reducedMotion ? 1 : 0.15);
      uniforms.uPointer.value.copy(pointer);
      uniforms.uPointerActive.value += ((props.pointerActive ? 1 : 0) - uniforms.uPointerActive.value) * 0.16;
      uniforms.uHold.value += (props.holdProgress - uniforms.uHold.value) * 0.18;

      if (effectKeyRef.current !== seenEffectKey) {
        seenEffectKey = effectKeyRef.current;
        effectStarted = now;
        effectOrigin.copy(pointer);
        uniforms.uEffectOrigin.value.copy(effectOrigin);
      }
      uniforms.uEffect.value = effectStarted < 0 ? 0 : clamp01((now - effectStarted) / 2850);
      uniforms.uTime.value = now * 0.001;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose();
      material.dispose();
      textures.forEach((texture) => texture.dispose());
      mountainAlt.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="mountain-webgl" style={{ opacity }} ref={hostRef} aria-hidden="true" />;
}
