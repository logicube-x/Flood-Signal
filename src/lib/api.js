const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export async function fetchStats() {
  const res = await fetch(`${API_URL}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchReports() {
  const res = await fetch(`${API_URL}/reports`);
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
}

export async function submitReport(data) {
  const res = await fetch(`${API_URL}/reports`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit report');
  }
  return res.json();
}

export async function updateReportStatus(id, updates) {
  const res = await fetch(`${API_URL}/reports/${id}/status`, {
    method: 'PATCH', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update status');
  }
  return res.json();
}

export async function fetchMyReports() {
  const res = await fetch(`${API_URL}/reports/me`, {
    credentials: 'include'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch your reports');
  }
  return res.json();
}
