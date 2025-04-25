// Web Worker to track inactivity even when browser is in background
// This worker will continue to run even when the main browser thread is throttled

let lastPingTime = Date.now();
let checkInterval = null;
const INACTIVITY_CHECK_INTERVAL = 10000; // 10 saniye
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 dakika

// Start checking inactivity
function startInactivityCheck() {
  lastPingTime = Date.now();

  if (checkInterval) {
    clearInterval(checkInterval);
  }

  checkInterval = setInterval(() => {
    const currentTime = Date.now();
    const inactiveTime = currentTime - lastPingTime;

    if (inactiveTime > INACTIVITY_LIMIT) {
      self.postMessage({
        type: "inactivity_detected",
        inactiveTime: inactiveTime,
        timestamp: currentTime,
      });
    }
  }, INACTIVITY_CHECK_INTERVAL);
}

// Update last activity time
function updateLastActivity() {
  lastPingTime = Date.now();
}

// Listen for messages from the main thread
self.addEventListener("message", (event) => {
  const message = event.data;

  switch (message.type) {
    case "start":
      startInactivityCheck();
      break;
    case "stop":
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
      break;
    case "ping":
      updateLastActivity();
      break;
    default:
      console.log("Unknown message type:", message.type);
  }
});
