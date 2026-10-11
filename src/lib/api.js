const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://floodsignal-backend.onrender.com/api";

export async function fetchStats() {
  const res = await fetch(`${API_URL}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchReports() {
  const res = await fetch(`${API_URL}/reports`);
  if (!res.ok) throw new Error("Failed to fetch reports");
  return res.json();
}

export async function submitReport(data) {
  const res = await fetch(`${API_URL}/reports`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to submit report");
  }
  return res.json();
}

export async function updateReportStatus(id, updates) {
  const res = await fetch(`${API_URL}/reports/${id}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update status");
  }
  return res.json();
}

export async function fetchMyReports() {
  const res = await fetch(`${API_URL}/reports/me`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch your reports");
  }
  return res.json();
}

export async function fetchResponders() {
  const res = await fetch(`${API_URL}/responders`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch responders list");
  }
  return res.json();
}

export async function checkDuplicates(lat, lng) {
  const res = await fetch(`${API_URL}/reports/check-duplicates`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng }),
  });
  if (!res.ok) {
    return { potentialDuplicates: [] };
  }
  return res.json();
}

export function getReportPhotoUrl(reportId, photoKey) {
  return `${API_URL}/reports/${reportId}/photos/${photoKey}`;
}

export async function fetchRainfallTelemetry(lat = 22.3072, lng = 73.1812) {
  const res = await fetch(
    `${API_URL}/telemetry/rainfall?lat=${lat}&lng=${lng}`,
    {
      credentials: "include",
    },
  );
  if (!res.ok) {
    throw new Error(`Telemetry request failed with HTTP ${res.status}`);
  }
  return res.json();
}
