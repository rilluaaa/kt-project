import type { Metadata } from "next";
import ExploreMap from "./ExploreMap";
import "./explore.css";

export const metadata: Metadata = {
  title: "葵青七藝遊｜熱熾葵青",
  description: "沿葵青山海地圖，尋找七項在地文化記憶，細看技藝、節慶與社區生活如何延續。",
};

export const dynamic = "force-static";

export default function ExplorePage() {
  return <ExploreMap />;
}

