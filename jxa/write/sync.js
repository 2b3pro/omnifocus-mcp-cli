// Synchronize OmniFocus
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);

    app.synchronize(doc);

    return JSON.stringify({
      success: true,
      message: "Synchronization started"
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
