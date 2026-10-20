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
const PITCH = 58;
const N = 20;
const X0 = 36;
const AZ = 50;
const EL = 24;

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
const LIVE_H = 780;
const POSTER_W = 1920;
const POSTER_H = 1080;

const hall = { x: -30, y: -86, w: X0 + N * PITCH + 200, d: 214, r: 10 };

function projection(mode) {
  const poster = mode === "poster";
  const scale = poster ? 16.4 : 16.2;
  const focus = poster ? [X0 + 12 * PITCH + 28, 11, 9] : [X0 + 28, 11, 9];
  const w = poster ? POSTER_W : LIVE_W;
  const h = poster ? POSTER_H : LIVE_H;
  const home = k.iso(focus, { origin: [0, 0], scale, azimuth: AZ, elevation: EL });
  return { origin: [w * 0.5 - home[0], h * 0.44 - home[1]], scale, azimuth: AZ, elevation: EL };
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
    const meridian = [[-half, radius * 0.55], [-half, radius], [half, radius], [half, radius * 0.55]];
    put(x, y, z, S(G.lathe(meridian, F, P, { steps: 14 }), { tone }));
  };
  const pipeSvg = (x, y, z, axis, length, radius, tone = "mid") => {
    const F = G.frameAlong([x, y, z], axis);
    const meridian = [[0, radius * 0.62], [0, radius], [length, radius], [length, radius * 0.62]];
    return S(G.lathe(meridian, F, P, { steps: 10 }), { tone });
  };
  const prismAt = (origin, axis, polygon, s0, s1, tone, lit = false) => {
    const ax = G.unit3(axis);
    const mid = (s0 + s1) / 2;
    put(
      origin[0] + ax[0] * mid,
      origin[1] + ax[1] * mid,
      origin[2] + ax[2] * mid,
      S(G.prismOf(G.frameAlong(origin, axis), polygon, s0, s1, P), { tone, lit }),
    );
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
  const ticks = k.topTicks(strip.x + 2, strip.x + strip.w - 2, PITCH / 4, 4, strip.y, 0.45, [0.14, 0.22], P);
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

  // Far colonnade and roof beams. The near side stays open so a column never stands in front of the car.
  for (let i = 0; i <= N; i += 4) {
    const x = X0 - 8 + i * PITCH;
    can(x, 112, 0, 2.4, 1.4, "lo", 16);
    can(x, 112, 1.4, 1.55, 42, "mid", 14);
    can(x, 112, 43.4, 2.3, 1.5, "mid", 14);
    can(x, -68, 0, 1.7, 1.1, "lo", 12);
    can(x, -68, 1.1, 1.05, 6.5, "mid", 12);
    const beam = plan(x - 1.05, 48, 2.1, 66, 0.35);
    put(x, 81, 44, S(k.slabOf(beam, 43.2, 1.35, P, 2, 0.25), { tone: "mid" }));
  }
  for (let i = 0; i < N; i += 4) {
    const x = X0 - 8 + i * PITCH;
    const far = plan(x, 110.8, PITCH * 4, 2.4, 0.3);
    put(x + PITCH * 2, 112, 44.2, S(k.slabOf(far, 43.4, 1.2, P, 2), { tone: "mid" }));
  }

  // EMS rail for doors and seats, far side of the deck.
  const rail = plan(X0 - 6, 30.2, N * PITCH + 12, 1.6, 0.3);
  put(rail.x + rail.w / 2, 31, 36, S(k.slabOf(rail, 35.2, 1.3, P, 2), { tone: "mid" }));
  for (let i = 0; i < N; i += 1) {
    const x = X0 + i * PITCH + PITCH / 2;
    can(x, 31, 28, 0.45, 7.2, "mid", 10);
  }
  const walk = plan(X0 - 8, -42, N * PITCH + 20, 9, 0.8);
  put(walk.x + walk.w / 2, -37, 0.2, S(k.slabOf(walk, 0, 0.35, P, 2), { tone: "lo", crease: "none" }) + groove(walk, 0.35, 0.7));

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

  function doorLeafSvg(x, y, z, tone = "hi") {
    const skin = plan(x, y, 0.62, 5.8, 0.16);
    const pane = plan(x + 0.18, y + 0.55, 0.28, 3.4, 0.08);
    return S(k.slabOf(skin, z, 8.4, P, 2, 0.12), { tone })
      + S(k.slabOf(pane, z + 3.5, 3.5, P, 2), { tone: "mid" })
      + S(k.cylinder(x + 0.48, y + 2.4, 0.2, z + 3.7, 0.55, P, 8), { tone: "lo" })
      + S(k.slabOf(plan(x - 0.15, y + 5.5, 1.35, 0.85, 0.16), z + 5.6, 1.15, P, 2), { tone: "mid" });
  }
  function doorPanel(x, y, z, tone = "hi") {
    put(x + 0.3, y + 2.9, z + 4.2, doorLeafSvg(x, y, z, tone));
  }
  function operator(x, y) {
    box(x - 0.45, y - 0.28, 0, 0.9, 0.56, 2.7, "mid");
    box(x - 0.7, y - 0.42, 2.7, 1.4, 0.84, 2.15, "hi");
    box(x - 1.45, y - 0.22, 3.15, 0.75, 0.44, 1.35, "mid");
    box(x + 0.7, y - 0.22, 3.15, 0.75, 0.44, 1.35, "mid");
    can(x, y, 4.85, 0.48, 0.95, "mid", 12);
  }
  function openRack(x, y, shelves) {
    const w = 12;
    const d = 4.2;
    const top = 1.4 + shelves * 1.7;
    for (const [dx, dy] of [[0, 0], [w, 0], [0, d], [w, d]]) can(x + dx, y + dy, 0, 0.28, top, "mid", 8);
    for (let s = 0; s < shelves; s += 1) {
      const tray = plan(x + 0.15, y + 0.15, w - 0.3, d - 0.3, 0.2);
      put(x + w / 2, y + d / 2, 1.5 + s * 1.7, S(k.slabOf(tray, 1.35 + s * 1.7, 0.22, P, 2), { tone: s % 2 ? "hi" : "lo", crease: "none" }));
    }
  }
  function engineBlock(x, y, z) {
    box(x, y, z, 9.2, 5.4, 3.8, "hi");
    box(x + 0.7, y + 0.55, z + 3.8, 6.4, 4.3, 1.45, "mid");
    for (const dx of [2.1, 4.0, 5.9]) can(x + dx, y + 2.7, z + 5.25, 0.42, 1.15, "lo", 8);
    box(x + 9.2, y + 0.7, z + 0.35, 4.4, 4.0, 2.9, "mid");
    disc(x - 0.15, y + 2.6, z + 2.0, [1, 0, 0], 1.35, 0.7, "mid");
    can(x + 3.2, y + 2.7, z + 6.4, 0.7, 1.5, "hi", 10);
  }
  function faceDots(x, y, z, cols, rows, gapX, gapZ) {
    const dots = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) dots.push(at([x + c * gapX, y, z + r * gapZ]));
    }
    return D(dots, { size: Math.max(0.55, P.scale * 0.11), tone: "lo" });
  }
  function boardDots(x, y, z, cols, rows, gapY, gapZ) {
    const dots = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) dots.push(at([x, y + c * gapY, z + r * gapZ]));
    }
    return D(dots, { size: Math.max(0.5, P.scale * 0.1), tone: "lo" });
  }
  function seatSvg(x, y, z) {
    return S(k.slabOf(plan(x, y, 3.6, 3.4, 0.35), z, 1.05, P, 2, 0.2), { tone: "hi" })
      + S(k.slabOf(plan(x + 0.25, y + 0.45, 0.7, 2.5, 0.18), z + 1.05, 3.3, P, 2), { tone: "hi" })
      + S(k.cylinder(x + 1.7, y + 1.7, 0.18, z + 1.05, 12, P, 8), { tone: "mid", crease: "none" });
  }

  // Main line, back stations first via the depth sort.
  for (let i = 0; i < N; i += 1) {
    const x = X0 + i * PITCH;
    const deck = plan(x + 0.7, 0.4, PITCH - 1.4, 23.2, 0.6);
    put(x + PITCH / 2, 12, 1.1, S(k.slabOf(deck, 0, 2.15, P, 3, 0.35), { tone: "mid" }) + groove(deck, 2.15, 0.9) + screws(deck, 2.15, 1.5));
    put(x + 18, 11, 8, `<g data-slot="${i}"></g>`);
    can(x + 4.2, -8.4, 0, 0.42, 7.2, "mid", 10);
    can(x + 4.2, -8.4, 7.2, 0.62, 0.7, "lo", 10);
    can(x + 4.2, -8.4, 8.4, 0.38, 0.85, "hi", 8);
    const lamp = plan(x + 3.5, -9.1, 1.4, 1.4, 0.25);
    put(x + 4.2, -8.4, 8.2, `<g data-andon="${i}">` + S(k.slabOf(lamp, 7.9, 0.45, P, 2), { tone: "mid" }) + `</g>`);
    operator(x + 48, -34);

    if (i === 0) {
      can(x + 10, 28, 0, 0.85, 1.2, "lo", 12);
      can(x + 10, 28, 1.2, 0.55, 14, "mid", 12);
      box(x + 8.4, 26.6, 15.2, 3.2, 2.6, 1.6, "hi");
      for (const dx of [16, 30]) {
        can(x + dx, 27.2, 2.15, 0.42, 14, "mid", 10);
        box(x + dx - 1.5, 26.2, 16.1, 3.1, 2.0, 0.7, "mid");
        can(x + dx, 27.2, 14.6, 0.28, 1.6, "hi", 8);
      }
      box(x + 20, -16, 0, 7, 4.2, 1.3, "lo");
      can(x + 22, -14.2, 1.3, 0.35, 3.4, "mid", 8);
      box(x + 21.1, -15.1, 4.6, 1.8, 1.5, 1.2, "hi");
    }
    if (i === 1) {
      const board = plan(x + 8, 25.4, 24, 1.1, 0.25);
      put(x + 20, 26, 9, S(k.slabOf(board, 3.2, 11, P, 2, 0.2), { tone: "mid" }) + faceDots(x + 10, 25.55, 4.6, 8, 4, 2.5, 2.1));
      can(x + 6, 30, 0, 1.6, 1.1, "lo", 14);
      disc(x + 6, 30, 4.2, [0, 1, 0], 3.1, 2.4, "hi");
      disc(x + 6, 30, 4.2, [0, 1, 0], 1.1, 2.6, "mid");
      openRack(x + 34, 24.5, 4);
      cart(x + 8, -18);
    }
    if (i === 2) {
      disc(x + 14, 31, 5.6, [0, 1, 0], 3.3, 8.5, "hi");
      disc(x + 26, 31, 6.4, [0, 1, 0], 2.6, 7.2, "mid");
      box(x + 10, 27.4, 0, 18, 2.2, 1.5, "lo");
      box(x + 11, 29.2, 1.5, 16, 4.6, 0.45, "hi");
      for (const dx of [12, 26]) can(x + dx, 28.2, 1.5, 0.35, 2.2, "mid", 8);
      cart(x + 6, -18);
    }
    if (i === 3) {
      can(x + 12, 26, 0, 0.45, 18, "mid", 10);
      can(x + 32, 26, 0, 0.45, 18, "mid", 10);
      prismAt([x + 22, 30, 16.5], [1, 0, 0], [[-6.2, 0.25], [6.2, 0.25], [5.3, 1.35], [0, 2.15], [-5.3, 1.35]], -8, 8, "hi");
      box(x + 16, 27.2, 17.6, 8, 4.2, 0.7, "mid");
      can(x + 18, 32, 18.2, 0.55, 1.3, "lo", 10);
      can(x + 24, 32, 18.2, 0.55, 1.3, "lo", 10);
    }
    if (i === 4) {
      can(x + 18, 34, 0, 2.4, 1.3, "lo", 16);
      can(x + 18, 34, 1.3, 1.35, 12.5, "mid", 14);
      can(x + 18, 34, 13.6, 1.9, 1.6, "hi", 14);
      const arm = `<g data-tool="glass">`
        + S(k.slabOf(plan(x + 16.6, 14.2, 2.8, 18.6, 0.35), 14.4, 1.35, P, 2, 0.25), { tone: "mid" })
        + S(k.cylinder(x + 18, 15.2, 0.72, 9.2, 5.4, P, 12), { tone: "mid", crease: "none" })
        + S(k.cylinder(x + 18, 15.2, 2.15, 8.15, 0.85, P, 16), { tone: "hi" })
        + [0, 1, 2].map((n) => S(k.cylinder(x + 16.6 + n * 1.4, 15.2, 0.28, 7.7, 0.55, P, 8), { tone: "lo" })).join("")
        + `</g>`;
      put(x + 18, 24, 12, arm);
      can(x + 8, 28, 0, 1.15, 3.6, "mid", 12);
      box(x + 6.2, 26.4, 3.6, 3.6, 3.2, 2.6, "lo");
      can(x + 8, 28, 6.2, 0.35, 2.4, "hi", 8);
    }
    if (i === 5) {
      const cradle = plan(x + 6, 25.2, 26, 9, 0.5);
      put(x + 19, 29.5, 1.4, S(k.slabOf(cradle, 0, 2.4, P, 3, 0.35), { tone: "mid" }) + screws(cradle, 2.4, 1.4));
      prismAt([x + 19, 29.2, 2.5], [1, 0, 0], [[-7.4, 0.2], [7.4, 0.2], [6.6, 2.5], [2.2, 4.1], [-2.2, 4.1], [-6.6, 2.5]], -9, 9, "hi");
      box(x + 12, 30.4, 5.4, 5.5, 1.6, 1.5, "mid");
      can(x + 22, 31.2, 6.6, 0.7, 0.8, "lo", 10);
      box(x + 8, -17, 0, 10, 4, 1.5, "lo");
      box(x + 9, -16.2, 1.5, 3.2, 2.4, 2.2, "hi");
    }
    if (i === 6) {
      openRack(x + 8, 25, 5);
      box(x + 22, 26.2, 2.4, 6.2, 2.4, 0.45, "hi");
      box(x + 22.4, 26.6, 2.85, 5.2, 1.5, 0.28, "mid");
      box(x + 30, 25.6, 4.2, 1.2, 3.4, 6.5, "hi");
      gun(x + 14, -15, 0);
    }
    if (i === 7) {
      can(x + 14, 33, 22, 0.4, 13, "mid", 8);
      can(x + 28, 33, 22, 0.4, 13, "mid", 8);
      const hook = `<g data-tool="seats">${seatSvg(x + 12, 26, 15.5)}${seatSvg(x + 20, 26.4, 15.2)}</g>`;
      put(x + 18, 28, 18, hook);
      gun(x + 36, 27, 2.15);
    }
    if (i === 8) {
      for (const dx of [8, 18, 28, 38]) {
        can(x + dx, 27, 2.15, 0.48, 7, "mid", 10);
        put(x + dx, 27, 8, doorLeafSvg(x + dx - 0.3, 24.6, 3.2));
      }
      gun(x + 16, -15, 0);
      gun(x + 34, -15, 0);
    }
    if (i === 9) {
      disc(x + 16, 30, 4.4, [1, 0, 0], 2.4, 11, "mid");
      disc(x + 16, 30, 4.4, [1, 0, 0], 0.7, 11.4, "lo");
      for (const dx of [8, 24]) can(x + dx, 27.5, 2.4, 0.4, 3.2, "mid", 8);
      box(x + 22, 26.2, 2.15, 16, 7.5, 1.15, "hi");
      put(x + 30, 30, 3.5, D(k.dotGrid(x + 23.2, 27, 6, 4, 2.1, 1.5, P), { size: Math.max(0.6, P.scale * 0.11), tone: "lo" }));
      put(x + 20, 14, 3.1, pipeSvg(x + 6, 12.4, 2.7, [1, 0, 0], 30, 0.28, "mid"));
      put(x + 20, 16.2, 3.3, pipeSvg(x + 6, 15.4, 2.9, [1, 0, 0], 30, 0.22, "lo"));
    }
    if (i === 10) {
      const bed = plan(x + 6, 25, 30, 12, 0.5);
      put(x + 21, 31, 1.1, S(k.slabOf(bed, 0, 1.8, P, 3, 0.3), { tone: "mid" }) + screws(bed, 1.8, 1.2));
      engineBlock(x + 8, 27.2, 1.9);
      box(x + 24, 27.4, 1.9, 10, 8.2, 1.15, "hi");
      put(x + 29, 31.5, 3.3, D(k.dotGrid(x + 25, 28.2, 4, 3, 2, 2.2, P), { size: Math.max(0.55, P.scale * 0.1), tone: "lo" }));
    }
    if (i === 11) {
      for (const [dx, dy] of [[3, 30], [52, 30], [3, -6], [52, -6]]) {
        const foot = plan(x + dx - 2.4, dy - 2.4, 4.8, 4.8, 0.45);
        put(x + dx, dy, 0.7, S(k.slabOf(foot, 0, 1.15, P, 3, 0.22), { tone: "lo" }) + screws(foot, 1.15, 0.7));
        can(x + dx, dy, 1.15, 1.2, 1.15, "mid", 14);
        can(x + dx, dy, 2.3, 0.7, 22.6, "mid", 14);
        can(x + dx, dy, 24.9, 1.4, 1.15, "hi", 14);
      }
      put(x + 27, 30, 25.6, S(k.slabOf(plan(x + 2, 29.2, 51, 1.7, 0.3), 24.9, 1.35, P, 2), { tone: "mid" }));
      put(x + 27, -6, 25.6, S(k.slabOf(plan(x + 2, -6.8, 51, 1.7, 0.3), 24.9, 1.35, P, 2), { tone: "mid" }));
      put(x + 27, 12, 25.8, S(k.slabOf(plan(x + 25.6, -6, 2.6, 36, 0.3), 25.1, 1.2, P, 2), { tone: "mid" }));
      const trolley = plan(x + 16, 9.6, 18, 4.6, 0.4);
      put(x + 25, 12, 24.6, S(k.slabOf(trolley, 23.6, 1.45, P, 3, 0.28), { tone: "hi" }) + screws(trolley, 25.05, 0.7));
      for (const dx of [18, 32]) {
        for (const dy of [10.4, 13.2]) can(x + dx, dy, 15.2, 0.16, 8.5, "hi", 8);
      }
      const stand = plan(x + 40, -16, 8, 5, 0.4);
      put(x + 44, -13.5, 2, S(k.slabOf(stand, 0, 3.2, P, 3, 0.3), { tone: "mid" }) + screws(stand, 3.2, 0.7));
      put(x + 44, -14.6, 5, S(k.slabOf(plan(x + 41.2, -15.2, 5.6, 0.45, 0.1), 3.4, 2.6, P, 2), { tone: "hi" }));
    }
    if (i === 12) {
      gun(x + 8, 28, 2.15);
      gun(x + 36, 28, 2.15);
      disc(x + 18, 30, 5.2, [0, 1, 0], 3.15, 2.2, "hi");
      can(x + 18, 30, 2.15, 0.45, 2.1, "mid", 8);
      box(x + 24, 26.4, 2.15, 12, 3.2, 2.4, "mid");
      box(x + 25.2, 26.8, 4.55, 9.4, 1.1, 1.6, "hi");
      for (const dx of [27, 33]) can(x + dx, 27.4, 4.7, 0.55, 1.3, "lo", 8);
    }
    if (i === 13) {
      const cab = plan(x + 2, -20, 10, 7, 0.5);
      put(x + 7, -16.5, 4, S(k.slabOf(cab, 0, 7.4, P, 3, 0.4), { tone: "mid" }) + groove(cab, 7.4, 0.7) + screws(cab, 7.4, 1.1));
      for (let n = 0; n < 4; n += 1) can(x + 4 + n * 1.7, -17.4, 7.4, 0.42, 1.5, "hi", 8);
      const nozzles = `<g data-tool="fill">`
        + [0, 1, 2, 3].map((n) => pipeSvg(x + 4 + n * 1.7, -14.2, 8.2, [0, 1, 0], 8, 0.22, n % 2 ? "hi" : "mid")).join("")
        + [0, 1, 2, 3].map((n) => S(k.cylinder(x + 4 + n * 1.7, -6.4, 0.32, 6.6, 1.7, P, 8), { tone: "hi", crease: "none" })).join("")
        + `</g>`;
      put(x + 7, -10, 8, nozzles);
      cart(x + 16, -20);
    }
    if (i === 14) {
      can(x + 12, -16, 0, 1.1, 1.2, "lo", 12);
      can(x + 12, -16, 1.2, 0.7, 8.5, "mid", 12);
      const screen = plan(x + 8.4, -16.7, 7.2, 0.55, 0.12);
      put(x + 12, -16.4, 8, S(k.slabOf(screen, 6.2, 4.2, P, 2), { tone: "hi" }) + L(k.planOutline(k.insetPlan(screen, 0.4), 10.4, P, 2), { tone: "faint" }));
      box(x + 9.2, -15.6, 1.2, 5.4, 3.2, 0.7, "lo");
      for (let n = 0; n < 5; n += 1) can(x + 10 + n * 0.8, -14.2, 1.9, 0.18, 0.35, "mid", 6);
      can(x + 28, 28, 0, 0.6, 9, "mid", 10);
      box(x + 26.2, 26.6, 9, 3.6, 2.8, 2.2, "hi");
    }
    if (i === 15) {
      for (const [dx, dy] of [[10, 28], [34, 28], [10, -8], [34, -8]]) {
        can(x + dx, dy, 0, 0.5, 9.5, "mid", 10);
        box(x + dx - 1.5, dy - 1.2, 9.5, 3, 2.4, 1.7, "hi");
        can(x + dx, dy, 11.2, 0.7, 0.6, "lo", 10);
      }
      box(x + 18, 30, 0, 8, 3.4, 6.2, "lo");
      const screen = plan(x + 19, 32.6, 6, 0.4, 0.1);
      put(x + 22, 32.8, 5, S(k.slabOf(screen, 3.2, 2.4, P, 2), { tone: "hi" }));
    }
    if (i === 16) {
      const pit = plan(x + 6, 3.2, 40, 16, 0.5);
      put(x + 26, 11, 2.3, L(k.planOutline(pit, 2.2, P, 3), { tone: "lo" }));
      disc(x + 14.4, 12, 3.15, [0, 1, 0], 1.25, 16, "mid");
      disc(x + 38.6, 12, 3.15, [0, 1, 0], 1.25, 16, "mid");
      box(x + 4, 2.4, 2.15, 2.4, 18, 2.2, "lo");
      box(x + 46, 2.4, 2.15, 2.4, 18, 2.2, "lo");
      can(x + 26, -12, 0, 0.7, 6, "mid", 10);
      box(x + 24.2, -13.2, 6, 3.6, 2.2, 2.4, "hi");
    }
    if (i === 17) {
      for (const [dx, dy] of [[4, 27], [46, 27], [4, -2], [46, -2]]) {
        can(x + dx, dy, 0, 0.7, 18, "mid", 10);
        can(x + dx, dy, 18, 1.15, 1.1, "lo", 10);
      }
      put(x + 25, 27, 18.4, S(k.slabOf(plan(x + 3.2, 26.3, 43.6, 1.4, 0.25), 17.8, 1.1, P, 2), { tone: "mid" }));
      put(x + 25, -2, 18.4, S(k.slabOf(plan(x + 3.2, -2.7, 43.6, 1.4, 0.25), 17.8, 1.1, P, 2), { tone: "mid" }));
      put(x + 25, 12, 18.6, pipeSvg(x + 8, 26.2, 17.2, [0, -1, 0], 28, 0.45, "mid"));
      for (let n = 0; n < 7; n += 1) can(x + 10 + n * 4.2, 24.4, 14.2, 0.22, 2.6, "hi", 8);
      const trench = plan(x + 10, 5, 28, 12, 0.4);
      put(x + 24, 11, 2.3, L(k.planOutline(trench, 2.2, P, 3), { tone: "lo" }));
    }
    if (i === 18) {
      for (const [dx, dy] of [[6, 2], [6, 12], [40, 6], [40, 16]]) {
        can(x + dx, dy, 2.15, 0.4, 7, "mid", 8);
        box(x + dx - 0.35, dy, 9.1, 0.7, 4.2, 7.4, "hi");
        put(x + dx, dy + 2, 12, boardDots(x + dx + 0.42, dy + 0.45, 10.3, 3, 4, 1.15, 1.35));
      }
      can(x + 22, 30, 0, 0.55, 6.5, "mid", 10);
      box(x + 19.6, 28.4, 6.5, 4.8, 3.2, 2.2, "mid");
      can(x + 22, 30, 8.7, 0.9, 0.7, "hi", 10);
    }
    if (i === 19) {
      can(x + 6, 28, 0, 0.75, 14, "mid", 10);
      can(x + 42, 28, 0, 0.75, 14, "mid", 10);
      put(x + 24, 28, 14.2, S(k.slabOf(plan(x + 5, 27.3, 38, 1.4, 0.3), 13.4, 1.15, P, 2), { tone: "mid" }));
      box(x + 14, 25.6, 12.2, 8, 5, 1.1, "hi");
      box(x + 8, -18, 0, 8, 4.5, 1.3, "hi");
      box(x + 17, -17.4, 0, 4.2, 3.4, 2.4, "mid");
      box(x + 22, -17.6, 0, 3.2, 2.6, 0.6, "lo");
    }
  }

  // Offline door line: regulator, glass, latch, mirror, seal on each leaf.
  for (let i = 0; i < 8; i += 1) {
    const x = X0 + i * PITCH + 6;
    const table = plan(x, 46, 18, 9, 0.5);
    put(x + 9, 50.5, 1.2, S(k.slabOf(table, 0, 2.3, P, 3, 0.3), { tone: "mid" }) + screws(table, 2.3, 1.3) + groove(table, 2.3, 0.6));
    doorPanel(x + 2.2, 47.2, 2.5);
    can(x + 8.5, 49.5, 2.3, 0.4, 3.4, "mid", 8);
    box(x + 10.2, 48.4, 2.3, 2.4, 1.5, 1.7, "lo");
    can(x + 13.4, 51.2, 2.3, 0.75, 0.7, "hi", 10);
    box(x + 5.5, 53.2, 2.2, 10, 0.55, 0.45, "mid");
    if (i % 2 === 0) gun(x + 14, 56, 2.3);
  }

  // IP island, powertrain island (ICE and battery), suspension, front end.
  {
    const x = X0 + 5 * PITCH;
    const bed = plan(x + 2, 60, 28, 14, 0.6);
    put(x + 16, 67, 1, S(k.slabOf(bed, 0, 1.8, P, 3, 0.3), { tone: "mid" }) + screws(bed, 1.8, 1.2));
    prismAt([x + 16, 66, 2], [1, 0, 0], [[-8, 0.2], [8, 0.2], [7.2, 2.6], [2.4, 4.3], [-2.4, 4.3], [-7.2, 2.6]], -10, 10, "hi");
    box(x + 10, 68.5, 5.2, 6, 1.8, 1.6, "mid");
    can(x + 20, 69.2, 6.4, 0.75, 0.9, "lo", 10);
  }
  {
    const x = X0 + 10 * PITCH;
    const bed = plan(x, 58, 34, 16, 0.6);
    put(x + 17, 66, 1, S(k.slabOf(bed, 0, 1.7, P, 3, 0.3), { tone: "mid" }) + screws(bed, 1.7, 1.1));
    engineBlock(x + 2, 61, 1.8);
    box(x + 20, 60.5, 1.8, 12, 11, 1.35, "hi");
    put(x + 26, 66, 3.4, D(k.dotGrid(x + 21.2, 61.4, 5, 4, 2.1, 2.3, P), { size: Math.max(0.55, P.scale * 0.1), tone: "lo" }));
    can(x + 24, 63, 3.15, 0.45, 1.1, "mid", 8);
  }
  {
    const x = X0 + 11 * PITCH + 2;
    const bed = plan(x, 60, 30, 14, 0.5);
    put(x + 15, 67, 0.9, S(k.slabOf(bed, 0, 1.5, P, 3, 0.25), { tone: "mid" }) + screws(bed, 1.5, 1));
    box(x + 3, 62.2, 1.5, 22, 1.5, 1.15, "hi");
    box(x + 3, 70, 1.5, 22, 1.5, 1.15, "hi");
    box(x + 4, 62.2, 1.7, 1.6, 9.3, 0.9, "mid");
    box(x + 20, 62.2, 1.7, 1.6, 9.3, 0.9, "mid");
    box(x + 8, 63.4, 1.7, 8, 1.1, 0.7, "lo");
    disc(x + 6, 61.4, 3.3, [0, 1, 0], 1.9, 0.55, "mid");
    disc(x + 6, 72.2, 3.3, [0, 1, 0], 1.9, 0.55, "mid");
    disc(x + 22, 61.4, 3.3, [0, 1, 0], 1.7, 0.5, "hi");
    disc(x + 22, 72.2, 3.3, [0, 1, 0], 1.7, 0.5, "hi");
    can(x + 14, 66.5, 2.6, 0.55, 1.2, "lo", 10);
  }
  {
    const x = X0 + 12 * PITCH + 4;
    const bed = plan(x, 60, 26, 12, 0.5);
    put(x + 13, 66, 1, S(k.slabOf(bed, 0, 1.8, P, 3, 0.3), { tone: "mid" }) + screws(bed, 1.8, 1));
    box(x + 3, 63.2, 1.8, 18, 2.2, 2.2, "hi");
    box(x + 4, 66.2, 1.8, 8, 4.2, 5.2, "mid");
    for (const dx of [5, 16]) {
      can(x + dx, 64.2, 4, 0.9, 1.5, "lo", 10);
      disc(x + dx, 64.2, 5.8, [1, 0, 0], 1.15, 0.6, "hi");
    }
  }

  // Door convoy on the EMS, parked at the head of the line until the car reaches station 8.
  {
    let hanging = "";
    for (let n = 0; n < 4; n += 1) {
      const x = X0 + 6 + n * 8;
      hanging += S(k.cylinder(x, 31, 0.32, 27, 8, P, 8), { tone: "mid", crease: "none" });
      hanging += doorLeafSvg(x - 0.3, 27.6, 18.5);
    }
    put(X0 + 18, 31, 24, `<g data-tool="doors">${hanging}</g>`);
  }

  const along = [1, 0, 0];
  const bodyAt = [0, 12, 2.25];
  function extrusion(polygon, s0, s1, tone, lit = false, crease = "faint") {
    return S(G.prismOf(G.frameAlong(bodyAt, along), polygon, s0, s1, P), { tone, lit, crease });
  }
  function meshSolid(rings, { sharp = 0.78, longCrease = [], seams = [], shuts = [] } = {}) {
    const V = G.viewOf(P);
    const Lt = G.lightOf(P);
    const nS = rings.length;
    const n = rings[0].length;
    const buckets = [[], [], [], [], []];
    const fills = [];
    const vis = Array.from({ length: nS - 1 }, () => Array(n).fill(false));
    const normals = Array.from({ length: nS - 1 }, () => Array(n));
    const atV = (i, j) => rings[i][((j % n) + n) % n];
    const faceVis = (i, j) => (i < 0 || i >= nS - 1 ? false : vis[i][((j % n) + n) % n]);
    for (let i = 0; i < nS - 1; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const a = atV(i, j);
        const b = atV(i, j + 1);
        const d = atV(i + 1, j);
        const c = atV(i + 1, j + 1);
        const normal = G.unit3(G.cross3(G.sub3(b, a), G.sub3(d, a)));
        normals[i][j] = normal;
        const visible = G.len3(G.cross3(G.sub3(b, a), G.sub3(d, a))) > 1e-4 && G.dot3(normal, V) > 0.012;
        vis[i][j] = visible;
        if (!visible) continue;
        const quad = k.pathOf([a, b, c, d].map((p) => k.iso(p, P)), true);
        fills.push(quad);
        buckets[Math.min(4, G.bandOf(G.dot3(normal, Lt)))].push(quad);
      }
    }
    const capVis = [false, false];
    [0, nS - 1].forEach((index, which) => {
      const ring = rings[index];
      let normal = [0, 0, 0];
      for (let j = 0; j < n; j += 1) {
        const a = ring[j];
        const b = ring[(j + 1) % n];
        normal[0] += (a[1] - b[1]) * (a[2] + b[2]);
        normal[1] += (a[2] - b[2]) * (a[0] + b[0]);
        normal[2] += (a[0] - b[0]) * (a[1] + b[1]);
      }
      normal = G.unit3(normal);
      const want = which === 0 ? -1 : 1;
      if (normal[0] * want < 0) normal = G.mul3(normal, -1);
      const visible = G.dot3(normal, V) > 0.012;
      capVis[which] = visible;
      if (!visible) return;
      const ordered = normal[0] * want < 0 ? ring : [...ring].reverse();
      const capPath = k.pathOf(ordered.map((p) => k.iso(p, P)), true);
      fills.push(capPath);
      buckets[Math.min(4, G.bandOf(G.dot3(normal, Lt)))].push(capPath);
    });
    const outlineParts = [];
    const stroke = (p, q) => {
      const d = k.pathOf([k.iso(p, P), k.iso(q, P)]);
      if (d) outlineParts.push(d);
    };
    for (let i = 0; i < nS - 1; i += 1) {
      for (let j = 0; j < n; j += 1) {
        if (faceVis(i, j) !== faceVis(i, j - 1)) stroke(atV(i, j), atV(i + 1, j));
      }
    }
    for (let i = 0; i < nS; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const left = i === 0 ? capVis[0] : faceVis(i - 1, j);
        const right = i === nS - 1 ? capVis[1] : faceVis(i, j);
        const p = atV(i, j);
        const q = atV(i, j + 1);
        if (left !== right && (i === 0 || i === nS - 1 || p[2] < 9.2 || q[2] < 9.2)) stroke(p, q);
      }
    }
    const outline = outlineParts.join("");
    let crease = "";
    const seg = (p, q) => {
      const d = k.pathOf([k.iso(p, P), k.iso(q, P)]);
      if (d) crease += d;
    };
    for (let i = 0; i < nS - 1; i += 1) {
      for (let j = 0; j < n; j += 1) {
        if (!faceVis(i, j) || !faceVis(i, j - 1)) continue;
        const turn = G.dot3(normals[i][j], normals[i][((j - 1) % n + n) % n]);
        const forced = longCrease.includes(((j % n) + n) % n);
        if (forced || turn < Math.cos(sharp)) seg(atV(i, j), atV(i + 1, j));
      }
    }
    for (const index of seams) {
      if (index <= 0 || index >= nS - 1) continue;
      for (let j = 0; j < n; j += 1) {
        const p = atV(index, j);
        const q = atV(index, j + 1);
        if (faceVis(index - 1, j) && faceVis(index, j) && (p[2] + q[2]) * 0.5 > 8.2 && Math.min(p[2], q[2]) < 13.2) seg(p, q);
      }
    }
    for (const shut of shuts) seg(shut[0], shut[1]);
    return {
      fill: fills.filter(Boolean).join(""),
      outline,
      crease,
      top: buckets[4].join(""),
      shades: buckets.slice(0, 4).map((list) => list.join("")),
      seamless: true,
    };
  }

  function roadWheel(x, y) {
    const outward = y < 12 ? -1 : 1;
    const cz = 5.35;
    const axis = [0, outward, 0];
    const F = G.frameAlong([x, y, cz], axis);
    const tire = [[-0.15, 1.7], [-0.05, 2.35, 1], [0.35, 3.02, 1], [0.85, 3.05, 1], [1.15, 2.25, 1], [1.22, 1.55]];
    const face = G.frameAlong([x, y, cz], axis);
    let spokes = "";
    const bolts = [];
    for (let n = 0; n < 5; n += 1) {
      const a = (n / 5) * Math.PI * 2 - 0.35;
      const radial = [Math.cos(a), 0, Math.sin(a)];
      spokes += S(G.prismOf(
        G.frameAlong([x + Math.cos(a) * 0.42, y + outward * 1.02, cz + Math.sin(a) * 0.42], radial),
        [[-0.07, -0.05], [0.07, -0.05], [0.07, 0.05], [-0.07, 0.05]],
        0.05,
        1.15,
        P,
      ), { tone: "hi", crease: "none" });
      bolts.push(at([x + Math.cos(a) * 0.72, y + outward * 1.08, cz + Math.sin(a) * 0.72]));
    }
    return S(G.lathe(tire, F, P, { steps: 36, smooth: { rows: 4 } }), { tone: "hi", crease: "none" })
      + S(G.lathe([[0.55, 1.72], [0.95, 2.02], [1.12, 1.35], [1.08, 0.42]], face, P, { steps: 28 }), { tone: "hi", crease: "none" })
      + spokes
      + S(G.lathe([[0.96, 0.16], [1.14, 0.34], [1.2, 0.12]], face, P, { steps: 14 }), { tone: "mid", crease: "none" })
      + D(bolts, { size: Math.max(1.15, P.scale * 0.055), tone: "hi" });
  }

  function carInner(amount, reactive, accent = true) {
    const show = (name, from, svg) => {
      const value = amount(from);
      if (!reactive && value < 0.5) return "";
      const style = reactive ? ` style="opacity:${value < 0.5 ? 0 : 1}"` : "";
      return `<g data-piece="${name}" data-from="${from}"${style}>${svg}</g>`;
    };
    const cy = 12;
    // x, rockerW, sideW, beltW, railW, zRocker, zSide, zBelt, zRail, zRoof, seam
    const raw = [
      [0.15, 6.3, 6.7, 6.85, 5.1, 4.7, 5.7, 6.9, 7.3, 7.55, 0],
      [1.6, 6.6, 7.2, 7.4, 5.4, 4.65, 6.2, 7.6, 8.05, 8.3, 0],
      [4.2, 6.9, 7.8, 8.0, 5.8, 4.6, 6.6, 8.7, 9.25, 9.6, 0],
      [6.6, 6.8, 8.05, 8.25, 6.0, 4.6, 6.7, 9.4, 9.9, 10.2, 0],
      [7.8, 6.6, 8.25, 8.4, 6.05, 4.6, 7.15, 9.6, 10.05, 10.35, 0],
      [8.6, 6.45, 8.4, 8.55, 6.1, 4.6, 7.7, 9.75, 10.2, 10.45, 0],
      [9.4, 6.3, 8.55, 8.65, 6.15, 4.6, 8.15, 9.9, 10.3, 10.55, 0],
      [10.2, 6.45, 8.4, 8.55, 6.1, 4.6, 7.7, 9.8, 10.25, 10.6, 0],
      [11.2, 6.65, 8.2, 8.4, 6.0, 4.6, 7.05, 9.7, 10.2, 10.7, 0],
      [13.4, 6.9, 8.0, 8.2, 5.9, 4.65, 6.55, 10.0, 10.7, 11.35, 0],
      [15.6, 7.0, 7.95, 8.15, 5.95, 4.65, 6.5, 10.4, 11.55, 12.6, 1],
      [17.5, 7.05, 7.85, 8.0, 5.5, 4.65, 6.5, 10.55, 12.8, 14.4, 0],
      [19.8, 7.1, 7.75, 7.9, 5.15, 4.65, 6.5, 10.5, 13.35, 15.2, 1],
      [24.4, 7.15, 7.7, 7.85, 5.05, 4.65, 6.5, 10.45, 13.3, 15.5, 0],
      [28.8, 7.15, 7.75, 7.9, 5.15, 4.65, 6.5, 10.4, 13.05, 15.25, 0],
      [31.2, 7.05, 7.85, 8.05, 5.45, 4.6, 6.5, 10.3, 12.4, 14.2, 1],
      [33.2, 6.95, 7.95, 8.15, 5.7, 4.55, 6.55, 10.05, 10.7, 11.15, 0],
      [35.4, 6.7, 8.2, 8.35, 5.9, 4.55, 7.15, 9.85, 10.45, 10.7, 0],
      [36.4, 6.5, 8.4, 8.5, 5.95, 4.55, 7.8, 9.75, 10.35, 10.55, 0],
      [37.2, 6.35, 8.55, 8.65, 6.0, 4.55, 8.15, 9.7, 10.3, 10.5, 0],
      [38.2, 6.5, 8.4, 8.5, 5.95, 4.5, 7.7, 9.6, 10.2, 10.4, 0],
      [40.4, 6.75, 8.15, 8.3, 5.9, 4.5, 6.7, 9.35, 9.9, 10.15, 0],
      [43.0, 6.6, 7.9, 8.05, 5.7, 4.45, 6.2, 8.9, 9.4, 9.6, 0],
      [45.2, 6.4, 7.6, 7.8, 5.5, 4.45, 5.8, 8.4, 8.9, 9.15, 0],
      [46.2, 6.2, 7.35, 7.55, 5.3, 4.5, 5.5, 7.9, 8.4, 8.7, 0],
    ];
    const ringOf = (row) => {
      const [x, rW, sW, bW, tW, zR, zS, zB, zT, zRoof] = row;
      const crown = 1.15;
      const belly = 3.35;
      return [
        [x, cy - belly, zR - 0.4],
        [x, cy - rW, zR],
        [x, cy - sW, zS],
        [x, cy - bW, zB],
        [x, cy - tW, zT],
        [x, cy - crown, zRoof],
        [x, cy + crown, zRoof],
        [x, cy + tW, zT],
        [x, cy + bW, zB],
        [x, cy + sW, zS],
        [x, cy + rW, zR],
        [x, cy + belly, zR - 0.4],
      ];
    };
    let rings = raw.map(ringOf);
    const probe = G.cross3(G.sub3(rings[8][3], rings[8][2]), G.sub3(rings[9][2], rings[8][2]));
    const flipped = probe[1] > 0;
    if (flipped) rings = rings.map((ring) => [...ring].reverse());
    const count = rings[0].length;
    const ix = (index) => (flipped ? count - 1 - index : index);
    const stations = [];
    const dense = [];
    for (let i = 0; i < rings.length - 1; i += 1) {
      dense.push(rings[i]);
      stations.push(raw[i]);
      dense.push(rings[i].map((point, n) => point.map((value, k) => (value + rings[i + 1][n][k]) * 0.5)));
      stations.push(raw[i].map((value, k) => (k === 10 ? 0 : (value + raw[i + 1][k]) * 0.5)));
    }
    dense.push(rings[rings.length - 1]);
    stations.push(raw[raw.length - 1]);
    rings = dense;
    const seamAt = stations.map((row, index) => (row[10] ? index : -1)).filter((index) => index > 0);
    const shuts = [];
    const sideFaces = (y) => (y < cy ? G.dot3([0, -1, 0], G.viewOf(P)) > 0.05 : G.dot3([0, 1, 0], G.viewOf(P)) > 0.05);
    for (const x of [16.4, 23.6, 31.4]) {
      let index = 0;
      while (index < stations.length - 2 && stations[index + 1][0] < x) index += 1;
      const t = (x - stations[index][0]) / (stations[index + 1][0] - stations[index][0] || 1);
      const mix = (a, b) => a.map((v, n) => v + (b[n] - v) * t);
      const left = mix(rings[index], rings[index + 1]);
      if (sideFaces(left[ix(2)][1])) shuts.push([left[ix(1)], left[ix(4)]]);
      if (sideFaces(left[ix(9)][1])) shuts.push([left[ix(10)], left[ix(7)]]);
    }
    const shellMesh = meshSolid(rings, { sharp: 1.15, longCrease: [3, 4, 7, 8].map(ix), seams: seamAt, shuts });
    const roof = stations.find((row) => row[0] > 24) || stations[12];
    let shell = S(shellMesh, { tone: "hi", crease: "hi" });
    shell += S(k.cylinder(26.4, cy, 0.1, roof[9], 0.7, P, 8), { tone: "hi", crease: "none" });
    shell += S(k.cylinder(26.4, cy, 0.18, roof[9] + 0.7, 0.16, P, 8), { tone: "mid", crease: "none" });
    const atX = (x) => {
      let index = 0;
      while (index < stations.length - 2 && stations[index + 1][0] < x) index += 1;
      const t = Math.min(1, Math.max(0, (x - stations[index][0]) / (stations[index + 1][0] - stations[index][0] || 1)));
      return rings[index].map((p, n) => p.map((v, k) => v + (rings[index + 1][n][k] - v) * t));
    };
    const glass = "";
    const nose = rings[0];
    const tail = rings[rings.length - 1];
    const lamp = (x, y, z, dir, len, r) => S(G.lathe([
      [0, r * 0.42],
      [len * 0.7, r, 1],
      [len, r * 0.2],
    ], G.frameAlong([x, y, z], dir), P, { steps: 14, smooth: { rows: 3 } }), { tone: "hi", lit: accent, crease: "none" });
    const fasciaZ = nose[ix(1)][2];
    const fasciaTop = nose[ix(3)][2] - 0.35;
    let grille = "";
    for (let i = 0; i < 5; i += 1) {
      const z = fasciaZ + 0.35 + i * ((fasciaTop - fasciaZ - 0.5) / 4);
      grille += S(k.slabOf(plan(nose[0][0] - 0.28, cy - 1.55, 0.16, 3.1, 0.03), z, 0.08, P, 2), { tone: "hi", crease: "none" });
    }
    grille += S(k.slabOf(plan(nose[0][0] - 0.12, cy - 0.7, 0.12, 1.4, 0.03), fasciaZ + 0.15, 0.32, P, 2), { tone: "mid", crease: "none" });
    const lamps = [-1, 1].map((side) => {
      const corner = nose[ix(side < 0 ? 2 : 9)];
      return lamp(corner[0] - 0.02, corner[1] - side * 0.15, corner[2] + 0.15, [-1, side * 0.2, 0], 0.55, 0.32);
    }).join("") + [-1, 1].map((side) => {
      const corner = tail[ix(side < 0 ? 3 : 8)];
      return lamp(corner[0] + 0.05, corner[1] - side * 0.2, corner[2] - 0.7, [1, 0, 0], 0.45, 0.28);
    }).join("");
    const bumper = grille + lamps;
    const mirrorHead = (x, y, z, outward) => S(k.slabOf(plan(x, y, 1.25, 0.7, 0.12), z, 0.48, P, 2), { tone: "hi", crease: "hi" })
      + S(G.lathe([[0, 0.08], [0.85, 0.1]], G.frameAlong([x + 0.35, y + (outward < 0 ? 0.7 : 0), z + 0.18], [0, outward, 0]), P, { steps: 8 }), { tone: "mid", crease: "none" });
    const handle = (x, y, z) => {
      const outward = y < cy ? -1 : 1;
      return S(G.lathe([[0, 0.1], [0.62, 0.13], [0.78, 0.05]], G.frameAlong([x, y, z], [0, outward, 0]), P, { steps: 10 }), { tone: "hi", crease: "none" });
    };
    const beltY = (x, side) => atX(x)[ix(side < 0 ? 3 : 8)];
    const mirrors = [-1, 1].map((side) => {
      const p = beltY(17.2, side);
      return mirrorHead(16.5, p[1] - side * 0.15, p[2] + 0.15, side);
    }).join("") + [20.6, 27.4].flatMap((x) => [-1, 1].map((side) => {
      const p = beltY(x, side);
      return handle(x, p[1] + side * 0.05, p[2] - 0.85);
    })).join("");
    const seats = extrusion([[-1.15, 6.4], [1.15, 6.4], [0.9, 8.6], [-0.9, 8.6]], 21.2, 23.4, "mid", false, "none")
      + extrusion([[-1.15, 6.4], [1.15, 6.4], [0.9, 8.6], [-0.9, 8.6]], 26.8, 28.6, "mid", false, "none");
    const chassis = S(k.slabOf(plan(7.2, 5.3, 28, 1.45, 0.3), 2.35, 1.7, P, 2), { tone: "mid" })
      + S(k.slabOf(plan(7.2, 17.25, 28, 1.45, 0.3), 2.35, 1.7, P, 2), { tone: "mid" })
      + S(k.slabOf(plan(8.6, 5.3, 1.55, 13.4, 0.3), 2.5, 1.45, P, 2), { tone: "mid" })
      + S(k.slabOf(plan(33.4, 5.3, 1.55, 13.4, 0.3), 2.5, 1.45, P, 2), { tone: "mid" })
      + S(k.slabOf(plan(11.5, 7.4, 9.5, 9.2, 0.4), 3.7, 2.6, P, 3, 0.3), { tone: "hi" })
      + S(k.cylinder(16.2, cy, 0.9, 6.25, 1.45, P, 12), { tone: "mid" })
      + [9.4, 37].flatMap((wx) => [5.05, 18.95].map((wy) => S(G.lathe([[-0.16, 0.45], [-0.16, 1.7], [0.16, 1.7], [0.16, 0.45]], G.frameAlong([wx, wy, 4.7], [0, 1, 0]), P, { steps: 16 }), { tone: "lo" }))).join("");
    const wheels = [9.4, 37].flatMap((x) => [4.95, 19.05].map((y) => roadWheel(x, y))).join("");
    const fluids = S(k.cylinder(12.2, 9.4, 0.42, 11.15, 0.5, P, 10), { tone: "hi" }) + S(k.cylinder(12.8, 11.6, 0.32, 11.2, 0.42, P, 8), { tone: "mid" });
    const lift = amount("drop");
    const liftMark = reactive ? " data-part=\"lift\"" : "";
    return [
      show("chassis", 10, chassis),
      show("wheels", 12, wheels),
      `<g${liftMark} transform="${k.translateAlong(P, [0, 0, lift])}">`,
      show("seats", 7, seats),
      show("shell", -1, shell),
      show("glass", 4, glass),
      show("doors", 8, mirrors),
      show("bumper", 12, bumper),
      show("fluids", 13, fluids),
      `</g>`,
    ].join("");
  }

  const amountOf = (station, u) => (from) => {
    if (from === "drop") {
      if (station !== 11) return 0;
      return (1 - u) * 7;
    }
    if (from < 0) return 1;
    if (station > from) return 1;
    if (station < from) return 0;
    return u;
  };

  if (mode === "live") {
    const initial = (from) => (from === "drop" || from < 0 ? (from === "drop" ? 0 : 1) : 0);
    const car = `<g data-part="car" transform="${k.translateAlong(P, [X0 + 5, 0, 0])}">${carInner(initial, true)}</g>`;
    put(X0 + 18, 11, 8, car);
  } else {
    const station = 12;
    const u = 0.7;
    const car = `<g data-part="poster-car" transform="${k.translateAlong(P, [X0 + station * PITCH + 5, 0, 0])}">${carInner(amountOf(station, u), false)}</g>`;
    put(X0 + station * PITCH + 18, 11, 10, car);
  }

  // Painted-body store: three shells on skids, parallel to the first bays.
  for (let n = 0; n < 3; n += 1) {
    const x = X0 + 6 + n * 52;
    const y = 84;
    const bare = (from) => (from < 0 ? 1 : 0);
    box(x + 1, y + 6.5, 0, 42, 11, 2.4, "lo");
    put(x + 20, y + 12, 6, `<g transform="${k.translateAlong(P, [x, y, -2.4])}">${carInner(bare, false, false)}</g>`);
  }

  // Two finished cars in shipping, and one in the repair spur with the hood stood up.
  for (let n = 0; n < 2; n += 1) {
    const x = X0 + N * PITCH + 8 + n * 48;
    const parked = (from) => (from === "drop" ? 0 : 1);
    box(x + 1, 5, 0, 44, 14, 1.5, "lo");
    const done = carInner(parked, false, false);
    put(x + 16, 8, 8, `<g transform="${k.translateAlong(P, [x, 0, 0])}">${done}</g>`);
  }
  {
    const x = X0 + 19 * PITCH + 6;
    const y = -52;
    box(x, y + 4, 0, 44, 16, 1.4, "lo");
    const parked = (from) => (from === "drop" ? 0 : 1);
    const done = carInner(parked, false, false);
    put(x + 16, y + 4, 6, `<g transform="${k.translateAlong(P, [x, y, 0])}">${done}${S(k.slabOf(plan(4, 7.2, 8, 0.45, 0.12), 8.6, 5.2, P, 2), { tone: "hi" })}</g>`);
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
const home = iso([X0 + 28, 11, 9], P);
let shown = 12.7;
let target = 12.7;
let frame = 0;
let last = 0;
let clock = 12.7 * 2.7;
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
  const drop = station === 11 ? (1 - u) * 7 : 0;
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
  const focus = iso([X0 + shown * PITCH + 28, 11, 9], P);
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
stage.style.touchAction = "none";
const scrub = (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp((event.clientX - box.left) / box.width, 0, 0.999);
  steer(share * 20);
};
stage.addEventListener("pointerdown", (event) => {
  if (stage.setPointerCapture) stage.setPointerCapture(event.pointerId);
  scrub(event);
});
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse" && event.buttons === 0) return;
  scrub(event);
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
  hint: "手指左右拖，沿节拍走完全线",
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
