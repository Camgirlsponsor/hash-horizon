"use client";

import { HASH_UNITS, type HashUnit } from "@/lib/coins";

type Props = {
  hashrate: string;
  unit: HashUnit;
  watts: string;
  kwh: string;
  price: string;
  livePrice: number | null;
  ticker: string;
  onHashrateChange: (value: string) => void;
  onUnitChange: (unit: HashUnit) => void;
  onWattsChange: (value: string) => void;
  onKwhChange: (value: string) => void;
  onPriceChange: (value: string) => void;
};

function sanitize(value: string) {
  return value.replace(/[^0-9.eE+-]/g, "");
}

export function RigControls({
  hashrate,
  unit,
  watts,
  kwh,
  price,
  livePrice,
  ticker,
  onHashrateChange,
  onUnitChange,
  onWattsChange,
  onKwhChange,
  onPriceChange,
}: Props) {
  return (
    <div className="rig-controls">
      <div className="field field-hash">
        <label htmlFor="hashrate">Your hashrate</label>
        <div className="hash-input-row">
          <input
            id="hashrate"
            value={hashrate}
            onChange={(event) => onHashrateChange(sanitize(event.target.value))}
            inputMode="decimal"
            autoComplete="off"
          />
          <select aria-label="Hashrate unit" value={unit} onChange={(event) => onUnitChange(event.target.value as HashUnit)}>
            {HASH_UNITS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="watts">Miner power</label>
        <div className="unit-field">
          <input
            id="watts"
            value={watts}
            onChange={(event) => onWattsChange(sanitize(event.target.value))}
            inputMode="decimal"
            autoComplete="off"
          />
          <span>W</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="kwh">Electricity</label>
        <div className="unit-field">
          <input
            id="kwh"
            value={kwh}
            onChange={(event) => onKwhChange(sanitize(event.target.value))}
            inputMode="decimal"
            autoComplete="off"
          />
          <span>$/kWh</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="price">{ticker} price</label>
        <div className="unit-field">
          <input
            id="price"
            value={price}
            placeholder={livePrice != null ? livePrice.toString() : "USD"}
            onChange={(event) => onPriceChange(sanitize(event.target.value))}
            inputMode="decimal"
            autoComplete="off"
          />
          <span>USD</span>
        </div>
      </div>
    </div>
  );
}
