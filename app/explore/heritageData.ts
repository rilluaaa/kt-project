export type HeritageItem = {
  id: "tian-hau" | "milk-tea" | "true-lord" | "mooncake" | "wood-carving" | "yu-lan" | "neon";
  title: string;
  shortTitle: string;
  category: string;
  x: number;
  y: number;
  summary: string;
  kwaiTsing: string;
  sourceLabel: string;
  sourceUrl: string;
  inventoryNote: string;
};

export const heritageItems: HeritageItem[] = [
  {
    id: "tian-hau",
    title: "青衣天后誕",
    shortTitle: "天后誕",
    category: "節慶與信俗",
    x: 11.2,
    y: 55,
    summary:
      "青衣天后誕由青衣天后宮管理委員會舉辦，賀誕期間包括請神、賀誕、送神等儀式，並聘請戲班上演粵劇神功戲。節慶把海洋信仰、戲曲與社區相聚連在一起。",
    kwaiTsing:
      "官方清單記錄活動在每年農曆四月初一至初六於葵青區青衣舉行，是認識青衣地方信俗與居民網絡的重要入口。",
    sourceLabel: "非物質文化遺產辦事處《香港非物質文化遺產清單》",
    sourceUrl: "https://www.icho.hk/documents/Intangible-Cultural-Heritage-Inventory/2024/ich_inventory_2024_cn.pdf",
    inventoryNote: "香港非物質文化遺產代表作名錄相關項目",
  },
  {
    id: "milk-tea",
    title: "港式奶茶製作技藝",
    shortTitle: "港式奶茶",
    category: "飲食技藝",
    x: 55.8,
    y: 46.5,
    summary:
      "港式奶茶由英式奶茶演變而成，師傅會調配茶葉，再經煲茶、撞茶、焗茶及撞奶等工序，造出濃滑而平衡的風味。它呈現香港中西飲食文化交融，也深入茶餐廳與日常生活。",
    kwaiTsing:
      "非物質文化遺產辦事處的葵青考察遊蹤以葵涌為場景，直接介紹這項技藝，讓一杯街坊熟悉的奶茶成為理解工業社區生活節奏的線索。",
    sourceLabel: "非物質文化遺產辦事處：港式奶茶製作技藝",
    sourceUrl: "https://www.icho.hk/tc/web/icho/representative_list_milk_tea.html",
    inventoryNote: "香港非物質文化遺產代表作名錄",
  },
  {
    id: "true-lord",
    title: "青衣真君信俗",
    shortTitle: "真君信俗",
    category: "地方信俗",
    x: 95,
    y: 34.5,
    summary:
      "青衣真君廟供奉真君大帝。廟宇原建於青衣海邊，至一九八〇年代遷往楓樹窩路；真君誕期間會有傳統粵劇演出，廟宇與節慶共同保存青衣居民的地方記憶。",
    kwaiTsing:
      "這一站以官方地區資料介紹青衣的廟宇與信俗傳統。它是葵青地方文化主題；文化卡不把它誤稱為已列入香港非物質文化遺產的獨立項目。",
    sourceLabel: "民政事務總署「香港十八區景點」：青衣真君廟",
    sourceUrl: "https://www.gohk.gov.hk/tc/search/spot.php",
    inventoryNote: "葵青地方文化主題",
  },
  {
    id: "mooncake",
    title: "月餅製作技藝",
    shortTitle: "月餅製作",
    category: "飲食技藝",
    x: 18.8,
    y: 82.5,
    summary:
      "月餅由餅皮、蓮蓉與餡料組成，是中秋節的傳統食品及饋贈禮品。製作包含煮蓮蓉、搓餅皮、煮糖漿及造餡等技藝，工序把節令、味道和家庭團聚的記憶凝聚在一枚餅中。",
    kwaiTsing:
      "葵青的屋邨、街市與餅店承載節令食品的日常流通。地圖把製餅師傅放回社區場景，讓使用者從手上工序理解中秋文化如何在城市延續。",
    sourceLabel: "非物質文化遺產辦事處《香港非物質文化遺產清單》",
    sourceUrl: "https://www.icho.hk/documents/Intangible-Cultural-Heritage-Inventory/2024/ich_inventory_2024_cn.pdf",
    inventoryNote: "香港非物質文化遺產清單項目",
  },
  {
    id: "wood-carving",
    title: "木雕刻技藝",
    shortTitle: "木雕刻",
    category: "傳統手工藝",
    x: 37.2,
    y: 86.5,
    summary:
      "木雕刻包括木版雕刻與神像雕刻。師傅可把文字、山水或故事畫面刻在木板上，也會以樟木或檀香木製作神像，依次開料、打坯、雕身與頭部、刻紋、開面及上色。",
    kwaiTsing:
      "非物質文化遺產辦事處的葵青考察遊蹤把木雕刻帶進葵涌社區脈絡，呈現工場經驗、宗教器物與地方生活之間的關係。",
    sourceLabel: "非物質文化遺產辦事處《香港非物質文化遺產清單》",
    sourceUrl: "https://www.icho.hk/documents/Intangible-Cultural-Heritage-Inventory/2024/ich_inventory_2024_cn.pdf",
    inventoryNote: "香港非物質文化遺產清單項目",
  },
  {
    id: "yu-lan",
    title: "潮僑盂蘭勝會",
    shortTitle: "盂蘭勝會",
    category: "節慶與信俗",
    x: 56.3,
    y: 84.5,
    summary:
      "盂蘭勝會是香港潮籍社群延續的傳統節慶。儀式包括誦經、選總理及化衣等環節，透過祭祀、組織分工與街坊參與，表達慎終追遠、濟幽度亡及維繫社群的觀念。",
    kwaiTsing:
      "官方清單記錄石籬、石蔭及安蔭潮僑盂蘭勝會，由葵涌潮籍人士在農曆七月初一至初三舉行，清楚連結這項傳統與葵青社區。",
    sourceLabel: "非物質文化遺產辦事處《香港非物質文化遺產清單》",
    sourceUrl: "https://www.icho.hk/documents/Intangible-Cultural-Heritage-Inventory/2024/ich_inventory_2024_cn.pdf",
    inventoryNote: "香港非物質文化遺產清單項目",
  },
  {
    id: "neon",
    title: "霓虹光管製作及造型技藝",
    shortTitle: "霓虹光管",
    category: "傳統手工藝",
    x: 78,
    y: 84.5,
    summary:
      "屈管師傅按圖把玻璃管逐段加熱、彎曲及焊接，再接駁燈頭、抽真空和注入氣體。香港招牌多以漢字為主，屈管要把書法筆畫轉成可發光的連續線條。",
    kwaiTsing:
      "非物質文化遺產辦事處的葵青考察遊蹤在葵涌介紹霓虹技藝，讓昔日工場、店舖招牌與工業區夜色成為理解本區視覺文化的一部分。",
    sourceLabel: "非物質文化遺產辦事處《香港非物質文化遺產清單》",
    sourceUrl: "https://www.icho.hk/documents/Intangible-Cultural-Heritage-Inventory/2024/ich_inventory_2024_cn.pdf",
    inventoryNote: "香港非物質文化遺產清單項目",
  },
];

export const kwaiTsingTourSource = {
  label: "非物質文化遺產辦事處：2026「香港非遺月」葵青區非遺考察遊蹤",
  url: "https://www.icho.hk/tc/web/icho/2026_hkich_month_kwai_tsing_district.html",
};

