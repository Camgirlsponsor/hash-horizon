import { useEffect, useRef } from "react";

/** A small 16-bit palette. Stars and comets pick one color and keep it. */
const PALETTE = ["#f4f7ff", "#ffe566", "#7df9ff", "#ff6ad5", "#7dffb3", "#c4a1ff", "#ff9f43", "#9be7ff"];

type Shape = "dot" | "block" | "plus" | "diamond";

type Star = {
  x: number;
  y: number;
  speed: number;
  color: string;
  shape: Shape;
  blink: number;
};

type PlanetKind = "banded" | "ringed" | "crater" | "ocean" | "ember";

type Planet = {
  kind: PlanetKind;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  angle: number;
  speed: number;
  radius: number;
  pixel: number;
};

type Comet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  tail: number;
};

const PLANETS: Planet[] = [
  { kind: "banded", cx: 0.5, cy: 0.46, rx: 0.36, ry: 0.3, angle: 0.4, speed: 0.00115, radius: 44, pixel: 3 },
  { kind: "ringed", cx: 0.52, cy: 0.5, rx: 0.44, ry: 0.24, angle: 2.2, speed: -0.0017, radius: 30, pixel: 3 },
  { kind: "ocean", cx: 0.7, cy: 0.4, rx: 0.22, ry: 0.34, angle: 4.1, speed: 0.00145, radius: 26, pixel: 3 },
  { kind: "crater", cx: 0.28, cy: 0.62, rx: 0.2, ry: 0.26, angle: 1.3, speed: 0.0022, radius: 18, pixel: 2 },
  { kind: "ember", cx: 0.38, cy: 0.72, rx: 0.3, ry: 0.14, angle: 5.2, speed: 0.0028, radius: 13, pixel: 2 },
];

function starCount(width: number, height: number) {
  return Math.min(180, Math.max(56, Math.round((width * height) / 11000)));
}

function makeStar(width: number, height: number, anywhere: boolean): Star {
  const roll = Math.random();
  const shape: Shape = roll < 0.62 ? "dot" : roll < 0.82 ? "block" : roll < 0.94 ? "plus" : "diamond";
  return {
    x: Math.floor(Math.random() * width),
    y: anywhere ? Math.floor(Math.random() * height) : -8 - Math.floor(Math.random() * 24),
    speed: shape === "dot" ? 4 : shape === "block" ? 3 : 2,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    shape,
    blink: 8 + Math.floor(Math.random() * 48),
  };
}

function spawnComet(width: number, height: number): Comet {
  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  if (edge === 0) {
    x = Math.random() * width;
    y = -30;
  } else if (edge === 1) {
    x = width + 30;
    y = Math.random() * height;
  } else if (edge === 2) {
    x = Math.random() * width;
    y = height + 30;
  } else {
    x = -30;
    y = Math.random() * height;
  }
  const dx = width * (0.15 + Math.random() * 0.7) - x;
  const dy = height * (0.15 + Math.random() * 0.7) - y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = 1.5 + Math.random() * 1.5;
  const colors = PALETTE.filter((color) => color !== "#f4f7ff");
  return {
    x,
    y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    color: colors[Math.floor(Math.random() * colors.length)],
    tail: 16 + Math.floor(Math.random() * 14),
  };
}

function drawStar(ctx: CanvasRenderingContext2D, star: Star) {
  const { x, y, color } = star;
  ctx.fillStyle = color;
  if (star.shape === "dot") {
    ctx.fillRect(x, y, 2, 2);
  } else if (star.shape === "block") {
    ctx.fillRect(x, y, 4, 4);
  } else if (star.shape === "plus") {
    ctx.fillRect(x + 2, y, 2, 2);
    ctx.fillRect(x, y + 2, 2, 2);
    ctx.fillRect(x + 2, y + 2, 2, 2);
    ctx.fillRect(x + 4, y + 2, 2, 2);
    ctx.fillRect(x + 2, y + 4, 2, 2);
  } else {
    ctx.fillRect(x + 2, y, 2, 2);
    ctx.fillRect(x, y + 2, 2, 2);
    ctx.fillRect(x + 4, y + 2, 2, 2);
    ctx.fillRect(x + 2, y + 4, 2, 2);
  }
}

function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, pixel: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), pixel, pixel);
}

function paintDisk(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  pixel: number,
  colorAt: (dx: number, dy: number) => string | null,
) {
  for (let dy = -radius; dy <= radius; dy += pixel) {
    for (let dx = -radius; dx <= radius; dx += pixel) {
      const mx = dx + pixel / 2;
      const my = dy + pixel / 2;
      if (mx * mx + my * my > radius * radius) continue;
      const color = colorAt(mx, my);
      if (!color) continue;
      stamp(ctx, cx + dx, cy + dy, pixel, color);
    }
  }
}

function shade(dx: number, dy: number, radius: number, color: string, light: string, dark: string) {
  const nx = dx / radius;
  const ny = dy / radius;
  const edge = nx * nx + ny * ny;
  if (edge > 0.78) return dark;
  if (nx < -0.48 && ny < 0.05) return light;
  return color;
}

function drawRings(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  pixel: number,
  front: boolean,
) {
  const rx = radius * 1.75;
  const ry = radius * 0.42;
  for (let dy = -ry; dy <= ry; dy += pixel) {
    const onFront = dy >= -pixel;
    if (onFront !== front) continue;
    for (let dx = -rx; dx <= rx; dx += pixel) {
      const nx = dx / rx;
      const ny = dy / ry;
      const ellipse = nx * nx + ny * ny;
      if (ellipse > 1 || ellipse < 0.58) continue;
      if (dx * dx + dy * dy < radius * radius * 0.92) continue;
      const band = Math.abs(Math.round(dx / pixel)) % 4;
      stamp(ctx, cx + dx, cy + dy, pixel, band < 2 ? "#ffe566" : "#ff9f43");
    }
  }
}

function drawPlanet(ctx: CanvasRenderingContext2D, kind: PlanetKind, x: number, y: number, radius: number, pixel: number, tick: number) {
  if (kind === "ringed") drawRings(ctx, x, y, radius, pixel, false);

  if (kind === "banded") {
    const bands = ["#3a46c9", "#7df9ff", "#e8f4ff", "#ffe566", "#ff9f43", "#ff6ad5", "#c4a1ff", "#5eead4"];
    paintDisk(ctx, x, y, radius, pixel, (dx, dy) => {
      const spotX = dx - radius * 0.28;
      const spotY = dy - radius * 0.02;
      const spot = (spotX * spotX) / (radius * 0.24) ** 2 + (spotY * spotY) / (radius * 0.15) ** 2;
      if (spot <= 1) return shade(dx, dy, radius, "#ff6ad5", "#ffd0ef", "#c026d3");
      const band = bands[Math.floor((dy + radius) / (pixel * 2)) % bands.length];
      return shade(dx, dy, radius, band, "#f4f7ff", "#1e293b");
    });
    const orbit = tick * 0.012;
    const moonX = x + Math.cos(orbit) * (radius + 16);
    const moonY = y + Math.sin(orbit) * (radius * 0.55);
    drawPlanet(ctx, "crater", moonX, moonY, Math.max(7, radius * 0.22), pixel, tick);
  } else if (kind === "ringed") {
    paintDisk(ctx, x, y, radius, pixel, (dx, dy) => {
      const band = Math.floor((dy + radius) / (pixel * 3)) % 2 === 0 ? "#dbeafe" : "#9be7ff";
      return shade(dx, dy, radius, band, "#f8fbff", "#64748b");
    });
    drawRings(ctx, x, y, radius, pixel, true);
  } else if (kind === "crater") {
    const craters = [
      { x: -0.22, y: -0.28, r: 0.24 },
      { x: 0.3, y: 0.02, r: 0.18 },
      { x: -0.02, y: 0.34, r: 0.14 },
      { x: 0.08, y: -0.02, r: 0.09 },
    ];
    paintDisk(ctx, x, y, radius, pixel, (dx, dy) => {
      for (const crater of craters) {
        const cdx = dx - crater.x * radius;
        const cdy = dy - crater.y * radius;
        if (cdx * cdx + cdy * cdy <= (crater.r * radius) ** 2) {
          return shade(dx, dy, radius, "#64748b", "#94a3b8", "#334155");
        }
      }
      return shade(dx, dy, radius, "#cbd5e1", "#f4f7ff", "#475569");
    });
  } else if (kind === "ocean") {
    const shift = ((tick * 0.35) % (radius * 2)) - radius;
    const clouds = [
      { x: -0.15, y: -0.32, rx: 0.42, ry: 0.16 },
      { x: 0.28, y: 0.02, rx: 0.32, ry: 0.13 },
      { x: -0.05, y: 0.3, rx: 0.24, ry: 0.1 },
    ];
    paintDisk(ctx, x, y, radius, pixel, (dx, dy) => {
      const wrapped = (((dx + shift) % (radius * 2)) + radius * 2) % (radius * 2) - radius;
      for (const cloud of clouds) {
        const cdx = (wrapped - cloud.x * radius) / (cloud.rx * radius);
        const cdy = (dy - cloud.y * radius) / (cloud.ry * radius);
        if (cdx * cdx + cdy * cdy <= 1) return "#f4f7ff";
      }
      const sea = Math.floor((dy + radius) / (pixel * 2)) % 2 === 0 ? "#2563eb" : "#2bffc6";
      return shade(dx, dy, radius, sea, "#7df9ff", "#1e3a8a");
    });
  } else {
    paintDisk(ctx, x, y, radius, pixel, (dx, dy) => {
      const crack = Math.abs(dy - dx * 0.4) < pixel && dx > -radius * 0.2;
      if (crack) return "#7c2d12";
      return shade(dx, dy, radius, "#ff9f43", "#ffe566", "#9a3412");
    });
  }
}

function drawComet(ctx: CanvasRenderingContext2D, comet: Comet) {
  const mag = Math.hypot(comet.vx, comet.vy) || 1;
  const ux = comet.vx / mag;
  const uy = comet.vy / mag;
  const px = -uy;
  const py = ux;
  for (let i = comet.tail; i >= 1; i -= 1) {
    const step = i * 4;
    const size = i < 5 ? 4 : i < 12 ? 3 : 2;
    stamp(ctx, comet.x - ux * step, comet.y - uy * step, size, i % 3 === 0 ? "#f4f7ff" : comet.color);
    if (i % 2 === 0) {
      stamp(ctx, comet.x - ux * step + px * 3, comet.y - uy * step + py * 3, 2, comet.color);
    }
  }
  stamp(ctx, comet.x - 3, comet.y - 3, 2, comet.color);
  stamp(ctx, comet.x + 3, comet.y - 1, 2, comet.color);
  stamp(ctx, comet.x - 1, comet.y + 3, 2, comet.color);
  stamp(ctx, comet.x - 1, comet.y - 1, 4, "#f4f7ff");
}

export function FlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    const comets: Comet[] = [];
    let frameId = 0;
    let tick = 0;
    let running = true;
    let nextComet = 40;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      stars = Array.from({ length: starCount(width, height) }, () => makeStar(width, height, true));
    };

    const draw = () => {
      ctx.fillStyle = "#04060c";
      ctx.fillRect(0, 0, width, height);
      for (const star of stars) {
        if (!reduceMotion && tick % star.speed === 0) {
          star.y += 1;
          if (star.y > height + 6) {
            const next = makeStar(width, height, false);
            star.x = next.x;
            star.y = next.y;
            star.speed = next.speed;
            star.color = next.color;
            star.shape = next.shape;
            star.blink = next.blink;
          }
        }
        const phase = Math.floor(tick / star.blink) % 4;
        if (phase === 3 && star.shape === "dot") continue;
        drawStar(ctx, star);
      }

      const scale = Math.max(0.8, Math.min(1.4, Math.min(width, height) / 820));
      for (const planet of PLANETS) {
        const angle = planet.angle + (reduceMotion ? 0 : tick * planet.speed);
        const px = planet.cx * width + Math.cos(angle) * planet.rx * width;
        const py = planet.cy * height + Math.sin(angle) * planet.ry * height;
        drawPlanet(ctx, planet.kind, px, py, planet.radius * scale, planet.pixel, reduceMotion ? 0 : tick);
      }

      if (!reduceMotion) {
        if (tick >= nextComet && comets.length < 3) {
          comets.push(spawnComet(width, height));
          nextComet = tick + 160 + Math.floor(Math.random() * 200);
        }
        for (let i = comets.length - 1; i >= 0; i -= 1) {
          const comet = comets[i];
          comet.x += comet.vx;
          comet.y += comet.vy;
          const gone =
            comet.x < -160 || comet.x > width + 160 || comet.y < -160 || comet.y > height + 160;
          if (gone) comets.splice(i, 1);
          else drawComet(ctx, comet);
        }
      }
    };

    const frame = () => {
      if (!running) return;
      tick += 1;
      draw();
      frameId = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      const visible = document.visibilityState === "visible";
      if (visible && !running) {
        running = true;
        frameId = requestAnimationFrame(frame);
      } else if (!visible) {
        running = false;
        cancelAnimationFrame(frameId);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    if (reduceMotion) draw();
    else frameId = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="flow-bg" aria-hidden="true" />;
}
