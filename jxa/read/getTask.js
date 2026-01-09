// Get task details
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const taskId = getArg(4, "");

    if (!taskId) {
      return JSON.stringify({ success: false, error: "Task ID is required" });
    }

    const task = findTask(doc, taskId);
    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + taskId });
    }

    return JSON.stringify({
      success: true,
      task: formatTask(task)
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
