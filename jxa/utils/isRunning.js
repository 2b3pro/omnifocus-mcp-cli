// Check if OmniFocus is running
(() => {
  try {
    const app = Application("System Events");
    const processes = app.processes.whose({ name: { _beginsWith: "OmniFocus" } });
    const running = processes.length > 0;
    return JSON.stringify({ success: true, running: running });
  } catch (e) {
    return JSON.stringify({ success: false, running: false, error: e.message });
  }
})();
