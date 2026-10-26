const fs = require('fs');

const source = fs.readFileSync('sonicmediaadmin.html', 'utf8');

function requireSource(fragment, message) {
  if (!source.includes(fragment)) throw new Error(message);
}

requireSource("['preAuthStyle', 'uncloakStyle', 'stealthStyle']", 'Authentication view gates are not cleared together.');
requireSource('clearAuthViewGates();\n      const loginShield', 'Dashboard activation does not clear the pre-auth display gate.');
requireSource("showToast('Welcome back! Redirecting to your admin dashboard...')", 'Successful login is missing its welcome confirmation.');
requireSource("resolveAppUrl('/sonicmediaadmin')", 'Successful login is missing the canonical admin dashboard URL.');
requireSource('window.history.replaceState({ admin: true }', 'Dashboard URL is not normalized after login.');
requireSource('setTimeout(() => window.location.assign(redirectUrl), 650)', 'Safe return redirects do not allow the welcome message to appear first.');
requireSource("safeRedirect.startsWith('/') && !safeRedirect.startsWith('//')", 'Same-origin redirect validation was removed or weakened.');
requireSource('dashboard-skeleton-shimmer', 'Dashboard loading skeleton styles are missing.');
requireSource('function setDashboardLoading(isLoading)', 'Dashboard loading state handler is missing.');
requireSource('setDashboardLoading(true);', 'Dashboard data loading does not show skeleton rows before fetching.');
requireSource('setDashboardLoading(false);', 'Dashboard data loading does not clear skeleton rows after fetching.');
requireSource('renderDashboardLoadError();', 'Dashboard fetch failures do not replace skeleton rows with a retry state.');

const revealIndex = source.indexOf('showDashboard();', source.indexOf('async function handleLogin'));
const welcomeIndex = source.indexOf("showToast('Welcome back! Redirecting to your admin dashboard...')", revealIndex);
const canonicalIndex = source.indexOf("resolveAppUrl('/sonicmediaadmin')", welcomeIndex);
if (revealIndex < 0 || welcomeIndex < revealIndex || canonicalIndex < welcomeIndex) {
  throw new Error('Successful login does not reveal the dashboard, show the welcome message, and then normalize its URL in order.');
}

console.log('Admin authentication redirect verification passed.');
