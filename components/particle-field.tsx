"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  life: number;
  speed: number;
  hueMix: number;
  bright: boolean;
};

function particleCount(width: number, height: number) {
  return Math.min(480, Math.max(90, Math.round((width * height) / 7000)));
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const surface = canvas;
    const paint = context;

    let width = 0;
    let height = 0;
    const mouse = { x: -9999, y: -9999 };
    const particles: Particle[] = [];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function spawn(particle: Particle) {
      particle.x = Math.random() * width;
      particle.y = Math.random() * height;
      particle.life = 200 + Math.random() * 400;
      particle.speed = 0.6 + Math.random() * 1.1;
      particle.hueMix = Math.random();
      particle.bright = Math.random() < 0.08;
      return particle;
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      surface.width = Math.floor(width * dpr);
      surface.height = Math.floor(height * dpr);
      paint.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint.globalCompositeOperation = "source-over";
      paint.fillStyle = "#070a14";
      paint.fillRect(0, 0, width, height);
      const target = particleCount(width, height);
      while (particles.length < target) {
        particles.push(spawn({ x: 0, y: 0, life: 0, speed: 0, hueMix: 0, bright: false }));
      }
      particles.length = target;
    }

    function fieldAngle(x: number, y: number, time: number) {
      return (
        Math.sin(y * 0.004 + time * 0.7) * 0.9 +
        Math.sin(x * 0.002 - time * 0.4) * 0.5 +
        Math.sin((x + y) * 0.0015 + time * 0.25) * 0.6
      );
    }

    function onMove(event: MouseEvent) {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    }

    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);

    if (reduceMotion) {
      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseleave", onLeave);
      };
    }

    const started = performance.now();
    let frameId = 0;

    function frame(now: number) {
      const time = (now - started) / 1000;
      paint.globalCompositeOperation = "source-over";
      paint.fillStyle = "rgba(7,10,20,0.085)";
      paint.fillRect(0, 0, width, height);
      paint.globalCompositeOperation = "lighter";

      for (const particle of particles) {
        const angle = fieldAngle(particle.x, particle.y, time);
        let vx = Math.cos(angle) * particle.speed + particle.speed * 0.7;
        let vy = Math.sin(angle) * particle.speed * 0.7;
        const dx = particle.x - mouse.x;
        const dy = particle.y - mouse.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < 32400) {
          const distance = Math.sqrt(distanceSquared) || 1;
          const force = ((180 - distance) / 180) * 2.2;
          vx += (dx / distance) * force;
          vy += (dy / distance) * force;
        }
        const nextX = particle.x + vx;
        const nextY = particle.y + vy;
        const mix = particle.hueMix;
        const red = Math.round(34 + mix * (168 - 34));
        const green = Math.round(211 + mix * (85 - 211));
        const blue = Math.round(238 + mix * (247 - 238));
        paint.strokeStyle = `rgba(${red},${green},${blue},${particle.bright ? 0.85 : 0.35})`;
        paint.lineWidth = particle.bright ? 2 : 1.2;
        paint.beginPath();
        paint.moveTo(particle.x, particle.y);
        paint.lineTo(nextX, nextY);
        paint.stroke();
        particle.x = nextX;
        particle.y = nextY;
        particle.life -= 1;
        if (
          particle.life <= 0 ||
          particle.x > width + 20 ||
          particle.x < -20 ||
          particle.y > height + 20 ||
          particle.y < -20
        ) {
          spawn(particle);
        }
      }

      frameId = requestAnimationFrame(frame);
    }

    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-field" aria-hidden="true" />;
}
