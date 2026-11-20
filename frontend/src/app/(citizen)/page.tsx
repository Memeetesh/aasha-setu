"use client";

import Link from "next/link";
import { Icon, getRiskColor, getRiskLabel, getRiskDot } from "@/components/citizen/Icon";
import { LineChart } from "@/components/citizen/Charts";
import { riskCards as mockRiskCards, riverCourseData } from "@/data/citizen-mock";
import { useLocation } from "@/hooks/useLocation";
import {
  useAlerts,
  useCycloneForecast,
  useFloodForecast,
  useLandslideForecast,
  useNearbyPlaces,
  useNearestShelters,
  useRainfallForecast,
  useRiskMap,
} from "@/lib/queries";
import { alertRelativeTime, alertSourceLabel, topAlert } from "@/lib/alerts";
import { pointInPolygon } from "@/lib/geo";
import type { RiskMapResponse, RiskZoneProperties } from "@/types";
import type { RiskCard, CitizenRiskLevel } from "@/types/citizen-ui";

function relativeTime(ms: number): string {
  if (!ms) return "—";
  const secs = Math.round((Date.now() - ms) / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

const riskChartColors: Record<string, string> = {
  low: "#22c55e",
  moderate: "#f59e0b",
  high: "#ef4444",
  critical: "#dc2626",
};

function findZoneForLocation(riskMap: RiskMapResponse, lat: number, lon: number): RiskZoneProperties | null {
  for (const feature of riskMap.features) {
    if (pointInPolygon(lat, lon, feature.geometry.coordinates[0])) return feature.properties;
  }
  return null;
}

// The risk engine's 5-band scale (low/moderate/high/very_high/critical)
// collapses onto the citizen UI's 4-band scale (very_high -> critical) —
// the dashboard keeps the full 5-band detail, this view doesn't need it.
function toCitizenLevel(category: string): CitizenRiskLevel {
  if (category === "very_high" || category === "critical") return "critical";
  if (category === "low" || category === "moderate" || category === "high") return category;
  return "moderate";
}

export default function HomePage() {
  const location = useLocation();

  // Realtime (src/lib/realtime.tsx) invalidates these on `risk.updated` /
  // `alert.*`, so the flood card, shelter list, and alert banner stay live.
  // On error the page still renders — it falls back to the demo risk cards.
  // If the browser denies / can't resolve geolocation (common on a laptop
  // on stage), fall back to NEXT_PUBLIC_DEMO_LAT/LON so the cards still show
  // real, location-based forecasts.
  const demoLat = Number(process.env.NEXT_PUBLIC_DEMO_LAT) || null;
  const demoLon = Number(process.env.NEXT_PUBLIC_DEMO_LON) || null;
  const lat = location.status === "ok" ? location.lat : demoLat;
  const lon = location.status === "ok" ? location.lon : demoLon;

  const riskMapQuery = useRiskMap();
  const alertsQuery = useAlerts();
  const sheltersQuery = useNearestShelters(lat, lon, 3);
  const rainfallQuery = useRainfallForecast(lat, lon);
  const floodQuery = useFloodForecast(lat, lon);
  const cycloneQuery = useCycloneForecast(lat, lon);
  const landslideQuery = useLandslideForecast(lat, lon);
  const riskMap: RiskMapResponse | null = riskMapQuery.data ?? null;
  const activeAlert = topAlert(alertsQuery.data ?? []);
  const appShelters = sheltersQuery.data ?? [];
  const appSheltersNear = appShelters.filter((s) => s.distance_km <= 25);
  // Only reach out to OpenStreetMap when there aren't enough registered
  // relief shelters near the user.
  const osmSheltersQuery = useNearbyPlaces(lat, lon, "shelter", {
    radiusKm: 15,
    limit: 4,
    enabled: appSheltersNear.length < 3,
  });
  const osmShelters = osmSheltersQuery.data ?? [];
  const rainfall = rainfallQuery.data ?? null;
  const flood = floodQuery.data ?? null;
  const cyclone = cycloneQuery.data ?? null;
  const landslide = landslideQuery.data ?? null;

  const currentZone =
    riskMap && location.status === "ok" ? findZoneForLocation(riskMap, location.lat, location.lon) : null;

  // Every card is now a live location forecast: "Flood" = seeded risk-zone
  // score where it exists (simulator-aware) else GloFAS discharge; "Rainfall"
  // / "Cyclone" / "Landslide" = Open-Meteo-derived indicators.
  const riskCards: RiskCard[] = mockRiskCards.map((card) => {
    if (card.id === "flood" && currentZone) {
      return {
        ...card,
        level: toCitizenLevel(currentZone.risk_category),
        probability: Math.round(currentZone.risk_score),
        recommendation:
          currentZone.risk_category === "low"
            ? "No action needed"
            : currentZone.risk_category === "moderate"
              ? "Stay alert"
              : "Be prepared",
      };
    }
    if (card.id === "flood" && flood) {
      return {
        ...card,
        level: flood.level,
        probability: flood.flood_risk_score,
        recommendation: flood.recommendation,
        trend: flood.trend.length > 1 ? flood.trend : card.trend,
      };
    }
    if (card.id === "rainfall" && rainfall) {
      return {
        ...card,
        level: rainfall.level,
        probability: rainfall.probability,
        recommendation: rainfall.recommendation,
        trend: rainfall.trend.length > 1 ? rainfall.trend : card.trend,
      };
    }
    if (card.id === "cyclone" && cyclone) {
      return {
        ...card,
        level: cyclone.level,
        probability: cyclone.cyclone_risk_score,
        recommendation: cyclone.recommendation,
        trend: cyclone.trend.length > 1 ? cyclone.trend : card.trend,
      };
    }
    if (card.id === "landslide" && landslide) {
      return {
        ...card,
        level: landslide.level,
        probability: landslide.landslide_risk_score,
        recommendation: landslide.recommendation,
        trend: landslide.trend.length > 1 ? landslide.trend : card.trend,
      };
    }
    return card;
  });

  const liveCardIds = new Set<string>();
  if (currentZone || flood) liveCardIds.add("flood");
  if (rainfall) liveCardIds.add("rainfall");
  if (cyclone) liveCardIds.add("cyclone");
  if (landslide) liveCardIds.add("landslide");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl bg-navy-900 p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white">Your area today</h1>
            <p className="text-sm text-navy-200 mt-2">Live forecasts, alerts and shelters for where you are</p>
          </div>
          {riskMapQuery.dataUpdatedAt > 0 && (
            <div className="flex items-center gap-2 text-xs text-navy-200 bg-white/10 px-3 py-2 rounded-lg self-start sm:self-end">
              <Icon name="Clock" className="w-3.5 h-3.5" />
              <span>Updated <span className="font-mono">{relativeTime(riskMapQuery.dataUpdatedAt)}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Live area-wide alert — most severe active alert from GET /alerts */}
      {activeAlert && (
        <Link
          href="/support"
          className="w-full group block rounded-2xl border border-danger-200 bg-danger-50 hover:bg-danger-100/60 transition-colors text-left"
        >
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-danger-600 flex items-center justify-center flex-shrink-0">
              <Icon name="AlertTriangle" className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="badge bg-white text-danger-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger-600" />
                  {activeAlert.severity.charAt(0).toUpperCase() + activeAlert.severity.slice(1).replace("_", " ")}
                </span>
                <span className="text-xs text-danger-700/80">
                  {alertSourceLabel(activeAlert.source)} · {alertRelativeTime(activeAlert.issued_at)}
                </span>
              </div>
              <p className="text-sm font-semibold text-danger-800 line-clamp-2">{activeAlert.message}</p>
              <p className="text-xs text-danger-700/80 mt-1">See all authority messages</p>
            </div>
            <Icon name="ChevronRight" className="w-5 h-5 text-danger-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </div>
        </Link>
      )}

      <section>
        <h2 className="text-base font-semibold text-navy-900 mb-3">Risk and forecasts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {riskCards.map((card, idx) => {
            const rc = getRiskColor(card.level);
            const chartColor = riskChartColors[card.level] ?? "#3d5da0";
            const isLive = liveCardIds.has(card.id);
            const rainfallLive = card.id === "rainfall" && rainfall ? rainfall : null;
            const cycloneLive = card.id === "cyclone" && cyclone ? cyclone : null;
            const landslideLive = card.id === "landslide" && landslide ? landslide : null;
            const floodLive = card.id === "flood" && !currentZone && flood ? flood : null;
            let metric = "chance";
            if (card.id === "flood") {
              metric = currentZone
                ? "risk score"
                : floodLive?.anomaly_ratio != null
                  ? `peak ${floodLive.anomaly_ratio}× normal`
                  : floodLive
                    ? "no major river nearby"
                    : "risk score";
            }
            return (
              <div key={card.id} className={`card p-5 stagger-${Math.min(idx + 1, 4)}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate2-100 flex items-center justify-center">
                    <Icon name={card.icon} className="w-5 h-5 text-slate2-600" strokeWidth={1.75} />
                  </div>
                  <span className={`badge ${rc.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getRiskDot(card.level)}`} />
                    {getRiskLabel(card.level)}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-navy-900 mb-2 flex items-center gap-1.5">
                  {card.title}
                  {isLive && <span className="text-xs font-normal font-mono text-slate2-400">live</span>}
                </h3>
                <div className="flex items-baseline gap-1.5 mb-3">
                  {rainfallLive ? (
                    <>
                      <span className="text-3xl font-semibold text-navy-900 tabular-nums">{rainfallLive.rain_24h_mm}</span>
                      <span className="text-xs text-slate2-500">
                        mm next 24h · {rainfallLive.probability}% chance
                      </span>
                    </>
                  ) : cycloneLive ? (
                    <>
                      <span className="text-3xl font-semibold text-navy-900 tabular-nums">
                        {Math.round(cycloneLive.peak_gust_kmh)}
                      </span>
                      <span className="text-xs text-slate2-500">
                        km/h peak gusts
                        {cycloneLive.min_pressure_hpa != null &&
                          ` · min ${Math.round(cycloneLive.min_pressure_hpa)} hPa`}
                      </span>
                    </>
                  ) : landslideLive ? (
                    <>
                      <span className="text-3xl font-semibold text-navy-900 tabular-nums">
                        {landslideLive.landslide_risk_score}%
                      </span>
                      <span className="text-xs text-slate2-500">
                        {landslideLive.slope_degrees < 6
                          ? "flat terrain"
                          : `slope ${Math.round(landslideLive.slope_degrees)}° · ${Math.round(
                              landslideLive.rain_trigger_mm
                            )} mm rain`}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-semibold text-navy-900 tabular-nums">{card.probability}%</span>
                      <span className="text-xs text-slate2-500">{isLive ? metric : "chance"}</span>
                    </>
                  )}
                </div>
                <div className="mb-3">
                  <LineChart data={card.trend} color={chartColor} height={44} />
                </div>
                <p className="text-xs text-slate2-600">{card.recommendation}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-navy-900 mb-3">Nearby shelters</h2>
        {appSheltersNear.length === 0 && osmShelters.length === 0 ? (
          <div className="card p-6 text-sm text-slate2-500">
            {location.status !== "ok"
              ? "Waiting for your location…"
              : sheltersQuery.isLoading || osmSheltersQuery.isLoading
                ? "Finding shelters near you…"
                : "No shelters found near your location."}
          </div>
        ) : (
          <div className="space-y-4">
            {appSheltersNear.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {appSheltersNear.map((s) => (
                  <div key={s.id} className="card p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-navy-900">{s.name}</p>
                      <span className="text-xs font-mono text-slate2-500">{s.distance_km.toFixed(1)} km</span>
                    </div>
                    <p className="text-xs text-slate2-500">
                      {s.occupied}/{s.capacity} occupied · {s.accessibility?.replace(/_/g, " ") ?? "accessibility unknown"} · {s.status}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {osmShelters.length > 0 && (
              <div>
                <p className="text-xs text-slate2-500 mb-2">Other nearby shelters · OpenStreetMap</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {osmShelters.map((p, i) => (
                    <a
                      key={`${p.name}-${i}`}
                      href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card card-hover p-5 block"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-navy-900">{p.name}</p>
                        <span className="text-xs font-mono text-slate2-500">{p.distance_km.toFixed(1)} km</span>
                      </div>
                      <p className="text-xs text-slate2-500">{p.address ?? "Tap to open in maps"}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="text-base font-semibold text-navy-900">River discharge</h2>
          <span className="text-xs text-slate2-500">GloFAS forecast</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {location.status !== "ok" ? (
            <div className="card p-6 text-sm text-slate2-500">Waiting for your location…</div>
          ) : !flood ? (
            <div className="card p-6 text-sm text-slate2-500">Loading river data…</div>
          ) : flood.anomaly_ratio === null ? (
            <div className="card p-6 text-sm text-slate2-500">
              No major river modelled near your location, so there is no discharge signal to show here.
            </div>
          ) : (
            (() => {
              const rc = getRiskColor(flood.level);
              const label =
                flood.level === "low"
                  ? "Near normal"
                  : flood.level === "moderate"
                    ? "Above normal"
                    : flood.level === "high"
                      ? "High flow"
                      : "Very high flow";
              return (
                <div className="card p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate2-100 flex items-center justify-center">
                        <Icon name="Waves" className="w-5 h-5 text-slate2-600" strokeWidth={1.75} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-navy-900">Nearest river reach</h3>
                        <p className="text-xs text-slate2-500">Copernicus GloFAS river-discharge model</p>
                      </div>
                    </div>
                    <span className={`badge ${rc.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getRiskDot(flood.level)}`} />
                      {label}
                    </span>
                  </div>
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-semibold text-navy-900 tabular-nums">
                          {Math.round(flood.current_discharge_m3s).toLocaleString()}
                        </span>
                        <span className="text-lg text-slate2-400">m³/s</span>
                      </div>
                      <p className="text-xs text-slate2-500 mt-0.5">current flow</p>
                    </div>
                    <div className="text-right space-y-1 text-xs">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate2-300" />
                        <span className="text-slate2-500">
                          Normal: {Math.round(flood.baseline_discharge_m3s).toLocaleString()} m³/s
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-danger-500" />
                        <span className="text-danger-600 font-medium">
                          Forecast peak: {Math.round(flood.forecast_peak_m3s).toLocaleString()} m³/s (
                          {flood.anomaly_ratio}× normal)
                        </span>
                      </div>
                    </div>
                  </div>
                  <LineChart data={flood.trend} color="#5a7bb8" height={70} showArea showDots />
                  <p className="mt-3 text-xs text-slate2-600">{flood.recommendation}</p>
                </div>
              );
            })()
          )}

          <div className="card p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate2-100 flex items-center justify-center">
                  <Icon name="MapPinned" className="w-5 h-5 text-slate2-600" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-navy-900">River course change</h3>
                  <p className="text-xs text-slate2-500 flex items-center gap-1.5">
                    Satellite course-shift monitoring
                    <span className="text-slate2-400">· sample data</span>
                  </p>
                </div>
              </div>
              <span className="badge bg-slate2-100 text-slate2-700">
                <span className="w-1.5 h-1.5 rounded-full bg-safe-500" />
                {riverCourseData.detail}
              </span>
            </div>
            <div className="relative h-36 rounded-xl bg-slate2-50 map-grid overflow-hidden mb-4 border border-slate2-100">
              <svg viewBox="0 0 200 100" className="w-full h-full">
                <path d="M 20 15 Q 60 30 100 50 Q 140 70 180 85" stroke="#5a7bb8" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
                <circle cx="60" cy="30" r="3" fill="#22c55e" />
                <circle cx="140" cy="70" r="3" fill="#22c55e" />
                <circle cx="100" cy="50" r="3" fill="#22c55e" />
              </svg>
              <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate2-100">
                <Icon name="CheckCircle2" className="w-3.5 h-3.5 text-safe-500" />
                <span className="text-[11px] font-medium text-navy-700">No change detected</span>
              </div>
            </div>
            <p className="text-sm text-slate2-600">{riverCourseData.label}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
