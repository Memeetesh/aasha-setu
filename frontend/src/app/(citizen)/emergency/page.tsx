"use client";

import { useState } from "react";
import { Icon } from "@/components/citizen/Icon";
import { SOSModal } from "@/components/citizen/SOSModal";
import { emergencyQuickActions } from "@/data/citizen-mock";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useLocation } from "@/hooks/useLocation";
import { useCheckIn, useMyCheckIn, useNearbyPlaces, useNearestShelters } from "@/lib/queries";
import { alertRelativeTime } from "@/lib/alerts";
import { downloadOfflineMap, type OfflineMapPlace } from "@/lib/offline-map";

function openOnMap(place: { latitude: number; longitude: number }): void {
  const { latitude: lat, longitude: lon } = place;
  window.open(
    `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`,
    "_blank",
    "noopener,noreferrer"
  );
}

export default function EmergencyPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();
  const [sosOpen, setSosOpen] = useState(false);

  const lat = location.status === "ok" ? location.lat : null;
  const lon = location.status === "ok" ? location.lon : null;
  const { data: appShelters = [] } = useNearestShelters(lat, lon, 5);
  const { data: hospitals = [], isLoading: hospitalsLoading } = useNearbyPlaces(lat, lon, "hospital", {
    radiusKm: 12,
    limit: 5,
  });
  const appSheltersNear = appShelters.filter((s) => s.distance_km <= 25);
  const { data: osmShelters = [] } = useNearbyPlaces(lat, lon, "shelter", {
    radiusKm: 15,
    limit: 5,
    enabled: appSheltersNear.length < 3,
  });
  const checkIn = useCheckIn();
  const [buildingMap, setBuildingMap] = useState(false);
  const { data: myCheckIn } = useMyCheckIn();

  // "Rescue center" = an app-registered relief shelter (has live capacity).
  // "Hospital" = a real hospital from OpenStreetMap.
  const nearestRescue = appShelters[0] ?? null;
  const nearestHospital = hospitals[0] ?? null;
  const isSafe = myCheckIn?.status === "safe";

  function actionDetail(id: string): string {
    if (id === "hospital") {
      if (nearestHospital) return `${nearestHospital.name} · ${nearestHospital.distance_km.toFixed(1)} km`;
      return hospitalsLoading ? "Finding nearest hospital…" : "None found nearby";
    }
    if (id === "rescue") {
      return nearestRescue
        ? `${nearestRescue.name} · ${nearestRescue.distance_km.toFixed(1)} km`
        : "No registered shelter nearby";
    }
    if (id === "offline-map") {
      return buildingMap ? "Building…" : "Download for offline use";
    }
    return emergencyQuickActions.find((a) => a.id === id)?.detail ?? "";
  }

  function handleAction(id: string): void {
    if (id === "helpline") {
      window.location.assign("tel:112");
      return;
    }
    if (id === "hospital") {
      if (nearestHospital?.phone) {
        window.location.assign(`tel:${nearestHospital.phone.replace(/[^\d+]/g, "")}`);
      } else if (nearestHospital) {
        openOnMap(nearestHospital);
      } else {
        addToast(
          location.status === "ok" ? "No hospital found within 12 km." : "Waiting for your location.",
          "info"
        );
      }
      return;
    }
    if (id === "rescue") {
      if (nearestRescue) openOnMap(nearestRescue);
      else addToast("No registered relief shelter near you yet.", "info");
      return;
    }
    if (id === "offline-map") {
      handleOfflineMap();
      return;
    }
    addToast("This action isn't available yet.", "info");
  }

  function handleOfflineMap(): void {
    if (location.status !== "ok" || lat === null || lon === null) {
      addToast("I need your location to build an offline map.", "info");
      return;
    }
    const shelterSource: OfflineMapPlace[] =
      appSheltersNear.length > 0
        ? appSheltersNear.map((s) => ({
            name: s.name,
            latitude: s.latitude,
            longitude: s.longitude,
            distance_km: s.distance_km,
            detail: `${s.occupied}/${s.capacity} · ${s.status}`,
            address: s.accessibility,
          }))
        : osmShelters.map((p) => ({
            name: p.name,
            latitude: p.latitude,
            longitude: p.longitude,
            distance_km: p.distance_km,
            phone: p.phone,
            address: p.address,
          }));
    const hospital: OfflineMapPlace | null = nearestHospital
      ? {
          name: nearestHospital.name,
          latitude: nearestHospital.latitude,
          longitude: nearestHospital.longitude,
          distance_km: nearestHospital.distance_km,
          phone: nearestHospital.phone,
          address: nearestHospital.address,
        }
      : null;

    setBuildingMap(true);
    addToast("Preparing your offline map…", "info");
    downloadOfflineMap({
      lat,
      lon,
      accuracyM: location.status === "ok" ? location.accuracy : null,
      shelters: shelterSource,
      hospital,
    })
      .then(() =>
        addToast("Saved. Open aasha-setu-offline-map.html anytime — no internet needed.", "success")
      )
      .catch(() => addToast("Could not build the offline map. Try again with a connection.", "error"))
      .finally(() => setBuildingMap(false));
  }

  function handleSafe(): void {
    checkIn.mutate(
      { status: "safe", latitude: lat, longitude: lon },
      {
        onSuccess: () =>
          addToast("You're marked as safe. Your approximate area has been shared.", "success"),
        onError: () => addToast("Couldn't send your check-in. Try again.", "error"),
      }
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-2xl bg-navy-900 p-6 md:p-8 text-white">
        <div>
          <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-semibold">Emergency assistance</h1>
            <p className="text-sm text-navy-200 mt-2">Help is available. Stay calm and share your location</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {location.status === "ok" ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10">
                <Icon name="MapPin" className="w-4 h-4 text-navy-200" />
                <span className="text-sm font-mono tabular-nums">
                  {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warn-500/20 border border-warn-300/30">
                <Icon name="MapPin" className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {location.status === "loading" ? "Getting location…" : "Location unavailable"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center py-6 md:py-8">
        <button
          onClick={() => setSosOpen(true)}
          className="w-48 h-48 md:w-56 md:h-56 rounded-full bg-danger-600 text-white flex flex-col items-center justify-center ring-[12px] ring-danger-100 hover:bg-danger-700 active:scale-[0.97] transition-[background-color,transform] duration-150 no-tap-highlight"
        >
          <Icon name="Siren" className="w-12 h-12 md:w-14 md:h-14 mb-2" strokeWidth={1.75} />
          <span className="text-3xl md:text-4xl font-semibold tracking-wide">SOS</span>
          <span className="text-xs md:text-sm text-danger-100 mt-1 text-center px-6">Press and hold for emergency assistance</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {emergencyQuickActions.map((action, idx) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.id)}
            className={`card card-hover p-5 flex items-start gap-4 text-left group stagger-${Math.min(idx + 1, 6)}`}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate2-100 text-slate2-600">
              <Icon name={action.icon} className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy-900">{action.label}</p>
              <p className="text-xs text-slate2-500 mt-1 truncate">{actionDetail(action.id)}</p>
            </div>
            <Icon name="ChevronRight" className="w-4 h-4 text-slate2-300 flex-shrink-0 mt-1 group-hover:text-navy-400 group-hover:translate-x-0.5 transition-[color,transform]" />
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1.5 pt-2">
        <button
          onClick={handleSafe}
          disabled={checkIn.isPending}
          className={`flex items-center gap-2.5 px-6 h-12 rounded-xl font-medium text-sm transition-[background-color,border-color,transform] duration-150 no-tap-highlight disabled:opacity-60 ${
            isSafe
              ? "bg-safe-50 text-safe-700 border border-safe-300"
              : "bg-white text-safe-700 border border-safe-300 hover:bg-safe-50 active:scale-[0.98]"
          }`}
        >
          <Icon name={isSafe ? "CheckCircle2" : "ShieldCheck"} className="w-5 h-5" />
          {checkIn.isPending ? "Sending…" : isSafe ? "You are marked as safe" : "I am safe"}
        </button>
        {isSafe && myCheckIn && (
          <p className="text-xs text-slate2-400">Checked in {alertRelativeTime(myCheckIn.created_at)}</p>
        )}
      </div>

      {sosOpen && (
        <SOSModal
          onClose={() => setSosOpen(false)}
          token={token}
          location={location}
          onSent={() => {
            setSosOpen(false);
            addToast("SOS sent. A responder will review it shortly.", "success");
          }}
        />
      )}
    </div>
  );
}
