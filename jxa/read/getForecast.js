// Get forecast (tasks due in coming days)
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const opts = parseJsonArg(4, {});

    const days = opts.days || 7;
    const collection = doc.flattenedTasks;

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + days);

    // Group tasks by date
    const forecast = {};

    // Bulk property fetch — see formatTasksBulk in utils/helpers.js
    const rows = formatTasksBulk(collection);
    let effDue = null;
    try {
      const v = collection.effectiveDueDate();
      effDue = (Array.isArray(v) && v.length === rows.length) ? v : null;
    } catch {
      effDue = null;
    }
    if (!effDue) effDue = new Array(rows.length).fill(null);

    for (let i = 0; i < rows.length; i++) {
      // Skip completed
      if (rows[i].completed) continue;

      if (!effDue[i]) continue;
      const dueDate = new Date(effDue[i]);

      // Skip tasks due after forecast range
      if (dueDate > endDate) continue;

      // Create date key (YYYY-MM-DD)
      const dateKey = dueDate.toISOString().split('T')[0];

      if (!forecast[dateKey]) {
        forecast[dateKey] = [];
      }

      forecast[dateKey].push(rows[i]);
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
