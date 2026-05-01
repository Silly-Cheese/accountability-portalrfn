export const SESSION_KEY = "rfn_accountability_session";

export const ROLE_LEVELS = {
  "staff": 1,
  "management": 2,
  "ownership": 3,
  "ceo": 4
};

export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function normalizeRole(role) {
  return String(role || "Staff").trim().toLowerCase();
}

export function roleLevel(role) {
  return ROLE_LEVELS[normalizeRole(role)] || 1;
}

export function hasPermission(userRole, requiredRole) {
  return roleLevel(userRole) >= roleLevel(requiredRole);
}

export function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

export function requireRole(requiredRole) {
  const session = requireAuth();
  if (!session) return null;
  if (!hasPermission(session.role, requiredRole)) {
    window.location.href = "dashboard.html";
    return null;
  }
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

export function applyRoleBasedNavigation(session) {
  const role = session?.role || "Staff";
  document.querySelectorAll("[data-min-role]").forEach(el => {
    const required = el.dataset.minRole;
    if (!hasPermission(role, required)) el.classList.add("hidden");
    else el.classList.remove("hidden");
  });
}
