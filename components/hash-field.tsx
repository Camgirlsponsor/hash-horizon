"use client";

import { motion, useReducedMotion } from "motion/react";

const NODES = [
  { x: 12, y: 22, r: 3.2, delay: 0 },
  { x: 28, y: 48, r: 2.4, delay: 0.4 },
  { x: 46, y: 18, r: 2.8, delay: 0.8 },
  { x: 62, y: 56, r: 3.6, delay: 0.2 },
  { x: 78, y: 28, r: 2.2, delay: 1.1 },
  { x: 88, y: 62, r: 2.9, delay: 0.6 },
  { x: 18, y: 72, r: 2.5, delay: 1.4 },
  { x: 54, y: 78, r: 3.1, delay: 0.9 },
];

const LINKS = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
  [2, 4],
  [3, 5],
  [1, 6],
  [3, 7],
  [4, 5],
  [6, 7],
];

export function HashField() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="hash-field" aria-hidden="true">
      <div className="hash-field-wash" />
      <svg className="hash-field-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        {LINKS.map(([a, b], index) => {
          const from = NODES[a];
          const to = NODES[b];
          return (
            <motion.line
              key={`link-${index}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className="hash-link"
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
              animate={reduceMotion ? undefined : { pathLength: 1, opacity: [0.15, 0.45, 0.2] }}
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 4.8, delay: index * 0.18, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
              }
            />
          );
        })}
        {NODES.map((node, index) => (
          <motion.circle
            key={`node-${index}`}
            cx={node.x}
            cy={node.y}
            r={node.r}
            className="hash-node"
            initial={reduceMotion ? false : { scale: 0.7, opacity: 0.35 }}
            animate={
              reduceMotion
                ? undefined
                : {
                    scale: [0.85, 1.15, 0.9],
                    opacity: [0.35, 0.9, 0.45],
                    cy: [node.y, node.y - 1.6, node.y + 0.8, node.y],
                  }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 5.5 + index * 0.25, delay: node.delay, repeat: Infinity, ease: "easeInOut" }
            }
          />
        ))}
      </svg>
      <motion.div
        className="hash-pulse"
        animate={reduceMotion ? undefined : { scale: [0.92, 1.08, 0.92], opacity: [0.18, 0.42, 0.18] }}
        transition={reduceMotion ? undefined : { duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="hash-ring"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={reduceMotion ? undefined : { duration: 48, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
