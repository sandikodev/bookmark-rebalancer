const API = "http://localhost:3000";

const contentEl = document.getElementById("content")!;
const refreshBtn = document.getElementById("refresh-btn")!;

refreshBtn.addEventListener("click", loadDashboard);
document.addEventListener("DOMContentLoaded", loadDashboard);

async function loadDashboard() {
  contentEl.innerHTML = `<div class="loading">Loading...</div>`;

  try {
    const [bmRes, projRes, schedRes] = await Promise.all([
      fetch(`${API}/api/bookmarks?limit=1`).then(r => r.json()),
      fetch(`${API}/api/projects`).then(r => r.json()),
      fetch(`${API}/api/schedule?completed=0`).then(r => r.json()),
    ]);

    const totalBookmarks = bmRes.total || 0;
    const projectsList = projRes.data || [];
    const scheduleList = schedRes.data || [];

    const activeProjects = projectsList.filter((p: any) => p.status === "active");
    const todaySchedule = scheduleList.filter((s: any) => {
      const today = new Date().toISOString().slice(0, 10);
      return s.scheduled_date?.slice(0, 10) === today;
    });

    contentEl.innerHTML = `
      <div class="stats">
        <div class="stat-card">
          <div class="stat-value">${totalBookmarks}</div>
          <div class="stat-label">Bookmarks</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${activeProjects.length}</div>
          <div class="stat-label">Active Projects</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${scheduleList.length}</div>
          <div class="stat-label">Pending Tasks</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${todaySchedule.length}</div>
          <div class="stat-label">Today</div>
        </div>
      </div>

      <h2>📁 Active Projects</h2>
      ${activeProjects.length === 0
        ? `<div class="empty">No active projects. Create one via CLI: bm project create</div>`
        : activeProjects.slice(0, 5).map((p: any) => {
            const pct = p.total_entries > 0 ? Math.round((p.completed_entries / p.total_entries) * 100) : 0;
            return `
              <div class="card">
                <div class="card-header">
                  <span class="card-title">${p.name}</span>
                  <span class="badge priority">P${p.priority}</span>
                </div>
                <div style="font-size:12px;color:#707080;">
                  ${p.bookmark_count} bookmarks · ${p.completed_entries}/${p.total_entries} tasks
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${pct}%"></div>
                </div>
              </div>
            `;
          }).join("")}

      <h2>📅 Today's Schedule</h2>
      ${todaySchedule.length === 0
        ? `<div class="empty">Nothing scheduled for today.</div>`
        : todaySchedule.map((s: any) => `
            <div class="schedule-item">
              <div class="schedule-time">${s.duration_minutes}min</div>
              <div class="schedule-project">
                <strong>${s.project_name}</strong>
                ${s.notes ? `<br><span style="font-size:11px;color:#707080;">${s.notes}</span>` : ""}
              </div>
              <div class="schedule-done ${s.completed ? 'done' : ''}" data-id="${s.id}">
                ${s.completed ? "✓" : ""}
              </div>
            </div>
          `).join("")}

      <h2>⏳ Upcoming</h2>
      ${scheduleList.filter((s: any) => {
        const today = new Date().toISOString().slice(0, 10);
        return s.scheduled_date?.slice(0, 10) > today;
      }).length === 0
        ? `<div class="empty">No upcoming tasks.</div>`
        : scheduleList.filter((s: any) => {
            const today = new Date().toISOString().slice(0, 10);
            return s.scheduled_date?.slice(0, 10) > today;
          }).slice(0, 5).map((s: any) => {
            const d = new Date(s.scheduled_date);
            const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            return `
              <div class="schedule-item">
                <div class="schedule-time">${dateStr}</div>
                <div class="schedule-project">
                  <strong>${s.project_name}</strong>
                  ${s.notes ? `<br><span style="font-size:11px;color:#707080;">${s.notes}</span>` : ""}
                </div>
                <div style="font-size:11px;color:#707080;">${s.duration_minutes}min</div>
              </div>
            `;
          }).join("")}
    `;

    // Attach click handlers for schedule done toggle
    document.querySelectorAll(".schedule-done").forEach((el) => {
      el.addEventListener("click", async () => {
        const id = el.getAttribute("data-id");
        if (!id) return;
        const isDone = el.classList.contains("done");
        try {
          await fetch(`${API}/api/schedule/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: !isDone }),
          });
          loadDashboard();
        } catch {}
      });
    });
  } catch (err: unknown) {
    contentEl.innerHTML = `
      <div class="error">
        ⚠️ Cannot connect to backend at ${API}/api<br>
        Make sure the server is running.<br>
        <small>${err instanceof Error ? err.message : "Unknown error"}</small>
      </div>
    `;
  }
}
