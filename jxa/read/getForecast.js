// Get forecast (tasks due in coming days)
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const opts = parseJsonArg(4, {});

    const days = opts.days || 7;
    const allTasks = doc.flattenedTasks();

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + days);

    // Group tasks by date
    const forecast = {};

    for (let i = 0; i < allTasks.length; i++) {
      const task = allTasks[i];

      // Skip completed
      if (task.completed()) continue;

      const dueDate = task.effectiveDueDate();
      if (!dueDate) continue;

      // Skip tasks due after forecast range
      if (dueDate > endDate) continue;

      // Create date key (YYYY-MM-DD)
      const dateKey = dueDate.toISOString().split('T')[0];

      if (!forecast[dateKey]) {
        forecast[dateKey] = [];
      }

      forecast[dateKey].push(formatTask(task));
    }

    // Convert to sorted array
    const sortedForecast = Object.keys(forecast)
      .sort()
      .map(date => ({
        date: date,
        tasks: forecast[date],
        count: forecast[date].length
      }));

    return JSON.stringify({
      success: true,
      forecast: sortedForecast,
      days: days
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
