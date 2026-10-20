import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/home/ubuntu/.cursor/skills/anatomy/kit/iso-kit.mjs";
import * as G from "/home/ubuntu/.cursor/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "/home/ubuntu/.cursor/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

// One painted body, one VIN, one 60 s takt. The car walks twenty stations.
const TAKT = 60;
const PITCH = 42;
const N = 20;
const X0 = 36;
const AZ = 38;
const EL = 33;

const STATIONS = [
  ["上线", "车身落橇，绑定 VIN，拆门"],
  ["线束", "地板与机舱主线束"],
  ["隔音与地毯", "隔热垫、隔音棉、地毯"],
  ["顶棚", "天窗模块与顶棚"],
  ["玻璃", "前后风挡涂胶、吸盘安装"],
  ["仪表与空调", "仪表台模块、HVAC、管柱与踏板"],
  ["座舱饰件", "中控、立柱、门槛、安全带"],
  ["座椅", "前后排座椅落下并拧紧"],
  ["车门回装", "门线四门回到铰链"],
  ["底盘预装", "油箱或电池、制动硬管、排气"],
  ["动力合装", "发动机变速箱或电驱，装上副车架"],
  ["落车合装", "车身下降，与底盘对孔"],
  ["车轮与保险杠", "轮胎拧紧，保险杠与轮眉"],
  ["油液加注", "制动液、冷却液、洗涤液、冷媒、燃油"],
  ["电检与刷写", "ECU 写入，灯窗空调与故障码"],
  ["四轮定位与大灯", "前束、外倾、灯光光轴"],
  ["转毂", "制动、ABS、车速"],
  ["淋雨", "密封，门缝与流水槽"],
  ["驾驶辅助标定", "摄像头、雷达、环视靶标"],
  ["商品化与放行", "脚垫说明书铭牌，合格发运或进返修"],
];

const LIVE_W = 1040;
const LIVE_H = 640;
const POSTER_W = 3600;
const POSTER_H = 1680;

const hall = { x: -24, y: -78, w: X0 + N * PITCH + 96, d: 196, r: 10 };

function projection(mode) {
  if (mode === "poster") {
    return k.fitProjection(
      [...k.boxCorners(hall, -10, 52), [X0, -60, 0], [X0 + N * PITCH, 100, 54]],
      POSTER_W,
      POSTER_H,
      { pad: 48, azimuth: AZ, elevation: EL },
    );
  }
  const scale = 7.15;
  const home = k.iso([X0 + 16, 10, 14], { origin: [0, 0], scale, azimuth: AZ, elevation: EL });
  return { origin: [LIVE_W / 2 - home[0], LIVE_H * 0.64 - home[1]], scale, azimuth: AZ, elevation: EL };
}

function scene(P, mode) {
  const items = [];
  let solids = 0;
  const at = (point) => k.iso(point, P);
  const S = (paths, style) => {
    solids += 1;
    return k.solidSvg(paths, style);
  };
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, { size: Math.max(0.7, P.scale * 0.16), ...style });
  const put = (x, y, z, svg) => items.push({ d: k.depthOf([x, y, z], P), svg });
  const plan = (x, y, w, d, r = 0.8) => ({ x, y, w, d, r: Math.min(r, w / 2, d / 2) });
  const screws = (box, z, inset = 1.7) => {
    if (box.w < inset * 2 + 1.4 || box.d < inset * 2 + 1.4) return "";
    const pts = k.corners(box, inset);
    return L(pts.map(([x, y]) => k.ring(x, y, 0.62, z, P, 10)).join(""), { tone: "lo" }) + D(pts.map(([x, y]) => at([x, y, z])));
  };
  const groove = (box, z, inset = 1.05) => L(k.planOutline(k.insetPlan(box, inset), z, P, 3), { tone: "faint" });
  const box = (x, y, z, w, d, h, tone = "mid", extra = "") => {
    const face = plan(x, y, w, d, Math.min(1.1, w / 5, d / 5));
    put(x + w / 2, y + d / 2, z + h / 2, S(k.slabOf(face, z, h, P, 4, Math.min(0.55, h * 0.18)), { tone }) + extra);
    return face;
  };
  const can = (x, y, z, r, h, tone = "mid", steps = 18) => {
    put(x, y, z + h / 2, S(k.cylinder(x, y, r, z, h, P, steps, Math.min(0.35, r * 0.15)), { tone, crease: h > r * 3 ? "none" : "faint" }));
  };
  const disc = (x, y, z, axis, radius, length, tone = "hi") => {
    const F = G.frameAlong([x, y, z], axis);
    const half = length / 2;
    const meridian = [[-half, radius * 0.42], [-half, radius], [half, radius], [half, radius * 0.42]];
    put(x, y, z, S(G.lathe(meridian, F, P, { steps: 16 }), { tone }));
  };

  // Hall, feet, aisle ruler. The floor is a building slab, then each bay cuts it into a deck.
  put(hall.x + hall.w / 2, hall.y + hall.d / 2, -4, `<path class="iso-halo" d="${k.haloOf(hall, -9, 6, P)}"/>`);
  for (const [x, y] of k.corners(hall, 28)) {
    can(x, y, -9, 5.2, 1.3, "lo", 20);
    can(x, y, -7.7, 3.8, 7.7, "mid", 20);
  }
  for (let i = 0; i < 6; i += 1) {
    const x = hall.x + 40 + i * ((hall.w - 80) / 5);
    can(x, hall.y + 22, -9, 4.2, 1.2, "lo", 16);
    can(x, hall.y + 22, -7.8, 3.1, 7.8, "mid", 16);
    can(x, hall.y + hall.d - 22, -9, 4.2, 1.2, "lo", 16);
    can(x, hall.y + hall.d - 22, -7.8, 3.1, 7.8, "mid", 16);
  }
  const slab = plan(hall.x, hall.y, hall.w, hall.d, 10);
  put(
    hall.x + hall.w / 2,
    hall.y + hall.d / 2,
    -1,
    S(k.slabOf(slab, -6.2, 6.2, P, 6, 1.2), { tone: "lo" }) + groove(slab, 0, 3.2),
  );
  const strip = plan(X0 - 4, -30, N * PITCH + 8, 3.2, 0.4);
  const ticks = k.topTicks(strip.x + 2, strip.x + strip.w - 2, PITCH / 4, 4, strip.y, 0.45, [0.45, 0.8], P);
  put(strip.x + strip.w / 2, strip.y, 0.4, S(k.slabOf(strip, 0, 0.45, P, 2), { tone: "lo", crease: "none" }) + L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }));
  const label = plan(X0 - 2, -40, 16, 7, 0.6);
  put(
    label.x + 8,
    label.y + 3,
    0.5,
    S(k.slabOf(label, 0, 0.7, P, 3), { tone: "mid" })
      + L(k.planOutline(k.insetPlan(label, 0.8), 0.7, P, 3), { tone: "faint" })
      + L(k.lineOnTop([label.x + 1.8, label.y + 2.2], [label.x + 10, label.y + 2.2], 0.75, P), { tone: "lo", free: true })
      + L(k.lineOnTop([label.x + 1.8, label.y + 3.6], [label.x + 12.2, label.y + 3.6], 0.75, P), { tone: "lo", free: true })
      + L(k.lineOnTop([label.x + 1.8, label.y + 5], [label.x + 8.4, label.y + 5], 0.75, P), { tone: "lo", free: true })
      + screws(label, 0.7, 1.2)
      + k.faceTextSvg(k.topMatrix([label.x + 8, label.y + 3.4], 0.75, P), "FA-1", { size: 2.2, tone: "mid", anchor: "middle" }),
  );

  // Columns and an open truss, so the line stays visible.
  for (let i = 0; i <= N; i += 4) {
    const x = X0 - 8 + i * PITCH;
    for (const y of [-48, 72]) {
      can(x, y, 0, 2.4, 1.4, "lo", 16);
      can(x, y, 1.4, 1.5, 44, "mid", 14);
      can(x, y, 45.4, 2.2, 1.6, "mid", 14);
    }
    const beam = plan(x - 1.1, -48, 2.2, 120, 0.4);
    put(x, 12, 47, S(k.slabOf(beam, 46.2, 1.5, P, 2, 0.3), { tone: "mid" }));
  }
  for (let i = 0; i < N; i += 4) {
    const x = X0 - 8 + i * PITCH;
    const span = plan(x, -49.2, PITCH * 4, 2.2, 0.3);
    put(x + PITCH * 2, -48, 47, S(k.slabOf(span, 46.4, 1.2, P, 2), { tone: "mid" }));
    const far = plan(x, 70.8, PITCH * 4, 2.2, 0.3);
    put(x + PITCH * 2, 72, 47, S(k.slabOf(far, 46.4, 1.2, P, 2), { tone: "mid" }));
  }

  // EMS rail for doors and seats, far side of the deck.
  const rail = plan(X0 - 6, 30.2, N * PITCH + 12, 1.6, 0.3);
  put(rail.x + rail.w / 2, 31, 36, S(k.slabOf(rail, 35.2, 1.3, P, 2), { tone: "mid" }));
  for (let i = 0; i < N; i += 1) {
    const x = X0 + i * PITCH + PITCH / 2;
    can(x, 31, 28, 0.45, 7.2, "mid", 10);
  }

  function gun(x, y, z) {
    const pad = plan(x - 2.2, y - 2.2, 4.4, 4.4, 0.6);
    put(
      x,
      y,
      z + 3,
      S(k.slabOf(pad, z, 1.1, P, 3, 0.3), { tone: "mid" })
        + screws(pad, z + 1.1, 0.7)
        + S(k.cylinder(x, y, 0.7, z + 1.1, 4.2, P, 12), { tone: "mid", crease: "none" })
        + S(k.cylinder(x, y, 1.15, z + 5.1, 1.5, P, 14, 0), { tone: "hi" })
        + L(k.knurl(x, y, 1.15, z + 5.1, z + 6.6, 12, P, 0), { tone: "lo" }),
    );
  }

  function rack(x, y, bins) {
    const frame = plan(x, y, 8 + bins * 0.2, 3.4, 0.4);
    put(x + 4, y + 1.6, 3, S(k.slabOf(frame, 0, 2.4, P, 3, 0.3), { tone: "mid" }) + screws(frame, 2.4, 0.6));
    for (let b = 0; b < bins; b += 1) {
      const tray = plan(x + 0.6 + b * 0.05, y + 0.45, 7.2, 2.5, 0.3);
      put(x + 4, y + 1.6, 4 + b * 1.35, S(k.slabOf(tray, 2.4 + b * 1.35, 0.35, P, 2), { tone: "lo", crease: "none" }));
    }
  }

  function cart(x, y) {
    const bed = plan(x, y, 9, 6, 0.5);
    put(x + 4.5, y + 3, 1.6, S(k.slabOf(bed, 1.2, 0.8, P, 3, 0.25), { tone: "mid" }) + groove(bed, 2, 0.5));
    for (const [cx, cy] of k.corners(bed, 1.1)) can(cx, cy, 0, 0.55, 1.2, "lo", 10);
    const tote = plan(x + 1.2, y + 1.1, 6.4, 3.8, 0.4);
    put(x + 4.4, y + 3, 3.2, S(k.slabOf(tote, 2, 1.6, P, 3, 0.25), { tone: "hi" }));
  }

  function doorPanel(x, y, z, tone = "hi") {
    const leaf = plan(x, y, 0.7, 6.2, 0.2);
    put(x, y + 3, z + 4, S(k.slabOf(leaf, z, 7.4, P, 2, 0.15), { tone }) + L(k.planOutline(k.insetPlan(leaf, 0.15), z + 7.4, P, 2), { tone: "faint" }));
    can(x + 0.35, y + 1.2, z + 3.2, 0.28, 0.5, "mid", 8);
  }

  // Main line, back stations first via the depth sort.
  for (let i = 0; i < N; i += 1) {
    const x = X0 + i * PITCH;
    const deck = plan(x + 0.7, 0.4, PITCH - 1.4, 23.2, 0.6);
    put(x + PITCH / 2, 12, 1.1, S(k.slabOf(deck, 0, 2.15, P, 3, 0.35), { tone: "mid" }) + groove(deck, 2.15, 0.9) + screws(deck, 2.15, 1.5));
    put(x + 18, 11, 8, `<g data-slot="${i}"></g>`);
    can(x + 6, -7.2, 0, 0.55, 6.5, "mid", 10);
    const lamp = plan(x + 5.2, -8, 1.6, 1.6, 0.3);
    put(x + 6, -7.2, 7.4, `<g data-andon="${i}">` + S(k.slabOf(lamp, 6.5, 1.1, P, 2), { tone: "hi" }) + `</g>`);
    gun(x + PITCH - 7, -6, 0);

    if (i === 0) {
      can(x + 8, 27, 2.15, 0.7, 11, "mid", 12);
      box(x + 6.2, 26, 13, 3.6, 2.2, 2.2, "hi");
      can(x + 14, 26.5, 16, 0.35, 8, "mid", 8);
      can(x + 28, 26.5, 16, 0.35, 8, "mid", 8);
      box(x + 12.5, 25.6, 24, 3, 1.8, 0.6, "mid");
      box(x + 26.5, 25.6, 24, 3, 1.8, 0.6, "mid");
    }
    if (i === 1) {
      const board = plan(x + 8, 26, 22, 1.2, 0.3);
      put(x + 19, 26.6, 8, S(k.slabOf(board, 4, 7.5, P, 2, 0.2), { tone: "mid" }));
      put(x + 19, 26.6, 8, D(k.dotGrid(x + 10, 26.3, 8, 3, 1.6, 11.6, P), { size: Math.max(0.7, P.scale * 0.14), tone: "lo" }));
      rack(x + 8, -16, 3);
    }
    if (i === 2) {
      disc(x + 14, 30, 6.5, [0, 1, 0], 2.4, 7, "hi");
      disc(x + 24, 30, 8.2, [0, 1, 0], 2.1, 6, "mid");
      box(x + 10, 26.2, 2.15, 16, 5, 1.2, "lo");
      cart(x + 4, -18);
    }
    if (i === 3) {
      box(x + 12, 26, 18, 14, 8, 1.3, "hi");
      box(x + 16, 28, 19.3, 6, 4, 0.8, "mid");
      can(x + 14, 25, 2.15, 0.4, 16, "mid", 8);
      can(x + 28, 25, 2.15, 0.4, 16, "mid", 8);
    }
    if (i === 4) {
      can(x + 16, 29, 2.15, 2.6, 1.6, "lo", 16);
      can(x + 16, 29, 3.7, 1.3, 8, "mid", 14);
      const arm = `<g data-tool="glass">` + S(k.slabOf(plan(x + 14.6, 27.4, 10, 1.5, 0.4), 11.2, 1.4, P, 2), { tone: "mid" }) + S(k.cylinder(x + 24, 28.1, 0.8, 6.2, 5.2, P, 12), { tone: "mid", crease: "none" }) + S(k.cylinder(x + 24, 28.1, 1.7, 4.6, 1.1, P, 14), { tone: "hi" }) + `</g>`;
      put(x + 20, 28, 10, arm);
      can(x + 8, 27, 2.15, 1.1, 3.4, "mid", 12);
      box(x + 6.4, 25.6, 5.5, 3.2, 2.6, 2.4, "lo");
    }
    if (i === 5) {
      const ip = plan(x + 8, 25.5, 20, 8, 0.5);
      put(x + 18, 29, 4, S(k.slabOf(ip, 2.15, 2.4, P, 3, 0.35), { tone: "hi" }) + groove(k.insetPlan(ip, 1.2), 4.55, 0.4) + screws(ip, 4.55, 1.3));
      box(x + 10, 27, 4.55, 7, 3.2, 2.2, "mid");
      box(x + 18, 27.4, 4.55, 6, 2.4, 1.4, "lo");
    }
    if (i === 6) {
      rack(x + 10, 26, 4);
      box(x + 20, 26.4, 6.4, 5, 2.2, 0.5, "hi");
      box(x + 20.4, 26.8, 6.9, 4.2, 1.4, 0.35, "mid");
      gun(x + 12, -14, 0);
    }
    if (i === 7) {
      const hook = `<g data-tool="seats">` + S(k.slabOf(plan(x + 12, 25.4, 12, 7, 0.4), 16, 1.1, P, 3), { tone: "mid" }) + S(k.slabOf(plan(x + 14, 27, 3.2, 3.4, 0.4), 17.1, 2.6, P, 2), { tone: "hi" }) + S(k.slabOf(plan(x + 18.2, 27.2, 3.4, 3.2, 0.4), 17.1, 3.4, P, 2), { tone: "hi" }) + `</g>`;
      put(x + 18, 28, 18, hook);
      can(x + 13, 31, 20, 0.35, 15, "mid", 8);
      can(x + 23, 31, 20, 0.35, 15, "mid", 8);
    }
    if (i === 8) {
      can(x + 8, 26, 2.15, 0.55, 6, "mid", 10);
      can(x + 32, 26, 2.15, 0.55, 6, "mid", 10);
      box(x + 6.6, 25.2, 8.1, 2.6, 1.6, 1.4, "hi");
      box(x + 30.6, 25.2, 8.1, 2.6, 1.6, 1.4, "hi");
      gun(x + 18, -14, 0);
    }
    if (i === 9) {
      disc(x + 22, 29, 4.6, [1, 0, 0], 2.2, 8, "mid");
      box(x + 10, 26, 2.15, 14, 5.5, 1.6, "lo");
      const pipe = plan(x + 6, 11.2, 28, 0.7, 0.2);
      put(x + 20, 11.5, 2.5, S(k.slabOf(pipe, 2.15, 0.45, P, 2), { tone: "mid", crease: "none" }));
    }
    if (i === 10) {
      box(x + 8, 26, 2.15, 10, 7, 1.4, "mid");
      box(x + 9.2, 27.2, 3.55, 6.4, 4.4, 3.6, "hi");
      can(x + 12, 29.4, 7.1, 0.9, 1.6, "mid", 12);
      box(x + 16, 27.6, 3.55, 3.2, 3.6, 2.4, "mid");
      box(x + 20, 26.4, 2.15, 12, 8, 1.5, "lo");
      box(x + 21.2, 27.6, 3.65, 9.4, 5.6, 1.1, "hi");
    }
    if (i === 11) {
      for (const [dx, dy] of [[6, 26], [34, 26], [6, -2], [34, -2]]) {
        can(x + dx, dy, 2.15, 0.7, 14, "mid", 10);
        can(x + dx, dy, 16.1, 1.15, 0.8, "lo", 10);
      }
      const yoke = plan(x + 5, 25.2, 30, 1.4, 0.3);
      put(x + 20, 26, 16.4, S(k.slabOf(yoke, 15.6, 1.1, P, 2), { tone: "mid" }));
    }
    if (i === 12) {
      gun(x + 10, 27, 2.15);
      gun(x + 30, 27, 2.15);
      box(x + 14, 26.2, 2.15, 12, 4, 1.2, "hi");
      box(x + 16, -16, 0, 8, 3, 1.4, "mid");
    }
    if (i === 13) {
      const cab = plan(x + 4, -18, 8, 6, 0.5);
      put(x + 8, -15, 4, S(k.slabOf(cab, 0, 6.5, P, 3, 0.4), { tone: "mid" }) + groove(cab, 6.5, 0.6) + screws(cab, 6.5, 1));
      for (let n = 0; n < 4; n += 1) can(x + 6 + n * 1.5, -15.2, 6.5, 0.38, 1.3, "hi", 8);
      const nozzles = `<g data-tool="fill">` + [0, 1, 2, 3].map((n) => S(k.cylinder(x + 6 + n * 1.5, -12.4, 0.28, 5.2, 2.4, P, 8), { tone: "hi", crease: "none" })).join("") + `</g>`;
      put(x + 8, -12, 6, nozzles);
      cart(x + 16, -18);
    }
    if (i === 14) {
      can(x + 18, -12, 0, 0.8, 9, "mid", 12);
      const screen = plan(x + 15.4, -13.2, 5.2, 0.5, 0.15);
      put(x + 18, -13, 8, S(k.slabOf(screen, 5.5, 3.4, P, 2), { tone: "hi" }) + L(k.planOutline(k.insetPlan(screen, 0.35), 8.9, P, 2), { tone: "faint" }));
    }
    if (i === 15) {
      for (const y of [26.5, -4]) {
        can(x + 12, y, 2.15, 0.55, 6.5, "mid", 10);
        box(x + 10.6, y - 1.1, 8.4, 2.8, 2.2, 1.6, "hi");
        can(x + 28, y, 2.15, 0.55, 6.5, "mid", 10);
        box(x + 26.6, y - 1.1, 8.4, 2.8, 2.2, 1.6, "hi");
      }
      box(x + 16, 27.5, 2.15, 8, 3.2, 5.5, "lo");
    }
    if (i === 16) {
      disc(x + 12, 8, 3.5, [0, 1, 0], 1.35, 10, "mid");
      disc(x + 28, 8, 3.5, [0, 1, 0], 1.35, 10, "mid");
      box(x + 6, 3.2, 2.15, 2.2, 14, 1.6, "lo");
      box(x + 32, 3.2, 2.15, 2.2, 14, 1.6, "lo");
    }
    if (i === 17) {
      for (const [dx, dy] of [[5, 25], [36, 25], [5, 1], [36, 1]]) can(x + dx, dy, 2.15, 0.6, 16, "mid", 10);
      put(x + 20, 25, 18, S(k.slabOf(plan(x + 4.2, 24.4, 32.6, 1.2, 0.2), 17.6, 0.9, P, 2), { tone: "mid" }));
      put(x + 20, 1, 18, S(k.slabOf(plan(x + 4.2, 0.6, 32.6, 1.2, 0.2), 17.6, 0.9, P, 2), { tone: "mid" }));
      for (let n = 0; n < 6; n += 1) can(x + 8 + n * 4.5, 24.2, 14.5, 0.28, 2.4, "hi", 8);
      const trench = plan(x + 8, 6, 24, 10, 0.4);
      put(x + 20, 11, 2.3, L(k.planOutline(trench, 2.2, P, 3), { tone: "lo" }));
    }
    if (i === 18) {
      for (const y of [4, 10, 16]) box(x + 34, y, 2.15, 0.7, 3.6, 8, "hi");
      can(x + 18, 28, 2.15, 0.5, 5, "mid", 10);
      box(x + 16.2, 26.8, 7.1, 3.6, 2.4, 1.8, "mid");
    }
    if (i === 19) {
      can(x + 6, 26, 2.15, 0.7, 12, "mid", 10);
      can(x + 34, 26, 2.15, 0.7, 12, "mid", 10);
      put(x + 20, 26, 14, S(k.slabOf(plan(x + 5, 25.4, 30, 1.3, 0.3), 13.6, 1, P, 2), { tone: "mid" }));
      box(x + 8, -16, 0, 7, 4, 1.2, "hi");
      box(x + 16, -16.4, 0, 4, 3.2, 2.2, "mid");
    }
  }

  // Offline door line: regulator, glass, latch, mirror, seal on each leaf.
  for (let i = 0; i < 8; i += 1) {
    const x = X0 + i * PITCH + 6;
    const table = plan(x, 48, 16, 8, 0.5);
    put(x + 8, 52, 1.2, S(k.slabOf(table, 0, 2.2, P, 3, 0.3), { tone: "mid" }) + screws(table, 2.2, 1.2));
    doorPanel(x + 3, 49, 2.4);
    can(x + 8, 51, 2.4, 0.45, 3.2, "mid", 8);
    box(x + 10, 50, 2.4, 2.2, 1.4, 1.6, "lo");
    can(x + 13, 52.5, 2.4, 0.7, 0.6, "hi", 10);
    box(x + 6, 54.2, 2.2, 8, 0.5, 0.4, "mid");
  }

  // IP island, powertrain island (ICE and battery), suspension, front end.
  {
    const x = X0 + 5 * PITCH;
    box(x + 4, 62, 0, 22, 12, 2.2, "mid");
    box(x + 6, 64, 2.2, 16, 7, 2.6, "hi");
    box(x + 8, 66, 4.8, 6, 2.4, 1.6, "mid");
    can(x + 16, 67, 4.8, 0.8, 1.4, "lo", 10);
  }
  {
    const x = X0 + 10 * PITCH;
    box(x, 60, 0, 28, 16, 2, "mid");
    box(x + 2, 62, 2, 10, 7, 4.2, "hi");
    can(x + 6, 65, 6.2, 1.1, 2, "mid", 12);
    box(x + 12.4, 63, 2, 5, 5, 2.8, "mid");
    box(x + 18, 62.5, 2, 8, 10, 1.3, "hi");
    put(x + 22, 67, 3.6, L(k.planOutline(plan(x + 19.2, 64, 5.6, 6.4, 0.3), 3.5, P, 3), { tone: "faint" }));
  }
  {
    const x = X0 + 11 * PITCH + 4;
    box(x, 62, 0, 24, 10, 1.6, "mid");
    box(x + 2, 64, 1.6, 18, 2.2, 1.1, "hi");
    box(x + 2, 68.4, 1.6, 18, 2.2, 1.1, "hi");
    can(x + 4, 66, 1.6, 1.3, 1.4, "lo", 12);
    can(x + 18, 66, 1.6, 1.3, 1.4, "lo", 12);
  }
  {
    const x = X0 + 12 * PITCH + 6;
    box(x, 62, 0, 20, 8, 2,2, "mid");
    box(x + 2, 63.4, 2.2, 15, 2.4, 2.4, "hi");
    can(x + 5, 66.4, 2.2, 1.1, 1.5, "mid", 10);
    can(x + 14, 66.4, 2.2, 1.1, 1.5, "mid", 10);
  }

  // Door convoy on the EMS, parked at the head of the line until the car reaches station 8.
  {
    let hanging = "";
    for (let n = 0; n < 4; n += 1) {
      const x = X0 + 4 + n * 7;
      hanging += S(k.cylinder(x, 31, 0.35, 28, 6.4, P, 8), { tone: "mid", crease: "none" });
      hanging += S(k.slabOf(plan(x - 0.4, 28.4, 0.8, 5.4, 0.2), 22, 6.2, P, 2), { tone: "hi" });
    }
    put(X0 + 14, 31, 26, `<g data-tool="doors">${hanging}</g>`);
  }

  function wheelAt(x, y, z) {
    return G.lathe(
      [[-0.7, 1.1], [-0.7, 2.7], [0.7, 2.7], [0.7, 1.1]],
      G.frameAlong([x, y, z], [0, 1, 0]),
      P,
      { steps: 14 },
    );
  }

  function carInner(amount, reactive) {
    const show = (name, from, svg) => {
      const value = amount(from);
      if (!reactive && value < 0.5) return "";
      const style = reactive ? ` style="opacity:${value < 0.5 ? 0 : 1}"` : "";
      return `<g data-piece="${name}" data-from="${from}"${style}>${svg}</g>`;
    };
    const shell = S(k.slabOf(plan(2, 3.2, 26, 11.6, 0.7), 5, 1.3, P, 3, 0.3), { tone: "hi" })
      + S(k.slabOf(plan(2.2, 2.4, 25.6, 1.1, 0.3), 5, 3.1, P, 2), { tone: "hi" })
      + S(k.slabOf(plan(2.2, 14.5, 25.6, 1.1, 0.3), 5, 3.1, P, 2), { tone: "hi" })
      + S(k.slabOf(plan(2.6, 3.4, 7.2, 11.2, 0.4), 8.1, 1.05, P, 3), { tone: "hi" })
      + S(k.slabOf(plan(21.2, 3.4, 6.4, 11.2, 0.4), 7.8, 1.2, P, 3), { tone: "hi" })
      + S(k.slabOf(plan(9.2, 3.3, 12.2, 11.4, 0.4), 8.2, 4.8, P, 3, 0.3), { tone: "hi" })
      + S(k.slabOf(plan(10.2, 4.1, 10.2, 9.8, 0.35), 13, 0.55, P, 2), { tone: "hi", lit: true });
    const chassis = S(k.slabOf(plan(3, 4.2, 22, 1.3, 0.3), 2.3, 1.5, P, 2), { tone: "mid" })
      + S(k.slabOf(plan(3, 12.4, 22, 1.3, 0.3), 2.3, 1.5, P, 2), { tone: "mid" })
      + S(k.slabOf(plan(4, 4.2, 1.4, 9.5, 0.3), 2.5, 1.2, P, 2), { tone: "mid" })
      + S(k.slabOf(plan(20, 4.2, 1.4, 9.5, 0.3), 2.5, 1.2, P, 2), { tone: "mid" })
      + S(k.slabOf(plan(6, 5.4, 7, 7.2, 0.4), 3.5, 2.4, P, 3), { tone: "hi" })
      + S(k.slabOf(plan(13.5, 6.2, 6.4, 5.6, 0.8), 2.6, 1.5, P, 3), { tone: "lo" })
      + S(k.slabOf(plan(8, 8.6, 12, 0.7, 0.2), 2.35, 0.4, P, 2), { tone: "mid", crease: "none" });
    const wheels = [6, 22].flatMap((wx) => [3.1, 14.6].map((wy) => S(wheelAt(wx, wy, 4.9), { tone: "hi" }))).join("");
    const harness = S(k.slabOf(plan(4, 6.2, 16, 0.55, 0.2), 6.4, 0.35, P, 2), { tone: "lo", crease: "none" })
      + S(k.slabOf(plan(4, 11.2, 16, 0.55, 0.2), 6.4, 0.35, P, 2), { tone: "lo", crease: "none" });
    const carpet = S(k.slabOf(plan(3.4, 4.6, 18, 8.8, 0.4), 6.35, 0.28, P, 2), { tone: "mid", crease: "none" });
    const roof = S(k.slabOf(plan(10.4, 4.4, 9.6, 9.2, 0.3), 13.55, 0.35, P, 2), { tone: "mid" });
    const glass = S(k.slabOf(plan(9.15, 3.8, 0.45, 10.4, 0.1), 8.6, 4.2, P, 2), { tone: "hi" })
      + S(k.slabOf(plan(21.05, 3.8, 0.45, 10.4, 0.1), 8.3, 3.6, P, 2), { tone: "hi" });
    const ip = S(k.slabOf(plan(9.6, 4.2, 2.4, 9.6, 0.3), 7.2, 2.2, P, 2), { tone: "mid" })
      + S(k.slabOf(plan(8.2, 6.4, 1.2, 5.2, 0.2), 6.6, 1.4, P, 2), { tone: "lo" });
    const trim = S(k.slabOf(plan(14, 4.6, 4.2, 2.2, 0.3), 7.1, 1.3, P, 2), { tone: "mid" })
      + S(k.slabOf(plan(10.6, 3.5, 0.4, 11, 0.1), 6.6, 4.2, P, 2), { tone: "lo" })
      + S(k.slabOf(plan(19.6, 3.5, 0.4, 11, 0.1), 6.6, 3.4, P, 2), { tone: "lo" });
    const seats = S(k.slabOf(plan(12.2, 4.8, 3.2, 3.4, 0.3), 6.7, 1.1, P, 2), { tone: "hi" })
      + S(k.slabOf(plan(14.6, 5, 1.1, 3, 0.2), 7.6, 2.4, P, 2), { tone: "hi" })
      + S(k.slabOf(plan(12.4, 10, 3.2, 3.2, 0.3), 6.7, 1.1, P, 2), { tone: "hi" })
      + S(k.slabOf(plan(14.8, 10.2, 1.1, 2.8, 0.2), 7.6, 2.4, P, 2), { tone: "hi" })
      + S(k.slabOf(plan(18.2, 5.2, 3.4, 7.4, 0.3), 6.7, 1.3, P, 2), { tone: "hi" });
    const doors = S(k.slabOf(plan(8.6, 2.15, 6.4, 0.7, 0.15), 5.4, 6.2, P, 2), { tone: "hi" })
      + S(k.slabOf(plan(16.2, 2.15, 5.6, 0.7, 0.15), 5.4, 5.6, P, 2), { tone: "hi" })
      + S(k.slabOf(plan(8.6, 15.15, 6.4, 0.7, 0.15), 5.4, 6.2, P, 2), { tone: "hi" })
      + S(k.slabOf(plan(16.2, 15.15, 5.6, 0.7, 0.15), 5.4, 5.6, P, 2), { tone: "hi" });
    const bumper = S(k.slabOf(plan(1.2, 3.2, 1.2, 11.6, 0.3), 5.2, 2.4, P, 2), { tone: "mid" })
      + S(k.slabOf(plan(27.4, 3.4, 1.1, 11.2, 0.3), 5.3, 2.2, P, 2), { tone: "mid" });
    const fluids = S(k.cylinder(5.2, 6.2, 0.45, 9.2, 0.7, P, 10), { tone: "hi" })
      + S(k.cylinder(5.6, 8.4, 0.35, 9.2, 0.6, P, 8), { tone: "mid" });
    solids += 48;
    const lift = amount("drop");
    return [
      show("chassis", 10, chassis),
      show("wheels", 12, wheels),
      `<g data-part="lift" transform="${k.translateAlong(P, [0, 0, lift])}">`,
      show("shell", -1, shell),
      show("harness", 1, harness),
      show("carpet", 2, carpet),
      show("glass", 4, glass),
      show("ip", 5, ip),
      show("trim", 6, trim),
      show("seats", 7, seats),
      show("doors", 8, doors),
      show("roof", 3, roof),
      show("bumper", 12, bumper),
      show("fluids", 13, fluids),
      `</g>`,
    ].join("");
  }

  const amountOf = (station, u) => (from) => {
    if (from === "drop") {
      if (station < 11) return 8;
      if (station > 11) return 0;
      return (1 - u) * 8;
    }
    if (from < 0) return 1;
    if (station > from) return 1;
    if (station < from) return 0;
    return u;
  };

  if (mode === "live") {
    const initial = (from) => (from === "drop" ? 8 : from < 0 ? 1 : 0);
    const car = `<g data-part="car" transform="${k.translateAlong(P, [X0 + 5, 0, 0])}">${carInner(initial, true)}</g>`;
    put(X0 + 18, 11, 8, car);
  } else {
    const station = 11;
    const u = 0.55;
    const car = `<g data-part="poster-car" transform="${k.translateAlong(P, [X0 + station * PITCH + 5, 0, 0])}">${carInner(amountOf(station, u), false)}</g>`;
    put(X0 + station * PITCH + 18, 11, 10, car);
  }

  // Painted-body store, ahead of station 0.
  for (let n = 0; n < 3; n += 1) {
    const x = X0 - 34 - n * 22;
    box(x, 2, 0, 16, 12, 1.4, "mid");
    box(x + 1, 3, 1.4, 14, 10, 3.2, "hi");
    box(x + 3, 4, 4.6, 8, 8, 2.4, "hi");
  }

  // Two finished cars in shipping, and one in the repair spur with the hood stood up.
  for (let n = 0; n < 2; n += 1) {
    const x = X0 + N * PITCH + 8 + n * 36;
    const parked = (from) => (from === "drop" ? 0 : 1);
    const done = carInner(parked, false);
    put(x + 16, 8, 8, `<g transform="${k.translateAlong(P, [x, 0, 0])}">${done}</g>`);
  }
  {
    const x = X0 + 19 * PITCH + 6;
    const y = -46;
    box(x, y, 0, 32, 16, 1.2, "lo");
    const parked = (from) => (from === "drop" ? 0 : 1);
    const done = carInner(parked, false);
    put(x + 16, y + 4, 6, `<g transform="${k.translateAlong(P, [x, y, 0])}">${done}${S(k.slabOf(plan(2.4, 4, 6.4, 0.5, 0.15), 8.2, 4.4, P, 2), { tone: "hi" })}</g>`);
  }

  items.sort((a, b) => b.d - a.d);
  return { body: items.map((item) => item.svg).join(""), solids };
}

function pageFor(mode) {
  const P = projection(mode);
  const { body, solids } = scene(P, mode);
  const width = mode === "poster" ? POSTER_W : LIVE_W;
  const height = mode === "poster" ? POSTER_H : LIVE_H;
  const clipped = mode === "live"
    ? `<defs><clipPath id="shop"><rect width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#shop)"><g data-world>${body}</g></g>`
    : body;
  const svg = k.figureSvg({
    width,
    height,
    label: "汽车总装车间。涂装后的车身按 60 秒节拍经过内饰、合装、加注和检测，成为一辆可交付的车。",
    body: clipped,
    standalone: mode === "poster" ? theme : false,
  });
  return { P, svg, solids, width, height };
}

const livePage = pageFor("live");
const posterPage = pageFor("poster");

const live = `
const P = ${JSON.stringify(livePage.P)};
const NAMES = ${JSON.stringify(STATIONS.map(([name, work]) => ({ name, work })))};
const TAKT = ${TAKT};
const PITCH = ${PITCH};
const X0 = ${X0};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const world = svg.querySelector("[data-world]");
const car = svg.querySelector('[data-part="car"]');
const lift = svg.querySelector('[data-part="lift"]');
const readout = document.querySelector("[data-readout]");
const slots = [...svg.querySelectorAll("[data-slot]")];
const pieces = [...car.querySelectorAll("[data-piece]")];
const doors = svg.querySelector('[data-tool="doors"]');
const glass = svg.querySelector('[data-tool="glass"]');
const seats = svg.querySelector('[data-tool="seats"]');
const fill = svg.querySelector('[data-tool="fill"]');
const andons = [...svg.querySelectorAll("[data-andon]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const home = iso([X0 + 16, 10, 14], P);
let shown = 0;
let target = 0;
let frame = 0;
let last = 0;
let clock = 0;
let touring = !still.matches;
let visible = false;
let idle = 0;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
function place(node, by) {
  if (node) node.setAttribute("transform", translateAlong(P, by));
}
function render() {
  const station = clamp(Math.floor(shown), 0, 19);
  const u = shown - station;
  const x = X0 + shown * PITCH + 5;
  place(car, [x, 0, 0]);
  const drop = station < 11 ? 8 : station > 11 ? 0 : (1 - u) * 8;
  place(lift, [0, 0, drop]);
  const slot = slots[station];
  if (slot && car.parentNode !== slot) slot.appendChild(car);
  for (const piece of pieces) {
    const from = Number(piece.dataset.from);
    let opacity = 1;
    if (from >= 0) opacity = shown >= from + 1 ? 1 : shown < from ? 0 : shown - from;
    piece.style.opacity = String(opacity);
  }
  const travel = Math.min(shown, 8) * PITCH;
  place(doors, [travel, 0, 0]);
  if (doors) doors.style.opacity = shown < 8.2 ? "1" : "0";
  const act = (at) => {
    const d = shown - at;
    if (d <= 0 || d >= 1) return 0;
    if (d < 0.18) return d / 0.18;
    if (d > 0.82) return (1 - d) / 0.18;
    return 1;
  };
  place(glass, [0, 0, -act(4) * 6.5]);
  place(seats, [0, 0, -act(7) * 9]);
  place(fill, [0, act(13) * 6, 0]);
  const dwell = (shown - station) * TAKT;
  const info = NAMES[station];
  const text = info.name + " · 节拍 " + TAKT + " s · 站内 " + dwell.toFixed(0) + " s";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(station + 1));
  stage.setAttribute("aria-valuetext", info.name + "，" + info.work);
  const focus = iso([X0 + shown * PITCH + 16, 10, 14], P);
  world.setAttribute("transform", "translate(" + (home[0] - focus[0]).toFixed(2) + " " + (home[1] - focus[1]).toFixed(2) + ")");
  andons.forEach((node, index) => node.setAttribute("data-hot", index === station ? "" : "off"));
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) {
    clock += dt;
    target = (clock / 2.7) % 20;
  }
  if (still.matches) shown = target;
  else shown += (target - shown) * (1 - Math.exp(-dt / 0.38));
  if (Math.abs(target - shown) < 0.002) shown = target;
  if (shown < 0) shown += 20;
  render();
  const settled = !touring && shown === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false;
  target = clamp(next, 0, 19.98);
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = target * 2.7; run(); }, 4200);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp((event.clientX - box.left) / box.width, 0, 0.999);
  steer(share * 20);
});
stage.addEventListener("keydown", (event) => {
  const here = Math.floor(target + 1e-3);
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.min(19, here + 1) + 0.55;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.max(0, here - 1) + 0.55;
  if (event.key === "Home") to = 0.2;
  if (event.key === "End") to = 19.75;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
render();
`;

const plate = k.plateHtml({
  fig: "Fig 1",
  title: "总装车间",
  hint: "悬停或方向键，沿节拍走完全线",
  readout: "上线 · 节拍 60 s · 站内 0 s",
  keys: [
    { mark: "lit", label: "正在装配的这台车：车顶是要跟着走的那一件" },
    { mark: "raised", label: "车身、座椅、玻璃、动力和线边零件" },
  ],
  caption: "涂装后的车身按 60 秒节拍走过 20 个工位：上线拆门、线束、隔音地毯、顶棚、玻璃、仪表空调、座舱饰件、座椅、车门回装、底盘预装、动力合装、落车、车轮保险杠、油液、电检、定位大灯、转毂、淋雨、驾驶辅助标定、商品化放行。门线、仪表台、内燃机与电池、悬架、前端在主线外侧分装。读数是当前工位和这个节拍里已经过去的秒数。合装那一站，车身落下与副车架对孔。",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="总装主线，方向键逐站前进" aria-valuemin="1" aria-valuemax="20" aria-valuenow="1">${livePage.svg}</div>`,
});

const htmlName = theme === "light" ? "final-assembly-light.html" : "final-assembly.html";
const svgName = theme === "light" ? "final-assembly-light.svg" : "final-assembly.svg";
writeFileSync(join(HERE, htmlName), k.pageHtml({ title: "总装车间", theme, body: plate, script: kitScript() + live, width: 1080 }));
writeFileSync(join(HERE, svgName), posterPage.svg);
console.log("wrote", htmlName, svgName, "live solids", livePage.solids, "poster solids", posterPage.solids);
