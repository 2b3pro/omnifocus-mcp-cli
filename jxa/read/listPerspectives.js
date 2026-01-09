// List perspectives
(() => {
  try {
    const app = getApp();

    const perspectiveNames = app.perspectiveNames();
    const perspectives = [];

    for (let i = 0; i < perspectiveNames.length; i++) {
      perspectives.push({
        name: perspectiveNames[i],
        index: i
      });
    }

    return JSON.stringify({
      success: true,
      perspectives: perspectives,
      totalCount: perspectives.length
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
