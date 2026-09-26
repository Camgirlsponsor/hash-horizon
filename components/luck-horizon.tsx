import type { Odds } from "@/lib/probability";
import { formatProbability } from "@/lib/probability";

export function LuckHorizon({ odds }: { odds: Odds }) {
  return (
    <section className="horizon" aria-labelledby="horizon-title">
      <div className="section-kicker">
        <span>Probability trail</span>
        <span>Poisson model</span>
      </div>
      <h2 id="horizon-title">Your luck horizon</h2>
      <div className="horizon-track">
        {odds.horizons.map((item, index) => {
          const visualFill = Math.max(0.018, Math.min(1, Math.pow(item.chance, 0.22)));
          return (
            <div className="horizon-stop" key={item.label}>
              <div
                className="chance-orbit"
                style={{ "--chance-fill": `${visualFill * 360}deg` } as React.CSSProperties}
                aria-hidden="true"
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <strong>{formatProbability(item.chance)}</strong>
              <small>{item.label}</small>
            </div>
          );
        })}
      </div>
      <p className="horizon-note">Ring fill uses a logarithmic scale so microscopic chances remain visible.</p>
    </section>
  );
}
