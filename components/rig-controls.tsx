"use client";

import { HASH_UNITS, type HashUnit } from "@/lib/coins";
import { toHashesPerSecond } from "@/lib/probability";

const PRESETS: { label: string; value: string; unit: HashUnit; watts: string }[] = [
  { label: "Bitaxe", value: "1", unit: "TH/s", watts: "18" },
  { label: "S9", value: "14", unit: "TH/s", watts: "1320" },
  { label: "S19", value: "95", unit: "TH/s", watts: "3250" },
  { label: "S21", value: "200", unit: "TH/s", watts: "3500" },
];

type Props = {
  hashrate: string;
  unit: HashUnit;
  miners: string;
  watts: string;
  uptime: string;
  kwh: string;
  price: string;
  hardware: string;
  poolFee: string;
  livePrice: number | null;
  ticker: string;
  onHashrateChange: (value: string) => void;
  onUnitChange: (unit: HashUnit) => void;
  onMinersChange: (value: string) => void;
  onWattsChange: (value: string) => void;
  onUptimeChange: (value: string) => void;
  onKwhChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onHardwareChange: (value: string) => void;
  onPoolFeeChange: (value: string) => void;
  onPreset: (preset: { value: string; unit: HashUnit; watts: string }) => void;
};

function sanitize(value: string) {
  return value.replace(/[^0-9.eE+-]/g, "");
}

export function RigControls({
  hashrate,
  unit,
  miners,
  watts,
  uptime,
  kwh,
  price,
  hardware,
  poolFee,
  livePrice,
  ticker,
  onHashrateChange,
  onUnitChange,
  onMinersChange,
  onWattsChange,
  onUptimeChange,
  onKwhChange,
  onPriceChange,
  onHardwareChange,
  onPoolFeeChange,
  onPreset,
}: Props) {
  const terahash = toHashesPerSecond(Number(hashrate), unit) / 1e12;
  const joulesPerTerahash = terahash > 0 && Number(watts) > 0 ? Number(watts) / terahash : null;

  return (
    <>
      <div className="preset-strip">
        <span>Typical miners</span>
        {PRESETS.map((preset) => {
          const active = hashrate === preset.value && unit === preset.unit && watts === preset.watts && miners === "1";
          return (
            <button key={preset.label} type="button" className={active ? "active" : ""} onClick={() => onPreset(preset)}>
              {preset.label}
            </button>
          );
        })}
      </div>
      <div className="rig-controls">
        <div className="field field-hash">
          <label htmlFor="hashrate">Hashrate each</label>
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
          <label htmlFor="miners">Miners</label>
          <div className="unit-field">
            <input
              id="miners"
              value={miners}
              onChange={(event) => onMinersChange(sanitize(event.target.value))}
              inputMode="decimal"
              autoComplete="off"
            />
            <span>×</span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="watts">Watts each</label>
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
          {joulesPerTerahash != null && (
            <p className="field-hint">{joulesPerTerahash.toLocaleString("en-US", { maximumFractionDigits: 1 })} J/TH</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="uptime">Uptime</label>
          <div className="unit-field">
            <input
              id="uptime"
              value={uptime}
              onChange={(event) => onUptimeChange(sanitize(event.target.value))}
              inputMode="decimal"
              autoComplete="off"
            />
            <span>%</span>
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

        <div className="field">
          <label htmlFor="hardware">Hardware cost</label>
          <div className="unit-field">
            <input
              id="hardware"
              value={hardware}
              placeholder="optional"
              onChange={(event) => onHardwareChange(sanitize(event.target.value))}
              inputMode="decimal"
              autoComplete="off"
            />
            <span>USD</span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="pool-fee">Pool fee</label>
          <div className="unit-field">
            <input
              id="pool-fee"
              value={poolFee}
              onChange={(event) => onPoolFeeChange(sanitize(event.target.value))}
              inputMode="decimal"
              autoComplete="off"
            />
            <span>%</span>
          </div>
        </div>
      </div>
    </>
  );
}
