// Test Script: Verify Session Revocation on Frontend Logout
// LolaCloud Console - Frontend Logout Engineer

import { authService, sessionService, apiClient } from '../dist-test/api.js';

// Polyfill localStorage in Node.js environment
const memoryStore = new Map();
globalThis.localStorage = {
  getItem: (key) => memoryStore.get(key) ?? null,
  setItem: (key, val) => memoryStore.set(key, String(val)),
  removeItem: (key) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
};

async function runTest() {
  console.log('====================================================');
  console.log('🚀 Starting Frontend Logout & Session Revocation Test');
  console.log('====================================================\n');

  // STEP 1: Operator Login
  console.log('▶ [Step 1] Logging in as operator "root"...');
  const loginData = await authService.login({ username: 'root', password: 'toor' });
  const storedToken = localStorage.getItem('lola_token');
  const storedOperator = localStorage.getItem('lola_operator');

  if (!storedToken) {
    throw new Error('❌ FAILED: lola_token was not saved to localStorage!');
  }
  if (!storedOperator) {
    throw new Error('❌ FAILED: lola_operator was not saved to localStorage!');
  }
  console.log('✔ Logged in successfully.');
  console.log(`  - Token prefix: ${storedToken.substring(0, 25)}...`);
  console.log(`  - Operator: ${storedOperator}`);
  console.log(`  - Session ID: ${loginData.sessionId || 'N/A'}\n`);

  // STEP 2: Capture Active Sessions Count
  console.log('▶ [Step 2] Capturing active sessions count before logout...');
  const sessionsBefore = await sessionService.getSessions();
  const countBefore = sessionsBefore.length;
  console.log(`✔ Active sessions before logout: ${countBefore}`);
  
  const currentSession = sessionsBefore.find((s) => s.current);
  if (!currentSession) {
    throw new Error('❌ FAILED: Current session was not marked as current in session list!');
  }
  const loggedOutSessionId = currentSession.id;
  console.log(`  - Identified current active session: ${loggedOutSessionId} (${currentSession.deviceType} / ${currentSession.browser})\n`);

  // STEP 3: Dispatch Logout
  console.log('▶ [Step 3] Dispatching authService.logout()...');
  const loggedOutToken = storedToken;
  await authService.logout();

  // Verify client storage cleanup
  const tokenAfterLogout = localStorage.getItem('lola_token');
  const operatorAfterLogout = localStorage.getItem('lola_operator');

  if (tokenAfterLogout !== null) {
    throw new Error(`❌ FAILED: lola_token still present in localStorage: ${tokenAfterLogout}`);
  }
  if (operatorAfterLogout !== null) {
    throw new Error(`❌ FAILED: lola_operator still present in localStorage: ${operatorAfterLogout}`);
  }
  console.log('✔ LocalStorage tokens successfully removed (lola_token = null, lola_operator = null).\n');

  // STEP 4: Verify Backend Session Revocation via Introspection
  console.log('▶ [Step 4] Introspecting logged-out token on backend (/internal/v1/auth/introspect)...');
  const introspectRes = await apiClient.post('/internal/v1/auth/introspect', {
    token: loggedOutToken,
  });
  const introData = introspectRes.data?.data || introspectRes.data;
  console.log('  - Introspection response:', JSON.stringify(introData));

  if (introData.valid !== false) {
    throw new Error('❌ FAILED: Token should be invalid after logout, but was reported valid!');
  }
  if (introData.error !== 'Session has been revoked') {
    throw new Error(`❌ FAILED: Expected error "Session has been revoked", got: "${introData.error}"`);
  }
  console.log('✔ Confirmed: Backend reports token session is revoked ("Session has been revoked").\n');

  // STEP 5: Verify Session List Excludes Revoked Session
  console.log('▶ [Step 5] Logging in to fresh session to inspect active sessions list...');
  await authService.login({ username: 'root', password: 'toor' });
  const sessionsAfter = await sessionService.getSessions();
  const foundRevokedSession = sessionsAfter.find((s) => s.id === loggedOutSessionId);

  if (foundRevokedSession) {
    throw new Error(`❌ FAILED: Session ${loggedOutSessionId} is still present in active sessions list!`);
  }
  console.log(`✔ Confirmed: Revoked session ${loggedOutSessionId} is no longer in active sessions.`);
  console.log(`  - Active sessions count now: ${sessionsAfter.length}\n`);

  // Cleanup fresh session
  await authService.logout();

  // STEP 6: Resiliency Check (Graceful Logout)
  console.log('▶ [Step 6] Testing graceful logout handling (no token / invalid token)...');
  await authService.logout(); // No token in storage
  console.log('✔ authService.logout() with empty storage completed gracefully without errors.');

  localStorage.setItem('lola_token', 'invalid-token-12345');
  await authService.logout();
  if (localStorage.getItem('lola_token') !== null) {
    throw new Error('❌ FAILED: localStorage was not cleared when invalid token was present!');
  }
  console.log('✔ authService.logout() with invalid token completed gracefully and purged localStorage.\n');

  console.log('====================================================');
  console.log('🎉 ALL LOGOUT & SESSION REVOCATION TESTS PASSED 100%');
  console.log('====================================================');
}

runTest().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
