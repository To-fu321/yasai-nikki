import { useState, useMemo, useEffect, useCallback } from "react";

const WEATHER_OPTIONS = ["☀️ 晴れ", "⛅ 曇り", "🌧 雨", "🌩 嵐", "❄️ 雪"];

const typeColor = {
  plant: "#4caf50",
  growth: "#2196f3",
  harvest: "#ff9800",
  note: "#9c27b0",
};
const typeLabel = {
  plant: "🌱 植付け",
  growth: "📏 成長",
  harvest: "🎉 収穫",
  note: "📝 メモ",
};

const DOW = ["日", "月", "火", "水", "木", "金", "土"];

// ── 予定の種別 ────────────────────────────────────────────────
const scheduleColor = {
  harvest:   "#ff6f00",
  water:     "#0288d1",
  fertilize: "#6d4c41",
  check:     "#7b1fa2",
  other:     "#546e7a",
};
const scheduleLabel = {
  harvest:   "🎯 収穫予定",
  water:     "💧 水やり予定",
  fertilize: "🌿 肥料やり",
  check:     "🔍 点検",
  other:     "📌 その他",
};

let _nextSchedId = 200;
function newSchedId() { return ++_nextSchedId; }

const INITIAL_SCHEDULES = [];

let _nextLogId = 100;
function newLogId() { return ++_nextLogId; }

// デモ用画像（Wikimedia Commons / Unsplash — パブリックドメイン or CC0）
const DEMO = {
  tomatoSeedling: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tomato_seedling.jpg/320px-Tomato_seedling.jpg",
  tomatoGrowing:  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tomato_je.jpg/320px-Tomato_je.jpg",
  tomatoHarvest:  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/TomatoSeeds.jpg/320px-TomatoSeeds.jpg",
  tomatoRipe:     "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Tomato_je.jpg/320px-Tomato_je.jpg",
  basilSeed:      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Ocimum_basilicum_Horapha_2.jpg/320px-Ocimum_basilicum_Horapha_2.jpg",
  basilSprout:    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Basil-Basilico-Ocimum_basilicum-albahaca.jpg/320px-Basil-Basilico-Ocimum_basilicum-albahaca.jpg",
  basilLeaf:      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Hapshash-basil.jpg/320px-Hapshash-basil.jpg",
};

const INITIAL_PLANTS = [];

function formatDate(str) {
  if (!str) return "";
  const d = new Date(str);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function daysSince(str) {
  if (!str) return 0;
  return Math.floor((Date.now() - new Date(str)) / 86400000);
}
function growDays(plant) {
  const end = plant.finishedDate || new Date().toISOString().slice(0, 10);
  return Math.floor((new Date(end) - new Date(plant.plantedDate)) / 86400000);
}
function blankLog() {
  return { date: new Date().toISOString().slice(0, 10), type: "growth", note: "", weather: "☀️ 晴れ", temp: "", watered: false, height: "", harvest: "", photos: [] };
}

// ── 写真をBase64に変換 ────────────────────────────────────────
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── ライトボックス（写真拡大表示）────────────────────────────
function Lightbox({ photos, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const total = photos.length;

  function prev(e) { e.stopPropagation(); setIdx(i => (i - 1 + total) % total); }
  function next(e) { e.stopPropagation(); setIdx(i => (i + 1) % total); }

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "#000d", zIndex: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* 閉じるボタン */}
      <button onClick={onClose}
        style={{ position: "absolute", top: 18, right: 18, background: "#ffffff30", border: "none", borderRadius: "50%", width: 40, height: 40, fontSize: 22, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        ✕
      </button>

      {/* カウンタ */}
      {total > 1 && (
        <div style={{ position: "absolute", top: 22, left: "50%", transform: "translateX(-50%)", color: "#fff", fontSize: 13, fontWeight: 600, background: "#0004", borderRadius: 12, padding: "3px 12px" }}>
          {idx + 1} / {total}
        </div>
      )}

      {/* 画像 */}
      <img src={photos[idx]} alt="" onClick={e => e.stopPropagation()}
        style={{ maxWidth: "92vw", maxHeight: "78vh", borderRadius: 14, objectFit: "contain", boxShadow: "0 8px 40px #000a" }} />

      {/* 前後ボタン */}
      {total > 1 && (
        <>
          <button onClick={prev}
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "#ffffff25", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 24, color: "#fff", cursor: "pointer" }}>
            ‹
          </button>
          <button onClick={next}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "#ffffff25", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 24, color: "#fff", cursor: "pointer" }}>
            ›
          </button>
        </>
      )}

      {/* サムネイル帯（複数枚のとき） */}
      {total > 1 && (
        <div onClick={e => e.stopPropagation()}
          style={{ display: "flex", gap: 8, marginTop: 18, padding: "8px 12px", background: "#0005", borderRadius: 16, maxWidth: "90vw", overflowX: "auto" }}>
          {photos.map((p, i) => (
            <img key={i} src={p} alt="" onClick={() => setIdx(i)}
              style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", border: i === idx ? "2px solid #66bb6a" : "2px solid transparent", cursor: "pointer", flexShrink: 0 }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 写真アップロードUI（スマホ：カメラ撮影 or フォトライブラリ）──
function PhotoUploader({ photos, onChange }) {
  const [lightbox, setLightbox] = useState(null);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const dataURLs = await Promise.all(files.map(readFileAsDataURL));
    onChange([...photos, ...dataURLs]);
    e.target.value = "";
  }

  function remove(i, ev) {
    ev.stopPropagation();
    onChange(photos.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      {/* サムネイルグリッド */}
      {photos.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {photos.map((src, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={src} alt="" onClick={() => setLightbox(i)}
                style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", cursor: "pointer", boxShadow: "0 2px 8px #0002", border: "2px solid #e8f5e9" }} />
              <button onClick={ev => remove(i, ev)}
                style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: "#e53935", border: "2px solid #fff", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ボタン2つ：カメラ撮影 ／ フォトライブラリ */}
      <div style={{ display: "flex", gap: 10 }}>
        {/* カメラで撮影 — capture="environment" でリアカメラ起動 */}
        <label style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px", borderRadius: 14, border: "2px solid #b2dfdb", background: "#f9fdf9", cursor: "pointer", fontWeight: 700, fontSize: 13, color: "#2e7d32" }}>
          <span style={{ fontSize: 28 }}>📸</span>
          <span>カメラで撮影</span>
          <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFiles} />
        </label>

        {/* フォトライブラリから選択 — capture なしで複数選択可 */}
        <label style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px", borderRadius: 14, border: "2px solid #b2dfdb", background: "#f9fdf9", cursor: "pointer", fontWeight: 700, fontSize: 13, color: "#2e7d32" }}>
          <span style={{ fontSize: 28 }}>🖼️</span>
          <span>ライブラリから</span>
          <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFiles} />
        </label>
      </div>

      {photos.length > 0 && (
        <div style={{ fontSize: 11, color: "#66bb6a", textAlign: "center", marginTop: 8, fontWeight: 600 }}>
          📷 {photos.length}枚の写真が追加されています
        </div>
      )}

      {lightbox !== null && (
        <Lightbox photos={photos} startIndex={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

// ── 通知ヘルパー（サンドボックス対応）──────────────────────────
function getNotifPermission() {
  try { return ("Notification" in window) ? Notification.permission : "unsupported"; }
  catch { return "unsupported"; }
}

async function requestNotificationPermission() {
  try {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    const result = await Notification.requestPermission();
    return result;
  } catch { return "unsupported"; }
}

function fireNotification(title, body) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    new Notification(title, { body });
  } catch {}
}

// ── 設定画面 ──────────────────────────────────────────────────
function SettingsView({ settings, onUpdate, schedules, plants }) {
  const [permStatus, setPermStatus] = useState(() => getNotifPermission());
  const [testSent, setTestSent] = useState(false);

  async function handleRequestPerm() {
    const result = await requestNotificationPermission();
    setPermStatus(result);
    if (result === "granted") onUpdate({ ...settings, notifyEnabled: true });
  }

  function handleTest() {
    fireNotification("🥬 やさい日誌", "通知のテストです！本日の予定を確認しましょう。");
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  }

  const permLabel = {
    granted: { text: "許可済み ✓", color: "#2e7d32", bg: "#e8f5e9" },
    denied:  { text: "拒否済み（端末設定から変更が必要です）", color: "#c62828", bg: "#ffebee" },
    default: { text: "未設定", color: "#e65100", bg: "#fff3e0" },
    unsupported: { text: "このブラウザは非対応です", color: "#888", bg: "#f5f5f5" },
  }[permStatus] ?? { text: permStatus, color: "#888", bg: "#f5f5f5" };

  return (
    <div>
      <div style={{ fontSize: 13, color: "#5a7a5a", marginBottom: 18, fontWeight: 600 }}>⚙️ 設定</div>

      {/* 通知セクション */}
      <div style={{ background: "#fff", borderRadius: 18, padding: "18px", marginBottom: 14, boxShadow: "0 1px 8px #0001" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#1b4f1b", marginBottom: 14 }}>🔔 通知設定</div>

        {/* 通知パーミッション状態 */}
        <div style={{ background: permLabel.bg, borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: permLabel.color }}>{permLabel.text}</span>
        </div>

        {permStatus !== "granted" && permStatus !== "unsupported" && (
          <button onClick={handleRequestPerm}
            style={{ width: "100%", padding: "12px", borderRadius: 14, border: "none", background: "#2e7d32", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 12 }}>
            🔔 通知を許可する
          </button>
        )}

        {/* 通知オン/オフ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottom: "1px solid #f0f7f0" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#333" }}>通知を有効にする</div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>予定日の当日朝に通知</div>
          </div>
          <div onClick={() => {
            if (!settings.notifyEnabled && permStatus !== "granted") { handleRequestPerm(); return; }
            onUpdate({ ...settings, notifyEnabled: !settings.notifyEnabled });
          }}
            style={{ width: 48, height: 28, borderRadius: 14, background: settings.notifyEnabled && permStatus === "granted" ? "#2e7d32" : "#ccc", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: settings.notifyEnabled && permStatus === "granted" ? 22 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px #0003", transition: "left .2s" }} />
          </div>
        </div>

        {/* 通知タイミング */}
        <div style={{ paddingTop: 14, paddingBottom: 14, borderBottom: "1px solid #f0f7f0" }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#333", marginBottom: 10 }}>通知タイミング</div>
          {[
            { key: "notifyOnDay",    label: "当日",   sub: "予定日の当日" },
            { key: "notifyDayBefore", label: "前日",  sub: "予定日の1日前" },
            { key: "notify3Before",  label: "3日前",  sub: "予定日の3日前" },
          ].map(({ key, label, sub }) => (
            <div key={key} onClick={() => onUpdate({ ...settings, [key]: !settings[key] })}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, cursor: "pointer" }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>{label}</span>
                <span style={{ fontSize: 11, color: "#aaa", marginLeft: 8 }}>{sub}</span>
              </div>
              <div style={{ width: 40, height: 24, borderRadius: 12, background: settings[key] ? "#66bb6a" : "#ddd", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: settings[key] ? 18 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px #0003", transition: "left .2s" }} />
              </div>
            </div>
          ))}
        </div>

        {/* 通知時刻 */}
        <div style={{ paddingTop: 14, paddingBottom: 14, borderBottom: "1px solid #f0f7f0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#333" }}>通知時刻</div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>毎日この時刻にチェック</div>
            </div>
            <input type="time" value={settings.notifyTime}
              onChange={e => onUpdate({ ...settings, notifyTime: e.target.value })}
              style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #dceedd", fontSize: 14, color: "#333", background: "#f9fdf9", outline: "none" }} />
          </div>
        </div>

        {/* テスト通知 */}
        <div style={{ paddingTop: 14 }}>
          <button onClick={handleTest} disabled={permStatus !== "granted"}
            style={{ width: "100%", padding: "11px", borderRadius: 14, border: "2px solid #dceedd", background: permStatus === "granted" ? "#f5fbf5" : "#f5f5f5", color: permStatus === "granted" ? "#2e7d32" : "#bbb", fontWeight: 700, fontSize: 13, cursor: permStatus === "granted" ? "pointer" : "not-allowed" }}>
            {testSent ? "✅ 送信しました！" : "📣 テスト通知を送る"}
          </button>
        </div>
      </div>

      {/* アプリ情報 */}
      <div style={{ background: "#fff", borderRadius: 18, padding: "18px", boxShadow: "0 1px 8px #0001" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#1b4f1b", marginBottom: 12 }}>📱 アプリについて</div>
        <div style={{ fontSize: 13, color: "#666", lineHeight: 1.8 }}>
          <div>🥬 やさい日誌 v1.0</div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
            スマホでの通知はホーム画面に追加（PWA）することで、より確実に動作します。
            iOS: Safari → 共有 → ホーム画面に追加
          </div>
        </div>
      </div>
    </div>
  );
}

// ── カレンダー ────────────────────────────────────────────────
function CalendarView({ plants, schedules, onSelectPlant, onAddSchedule, onDeleteSchedule, onEditSchedule }) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [calLightbox, setCalLightbox] = useState(null);
  // 予定追加・編集フォーム
  const [addingSched, setAddingSched] = useState(false);
  const [schedDraft, setSchedDraft] = useState({ type: "harvest", plantId: null, note: "" });
  const [editingSchedId, setEditingSchedId] = useState(null); // 編集中のID
  const [editDraft, setEditDraft] = useState(null); // 編集中のドラフト

  const logMap = useMemo(() => {
    const map = {};
    for (const plant of plants) {
      for (const log of plant.logs) {
        if (!map[log.date]) map[log.date] = [];
        map[log.date].push({ plant, log });
      }
    }
    return map;
  }, [plants]);

  const schedMap = useMemo(() => {
    const map = {};
    for (const s of schedules) {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }
    return map;
  }, [schedules]);

  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayStr = today.toISOString().slice(0, 10);
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1);
    setSelectedDay(null); setAddingSched(false);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1);
    setSelectedDay(null); setAddingSched(false);
  }

  const selDateStr = selectedDay
    ? `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;
  const selLogs = selDateStr ? (logMap[selDateStr] || []) : [];
  const selScheds = selDateStr ? (schedMap[selDateStr] || []) : [];

  function handleAddSched() {
    if (!selDateStr) return;
    onAddSchedule({ ...schedDraft, date: selDateStr, id: newSchedId() });
    setSchedDraft({ type: "harvest", plantId: null, note: "" });
    setAddingSched(false);
  }

  function startEditSched(s) {
    setEditingSchedId(s.id);
    setEditDraft({ type: s.type, plantId: s.plantId ?? null, note: s.note || "" });
    setAddingSched(false);
  }

  function handleSaveEdit() {
    if (!editingSchedId || !editDraft) return;
    onEditSchedule(editingSchedId, editDraft);
    setEditingSchedId(null);
    setEditDraft(null);
  }

  function cancelEdit() {
    setEditingSchedId(null);
    setEditDraft(null);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={prevMonth} style={navBtn}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#1b4f1b" }}>{calYear}年 {calMonth + 1}月</span>
        <button onClick={nextMonth} style={navBtn}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 4 }}>
        {DOW.map((d, i) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, padding: "3px 0", color: i === 0 ? "#e57373" : i === 6 ? "#64b5f6" : "#888" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e${idx}`} />;
          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const logs = logMap[dateStr] || [];
          const scheds = schedMap[dateStr] || [];
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          const isSel = day === selectedDay;
          const dow = (firstDow + day - 1) % 7;
          const logTypes = [...new Set(logs.map(l => l.log.type))].slice(0, 3);
          const schedTypes = [...new Set(scheds.map(s => s.type))].slice(0, 2);
          const hasPhoto = logs.some(l => l.log.photos?.length > 0);
          return (
            <div key={day} onClick={() => { setSelectedDay(isSel ? null : day); setAddingSched(false); }}
              style={{ borderRadius: 10, padding: "5px 2px 4px", textAlign: "center", minHeight: 52, cursor: "pointer", transition: "all .12s",
                background: isSel ? "#2e7d32" : isToday ? "#e8f5e9" : "#fff",
                border: isToday && !isSel ? "2px solid #66bb6a" : "2px solid transparent",
                boxShadow: isSel ? "0 2px 8px #2e7d3240" : "0 1px 4px #0001" }}>
              <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isSel ? "#fff" : dow === 0 ? "#e57373" : dow === 6 ? "#1976d2" : "#333" }}>{day}</div>
              {/* 実績ドット */}
              <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 2, flexWrap: "wrap" }}>
                {logTypes.map(t => <div key={t} style={{ width: 5, height: 5, borderRadius: "50%", background: isSel ? "rgba(255,255,255,.8)" : typeColor[t] }} />)}
                {hasPhoto && <span style={{ fontSize: 7, color: isSel ? "#ffffffaa" : "#aaa" }}>📷</span>}
              </div>
              {/* 予定バー */}
              {schedTypes.length > 0 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 2, flexWrap: "wrap" }}>
                  {schedTypes.map(t => (
                    <div key={t} style={{ width: 14, height: 4, borderRadius: 3, background: isSel ? "rgba(255,255,255,.6)" : scheduleColor[t] }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 凡例 */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #e8f5e9" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: "#999", fontWeight: 700 }}>● 実績：</span>
          {Object.entries(typeColor).map(([k, c]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#777" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />{typeLabel[k].split(" ")[1]}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "#999", fontWeight: 700 }}>▬ 予定：</span>
          {Object.entries(scheduleColor).map(([k, c]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#777" }}>
              <div style={{ width: 14, height: 4, borderRadius: 3, background: c }} />{scheduleLabel[k].split(" ")[1]}
            </div>
          ))}
        </div>
      </div>

      {/* 選択日パネル */}
      {selDateStr && (
        <div style={{ marginTop: 14, background: "#fff", borderRadius: 18, padding: "16px", boxShadow: "0 2px 14px #0001" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1b4f1b" }}>
              📅 {calMonth + 1}月{selectedDay}日（{DOW[(firstDow + selectedDay - 1) % 7]}）
            </div>
            <button onClick={() => setAddingSched(v => !v)}
              style={{ fontSize: 12, padding: "5px 12px", borderRadius: 12, border: "none", background: addingSched ? "#e8f5e9" : "#2e7d32", color: addingSched ? "#2e7d32" : "#fff", fontWeight: 700, cursor: "pointer" }}>
              {addingSched ? "✕ キャンセル" : "＋ 予定を追加"}
            </button>
          </div>

          {/* 予定追加フォーム */}
          {addingSched && (
            <div style={{ background: "#f8fdf8", borderRadius: 14, padding: "14px", marginBottom: 14, border: "1px solid #dceedd" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#5a7a5a", marginBottom: 10 }}>新しい予定</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 5 }}>種類</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(scheduleLabel).map(([k, v]) => (
                    <button key={k} onClick={() => setSchedDraft(d => ({ ...d, type: k }))}
                      style={{ padding: "5px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `2px solid ${schedDraft.type === k ? scheduleColor[k] : "#ddd"}`, background: schedDraft.type === k ? scheduleColor[k] + "18" : "#fff", color: schedDraft.type === k ? scheduleColor[k] : "#888" }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 5 }}>対象野菜（任意）</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => setSchedDraft(d => ({ ...d, plantId: null }))}
                    style={{ padding: "5px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `2px solid ${schedDraft.plantId === null ? "#2e7d32" : "#ddd"}`, background: schedDraft.plantId === null ? "#e8f5e9" : "#fff", color: schedDraft.plantId === null ? "#2e7d32" : "#888" }}>
                    全体
                  </button>
                  {plants.filter(p => !p.finished).map(p => (
                    <button key={p.id} onClick={() => setSchedDraft(d => ({ ...d, plantId: p.id }))}
                      style={{ padding: "5px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `2px solid ${schedDraft.plantId === p.id ? "#2e7d32" : "#ddd"}`, background: schedDraft.plantId === p.id ? "#e8f5e9" : "#fff", color: schedDraft.plantId === p.id ? "#2e7d32" : "#888" }}>
                      {p.emoji} {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 5 }}>メモ（任意）</div>
                <input value={schedDraft.note} onChange={e => setSchedDraft(d => ({ ...d, note: e.target.value }))}
                  placeholder="例：2回目の収穫予定"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: "1px solid #dceedd", fontSize: 13, color: "#333", background: "#fff", boxSizing: "border-box", outline: "none" }} />
              </div>
              <button onClick={handleAddSched}
                style={{ width: "100%", padding: "11px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#2e7d32,#66bb6a)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                💾 予定を保存
              </button>
            </div>
          )}

          {/* 予定リスト */}
          {selScheds.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#5a7a5a", marginBottom: 8 }}>📌 予定</div>
              {selScheds.map((s) => {
                const plant = plants.find(p => p.id === s.plantId);
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "8px 12px", background: scheduleColor[s.type] + "12", borderRadius: 12, border: `1px solid ${scheduleColor[s.type]}30` }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: scheduleColor[s.type], flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: scheduleColor[s.type] }}>{scheduleLabel[s.type]}</span>
                        {plant && <span style={{ fontSize: 11, color: "#888" }}>{plant.emoji} {plant.name}</span>}
                        {!plant && s.plantId === null && <span style={{ fontSize: 11, color: "#aaa" }}>全体</span>}
                      </div>
                      {s.note && <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{s.note}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                      <button onClick={() => startEditSched(s)}
                        style={{ fontSize: 11, padding: "3px 9px", borderRadius: 8, border: "1px solid #dceedd", background: "#f5fbf5", color: "#2e7d32", cursor: "pointer", fontWeight: 600 }}>
                        編集
                      </button>
                      <button onClick={() => onDeleteSchedule(s.id)}
                        style={{ fontSize: 11, padding: "3px 9px", borderRadius: 8, border: "1px solid #ffd0d0", background: "#fff5f5", color: "#e53935", cursor: "pointer", fontWeight: 600 }}>
                        削除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 編集モーダル */}
          {editingSchedId && editDraft && (
            <div onClick={cancelEdit}
              style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div onClick={e => e.stopPropagation()}
                style={{ background: "#fff", borderRadius: 20, padding: 22, width: "100%", maxWidth: 340, boxShadow: "0 8px 32px #0003" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1b4f1b", marginBottom: 16 }}>✏️ 予定を編集</div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#5a7a5a", marginBottom: 6 }}>種類</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {Object.entries(scheduleLabel).map(([k, v]) => (
                      <button key={k} onClick={() => setEditDraft(d => ({ ...d, type: k }))}
                        style={{ padding: "5px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `2px solid ${editDraft.type === k ? scheduleColor[k] : "#ddd"}`, background: editDraft.type === k ? scheduleColor[k] + "18" : "#fff", color: editDraft.type === k ? scheduleColor[k] : "#888" }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#5a7a5a", marginBottom: 6 }}>対象野菜</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={() => setEditDraft(d => ({ ...d, plantId: null }))}
                      style={{ padding: "5px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `2px solid ${editDraft.plantId === null ? "#2e7d32" : "#ddd"}`, background: editDraft.plantId === null ? "#e8f5e9" : "#fff", color: editDraft.plantId === null ? "#2e7d32" : "#888" }}>
                      全体
                    </button>
                    {plants.filter(p => !p.finished).map(p => (
                      <button key={p.id} onClick={() => setEditDraft(d => ({ ...d, plantId: p.id }))}
                        style={{ padding: "5px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `2px solid ${editDraft.plantId === p.id ? "#2e7d32" : "#ddd"}`, background: editDraft.plantId === p.id ? "#e8f5e9" : "#fff", color: editDraft.plantId === p.id ? "#2e7d32" : "#888" }}>
                        {p.emoji} {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#5a7a5a", marginBottom: 6 }}>メモ</div>
                  <input value={editDraft.note} onChange={e => setEditDraft(d => ({ ...d, note: e.target.value }))}
                    placeholder="例：2回目の収穫予定"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #dceedd", fontSize: 13, color: "#333", background: "#f9fdf9", boxSizing: "border-box", outline: "none" }} />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={cancelEdit}
                    style={{ flex: 1, padding: "12px", borderRadius: 14, border: "1px solid #ddd", background: "#fff", fontSize: 13, cursor: "pointer" }}>
                    キャンセル
                  </button>
                  <button onClick={handleSaveEdit}
                    style={{ flex: 2, padding: "12px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#2e7d32,#66bb6a)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ✅ 保存する
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 実績ログ */}
          {selLogs.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#5a7a5a", marginBottom: 8 }}>📋 記録</div>
              {selLogs.map(({ plant, log }, i) => (
                <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < selLogs.length - 1 ? "1px solid #f0f7f0" : "none" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 24, cursor: "pointer" }} onClick={() => onSelectPlant(plant.id)}>{plant.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: "#1b4f1b", cursor: "pointer", textDecoration: "underline dotted" }} onClick={() => onSelectPlant(plant.id)}>{plant.name}</span>
                        <span style={{ fontSize: 11, background: typeColor[log.type] + "22", color: typeColor[log.type], borderRadius: 8, padding: "1px 8px", fontWeight: 600 }}>{typeLabel[log.type]}</span>
                        {log.watered && <span style={{ fontSize: 11, background: "#e3f2fd", color: "#1976d2", borderRadius: 8, padding: "1px 6px" }}>💧</span>}
                      </div>
                      {log.note && <div style={{ fontSize: 12, color: "#555", marginBottom: 3 }}>{log.note}</div>}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {log.weather && <span style={{ fontSize: 11, color: "#888" }}>{log.weather}</span>}
                        {log.temp !== "" && log.temp !== undefined && <span style={{ fontSize: 11, color: "#888" }}>🌡 {log.temp}℃</span>}
                        {log.height && <span style={{ fontSize: 11, color: "#4caf50" }}>📏 {log.height}cm</span>}
                        {log.harvest && <span style={{ fontSize: 11, color: "#ff9800" }}>🎉 {log.harvest}個収穫</span>}
                      </div>
                    </div>
                  </div>
                  {log.photos?.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {log.photos.map((src, pi) => (
                        <img key={pi} src={src} alt="" onClick={() => setCalLightbox({ photos: log.photos, index: pi })}
                          style={{ width: 58, height: 58, borderRadius: 8, objectFit: "cover", cursor: "pointer", boxShadow: "0 1px 4px #0002" }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {selScheds.length === 0 && selLogs.length === 0 && (
            <div style={{ fontSize: 13, color: "#ccc", textAlign: "center", padding: "14px 0" }}>この日の記録・予定はありません</div>
          )}
        </div>
      )}
      {calLightbox && <Lightbox photos={calLightbox.photos} startIndex={calLightbox.index} onClose={() => setCalLightbox(null)} />}
    </div>
  );
}

const navBtn = {
  background: "#e8f5e9", color: "#2e7d32", border: "none", borderRadius: 10,
  width: 36, height: 36, fontSize: 22, fontWeight: 700, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

// ── ログフォーム ──────────────────────────────────────────────
function LogForm({ title, value, onChange, onSave, onCancel, saveLabel = "💾 保存" }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 17, color: "#1b4f1b", marginBottom: 18 }}>{title}</div>
      <Field label="日付">
        <input type="date" value={value.date} onChange={e => onChange({ ...value, date: e.target.value })} style={inputStyle} />
      </Field>
      <Field label="記録の種類">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(typeLabel).map(([k, v]) => (
            <button key={k} onClick={() => onChange({ ...value, type: k })}
              style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `2px solid ${value.type === k ? typeColor[k] : "#ddd"}`, background: value.type === k ? typeColor[k] + "22" : "#fff", color: value.type === k ? typeColor[k] : "#888" }}>
              {v}
            </button>
          ))}
        </div>
      </Field>
      <Field label="天気">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {WEATHER_OPTIONS.map(w => (
            <button key={w} onClick={() => onChange({ ...value, weather: w })}
              style={{ padding: "6px 12px", borderRadius: 16, fontSize: 12, cursor: "pointer", border: `2px solid ${value.weather === w ? "#66bb6a" : "#ddd"}`, background: value.weather === w ? "#e8f5e9" : "#fff" }}>
              {w}
            </button>
          ))}
        </div>
      </Field>
      <Field label="気温 (℃)">
        <input type="number" value={value.temp} onChange={e => onChange({ ...value, temp: e.target.value })} placeholder="例: 22" style={inputStyle} />
      </Field>
      <Field label="水やり">
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={value.watered} onChange={e => onChange({ ...value, watered: e.target.checked })} style={{ width: 18, height: 18 }} />
          <span style={{ fontSize: 14, color: "#444" }}>今日水やりした</span>
        </label>
      </Field>
      {value.type === "growth" && (
        <Field label="草丈 (cm)">
          <input type="number" value={value.height} onChange={e => onChange({ ...value, height: e.target.value })} placeholder="例: 25" style={inputStyle} />
        </Field>
      )}
      {value.type === "harvest" && (
        <Field label="収穫数（個）">
          <input type="number" value={value.harvest} onChange={e => onChange({ ...value, harvest: e.target.value })} placeholder="例: 5" style={inputStyle} />
        </Field>
      )}
      <Field label="メモ">
        <textarea value={value.note} onChange={e => onChange({ ...value, note: e.target.value })} placeholder="気づいたこと、変化など…" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>
      {/* 写真 */}
      <Field label="写真">
        <PhotoUploader photos={value.photos || []} onChange={photos => onChange({ ...value, photos })} />
      </Field>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, background: "#f0f7f0", color: "#5a7a5a", border: "none", borderRadius: 16, padding: "14px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          キャンセル
        </button>
        <button onClick={onSave} style={{ flex: 2, background: "linear-gradient(135deg,#2e7d32,#66bb6a)", color: "#fff", border: "none", borderRadius: 16, padding: "14px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 14px #2e7d3240" }}>
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

// ── 植物カード（ダッシュボード用）────────────────────────────
function PlantCard({ plant, onClick, finished = false }) {
  const lastLog = plant.logs[plant.logs.length - 1];
  const totalHarvest = plant.logs.filter(l => l.type === "harvest").reduce((s, l) => s + (Number(l.harvest) || 0), 0);

  return (
    <div onClick={onClick}
      style={{ background: finished ? "#f8f8f8" : "#fff", borderRadius: 18, boxShadow: "0 2px 12px #0001", cursor: "pointer", position: "relative", overflow: "hidden", opacity: finished ? 0.85 : 1 }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: finished ? "#bdbdbd" : lastLog?.type === "harvest" ? "#ff9800" : "#66bb6a", borderRadius: "18px 18px 0 0", zIndex: 1 }} />
      {finished && (
        <div style={{ position: "absolute", top: 8, right: 10, fontSize: 10, background: "#e0e0e0", color: "#757575", borderRadius: 8, padding: "2px 7px", fontWeight: 600, zIndex: 1 }}>終了</div>
      )}
      <div style={{ padding: "18px 14px 14px" }}>
        <div style={{ fontSize: 36, marginBottom: 4, textAlign: "center" }}>{plant.emoji}</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: finished ? "#777" : "#1b4f1b", textAlign: "center", marginBottom: 4 }}>{plant.name}</div>
        <div style={{ fontSize: 11, color: "#888", textAlign: "center", marginBottom: 8 }}>
          {finished
            ? `${formatDate(plant.plantedDate)}〜${formatDate(plant.finishedDate)}（${growDays(plant)}日間）`
            : `植付け ${formatDate(plant.plantedDate)}（${daysSince(plant.plantedDate)}日目）`}
        </div>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: finished ? "#bbb" : "#ff9800" }}>{totalHarvest}</div>
            <div style={{ fontSize: 10, color: "#aaa" }}>収穫数</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: finished ? "#bbb" : "#2196f3" }}>{plant.logs.length}</div>
            <div style={{ fontSize: 10, color: "#aaa" }}>記録数</div>
          </div>
        </div>
        {!finished && lastLog && (
          <div style={{ marginTop: 10, background: "#f5fbf5", borderRadius: 10, padding: "6px 8px", fontSize: 11, color: "#5a7a5a" }}>
            <span style={{ color: typeColor[lastLog.type] }}>●</span> 最新: {typeLabel[lastLog.type]} {formatDate(lastLog.date)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── メインアプリ ──────────────────────────────────────────────
export default function App() {
  const [plants, setPlants] = useState(INITIAL_PLANTS);
  const [schedules, setSchedules] = useState(INITIAL_SCHEDULES);
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState("dashboard");
  const [dashTab, setDashTab] = useState("active");
  const [newPlant, setNewPlant] = useState({ name: "", emoji: "🌱", plantedDate: new Date().toISOString().slice(0, 10) });
  const [logDraft, setLogDraft] = useState(blankLog());
  const [editingLogId, setEditingLogId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [finishConfirm, setFinishConfirm] = useState(false);
  const [finishDate, setFinishDate] = useState(new Date().toISOString().slice(0, 10));
  const [reviveConfirm, setReviveConfirm] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { photos, index }
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [settings, setSettings] = useState({
    notifyEnabled: false,
    notifyOnDay: true,
    notifyDayBefore: true,
    notify3Before: false,
    notifyTime: "08:00",
  });

  const selectedPlant = plants.find(p => p.id === selectedId);
  const activePlants = plants.filter(p => !p.finished);
  const finishedPlants = plants.filter(p => p.finished);

  function addPlant() {
    if (!newPlant.name.trim()) return;
    setPlants(prev => [...prev, {
      id: Date.now(), name: newPlant.name, emoji: newPlant.emoji, plantedDate: newPlant.plantedDate,
      finished: false, finishedDate: null,
      logs: [{ id: newLogId(), date: newPlant.plantedDate, type: "plant", note: "植え付け", weather: "☀️ 晴れ", temp: "", watered: false, photos: [] }],
    }]);
    setNewPlant({ name: "", emoji: "🌱", plantedDate: new Date().toISOString().slice(0, 10) });
    setView("dashboard");
  }

  function addLog() {
    if (!selectedPlant) return;
    const log = { ...logDraft, id: newLogId() };
    setPlants(prev => prev.map(p => p.id === selectedId ? { ...p, logs: [...p.logs, log].sort((a, b) => a.date.localeCompare(b.date)) } : p));
    setLogDraft(blankLog());
    setView("detail");
  }

  function saveEditLog() {
    setPlants(prev => prev.map(p =>
      p.id === selectedId
        ? { ...p, logs: p.logs.map(l => l.id === editingLogId ? { ...logDraft, id: editingLogId } : l).sort((a, b) => a.date.localeCompare(b.date)) }
        : p
    ));
    setEditingLogId(null);
    setLogDraft(blankLog());
    setView("detail");
  }

  function deleteLog(logId) {
    setPlants(prev => prev.map(p => p.id === selectedId ? { ...p, logs: p.logs.filter(l => l.id !== logId) } : p));
    setDeleteConfirm(null);
  }

  function startEdit(log) {
    setEditingLogId(log.id);
    setLogDraft({ ...log, photos: log.photos || [] });
    setView("editLog");
  }

  function finishPlant() {
    setPlants(prev => prev.map(p => p.id === selectedId ? { ...p, finished: true, finishedDate: finishDate } : p));
    setFinishConfirm(false);
    setDashTab("finished");
    setView("dashboard");
  }

  function revivePlant() {
    setPlants(prev => prev.map(p => p.id === selectedId ? { ...p, finished: false, finishedDate: null } : p));
    setReviveConfirm(false);
    setDashTab("active");
    setView("dashboard");
  }

  function addSchedule(sched) {
    setSchedules(prev => [...prev, sched].sort((a, b) => a.date.localeCompare(b.date)));
  }

  function deleteSchedule(id) {
    setSchedules(prev => prev.filter(s => s.id !== id));
  }

  function editSchedule(id, draft) {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...draft } : s));
  }

  function handleSelectPlantFromCal(plantId) {
    setSelectedId(plantId);
    setView("detail");
  }

  const totalHarvest = p => p.logs.filter(l => l.type === "harvest").reduce((s, l) => s + (Number(l.harvest) || 0), 0);

  // 予定通知チェック（アプリ起動時 + 毎分）
  const checkNotifications = useCallback(() => {
    if (!settings.notifyEnabled || Notification?.permission !== "granted") return;
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    if (hhmm !== settings.notifyTime) return;
    const todayStr = now.toISOString().slice(0, 10);
    const checkDates = [];
    if (settings.notifyOnDay)    checkDates.push({ offset: 0, label: "本日" });
    if (settings.notifyDayBefore) checkDates.push({ offset: 1, label: "明日" });
    if (settings.notify3Before)  checkDates.push({ offset: 3, label: "3日後" });
    checkDates.forEach(({ offset, label }) => {
      const target = new Date(now.getTime() + offset * 86400000).toISOString().slice(0, 10);
      const hits = schedules.filter(s => s.date === target);
      hits.forEach(s => {
        const plant = plants.find(p => p.id === s.plantId);
        const who = plant ? `${plant.emoji}${plant.name}` : "全体";
        fireNotification(
          `${scheduleLabel[s.type]}（${label}）`,
          `${who}${s.note ? " — " + s.note : ""}`
        );
      });
    });
  }, [settings, schedules, plants]);

  useEffect(() => {
    checkNotifications();
    const timer = setInterval(checkNotifications, 60000);
    return () => clearInterval(timer);
  }, [checkNotifications]);

  // ポップアップ表示中は背景スクロールを禁止
  useEffect(() => {
    if (showUpcoming) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [showUpcoming]);

  function handleBack() {
    if (view === "addLog" || view === "editLog") { setLogDraft(blankLog()); setEditingLogId(null); return setView("detail"); }
    if (view === "addPlant") return setView("dashboard");
  }

  const isTabView = view === "dashboard" || view === "calendar" || view === "detail" || view === "settings";
  const showBack = ["addPlant", "addLog", "editLog"].includes(view);

  return (
    <div style={{ fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif", background: "#f0f7f0", minHeight: "100vh", maxWidth: 480, margin: "0 auto", paddingBottom: 90 }}>

      {/* ヘッダ */}
      <div style={{ background: "linear-gradient(135deg,#2e7d32 0%,#66bb6a 100%)", padding: "20px 20px 30px", color: "#fff", borderRadius: "0 0 28px 28px", boxShadow: "0 4px 20px #2e7d3230" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>🥬 やさい日誌</div>
            <div style={{ fontSize: 12, opacity: .85, marginTop: 2 }}>栽培中 {activePlants.length}種類 ／ 終了 {finishedPlants.length}種類</div>
          </div>
          {view === "dashboard" && (
            <button onClick={() => setView("addPlant")} style={{ background: "#fff", color: "#2e7d32", border: "none", borderRadius: 20, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px #0002" }}>
              ＋ 追加
            </button>
          )}
          {showBack && (
            <button onClick={handleBack} style={{ background: "#ffffff30", color: "#fff", border: "none", borderRadius: 20, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              ← 戻る
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: "20px 16px 0" }}>

        {/* ダッシュボード */}
        {view === "dashboard" && (
          <div>
            <div style={{ display: "flex", background: "#e8f5e9", borderRadius: 14, padding: 4, marginBottom: 18 }}>
              {[{ id: "active", label: `🌱 栽培中 ${activePlants.length}` }, { id: "finished", label: `🏁 栽培終了 ${finishedPlants.length}` }].map(t => (
                <button key={t.id} onClick={() => setDashTab(t.id)}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all .15s", background: dashTab === t.id ? "#fff" : "transparent", color: dashTab === t.id ? "#2e7d32" : "#7a9a7a", boxShadow: dashTab === t.id ? "0 1px 6px #0001" : "none" }}>
                  {t.label}
                </button>
              ))}
            </div>
            {dashTab === "active" && (
              activePlants.length === 0
                ? <div style={{ textAlign: "center", color: "#bbb", padding: "40px 0", fontSize: 14 }}>栽培中の野菜はありません<br />「＋ 追加」から始めましょう！</div>
                : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {activePlants.map(p => <PlantCard key={p.id} plant={p} onClick={() => { setSelectedId(p.id); setView("detail"); }} />)}
                </div>
            )}
            {dashTab === "finished" && (
              finishedPlants.length === 0
                ? <div style={{ textAlign: "center", color: "#bbb", padding: "40px 0", fontSize: 14 }}>栽培終了の野菜はありません</div>
                : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {finishedPlants.map(p => <PlantCard key={p.id} plant={p} finished onClick={() => { setSelectedId(p.id); setView("detail"); }} />)}
                </div>
            )}
          </div>
        )}

        {/* カレンダー */}
        {view === "calendar" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#5a7a5a", fontWeight: 600 }}>📅 カレンダー — 全野菜の記録</div>
              {(() => {
                const todayStr = new Date().toISOString().slice(0, 10);
                const in7days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
                const cnt = schedules.filter(s => s.date >= todayStr && s.date <= in7days).length;
                return (
                  <button onClick={() => setShowUpcoming(true)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 20, border: "none", background: "#2e7d32", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px #2e7d3230", position: "relative" }}>
                    📌 7日間の予定
                    {cnt > 0 && (
                      <span style={{ background: "#ff9800", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cnt}</span>
                    )}
                  </button>
                );
              })()}
            </div>
            <CalendarView plants={plants} schedules={schedules} onSelectPlant={handleSelectPlantFromCal} onAddSchedule={addSchedule} onDeleteSchedule={deleteSchedule} onEditSchedule={editSchedule} />
          </div>
        )}

        {/* 今後7日間の予定ポップアップ */}
        {showUpcoming && (() => {
          const todayStr = new Date().toISOString().slice(0, 10);
          const in7days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
          const upcoming = schedules
            .filter(s => s.date >= todayStr && s.date <= in7days)
            .sort((a, b) => a.date.localeCompare(b.date));
          return (
            <div onClick={() => setShowUpcoming(false)}
              style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <div onClick={e => e.stopPropagation()}
                style={{ background: "#f0f7f0", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 480, maxHeight: "75vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 32px #0003" }}>
                {/* ハンドル */}
                <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
                  <div style={{ width: 36, height: 4, borderRadius: 2, background: "#ccc" }} />
                </div>
                {/* ヘッダ */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px 14px" }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#1b4f1b" }}>
                    📌 今後7日間の予定
                    <span style={{ fontWeight: 400, fontSize: 12, color: "#aaa", marginLeft: 8 }}>{upcoming.length}件</span>
                  </div>
                  <button onClick={() => setShowUpcoming(false)}
                    style={{ background: "#e8f5e9", border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: 16, cursor: "pointer", color: "#2e7d32", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    ✕
                  </button>
                </div>
                {/* リスト */}
                <div style={{ overflowY: "auto", padding: "0 16px 32px" }}>
                  {upcoming.length === 0
                    ? <div style={{ fontSize: 14, color: "#ccc", textAlign: "center", padding: "32px 0" }}>今後7日間の予定はありません</div>
                    : upcoming.map(s => {
                        const plant = plants.find(p => p.id === s.plantId);
                        const daysLeft = Math.ceil((new Date(s.date) - new Date(todayStr)) / 86400000);
                        return (
                          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, padding: "12px 14px", background: "#fff", borderRadius: 16, boxShadow: "0 1px 6px #0001", borderLeft: `4px solid ${scheduleColor[s.type]}` }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: scheduleColor[s.type] }}>{scheduleLabel[s.type]}</span>
                                {plant && <span style={{ fontSize: 12, color: "#888" }}>{plant.emoji} {plant.name}</span>}
                                {!plant && <span style={{ fontSize: 12, color: "#aaa" }}>全体</span>}
                              </div>
                              {s.note && <div style={{ fontSize: 12, color: "#666" }}>{s.note}</div>}
                              <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{s.date}</div>
                            </div>
                            <div style={{ textAlign: "center", flexShrink: 0 }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: daysLeft === 0 ? "#e53935" : daysLeft === 1 ? "#e65100" : "#2e7d32" }}>
                                {daysLeft === 0 ? "今日" : daysLeft === 1 ? "明日" : `${daysLeft}日後`}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              </div>
            </div>
          );
        })()}

        {/* 野菜詳細 */}
        {view === "detail" && selectedPlant && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 48 }}>{selectedPlant.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 20, color: "#1b4f1b" }}>{selectedPlant.name}</div>
                  {selectedPlant.finished && <span style={{ fontSize: 11, background: "#e0e0e0", color: "#757575", borderRadius: 8, padding: "2px 8px", fontWeight: 600 }}>栽培終了</span>}
                </div>
                <div style={{ fontSize: 12, color: "#888" }}>
                  {selectedPlant.finished
                    ? `${formatDate(selectedPlant.plantedDate)} 〜 ${formatDate(selectedPlant.finishedDate)}（${growDays(selectedPlant)}日間）`
                    : `植付け ${formatDate(selectedPlant.plantedDate)} ／ ${daysSince(selectedPlant.plantedDate)}日目`}
                </div>
                {totalHarvest(selectedPlant) > 0 && <div style={{ fontSize: 12, color: "#ff9800", fontWeight: 600 }}>🎉 累計収穫 {totalHarvest(selectedPlant)}個</div>}
              </div>
              {!selectedPlant.finished && (
                <button onClick={() => { setLogDraft(blankLog()); setView("addLog"); }}
                  style={{ background: "#2e7d32", color: "#fff", border: "none", borderRadius: 16, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  ＋ 記録
                </button>
              )}
            </div>

            {/* 栽培終了 / 再開ボタン */}
            <div style={{ marginBottom: 18 }}>
              {!selectedPlant.finished ? (
                <button onClick={() => { setFinishDate(new Date().toISOString().slice(0, 10)); setFinishConfirm(true); }}
                  style={{ width: "100%", padding: "11px", borderRadius: 14, border: "2px solid #ffccbc", background: "#fff8f6", color: "#e64a19", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  🏁 栽培終了にする
                </button>
              ) : (
                <button onClick={() => setReviveConfirm(true)}
                  style={{ width: "100%", padding: "11px", borderRadius: 14, border: "2px solid #c8e6c9", background: "#f1f8e9", color: "#388e3c", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  🌱 栽培を再開する
                </button>
              )}
            </div>

            {/* 栽培終了確認 */}
            {finishConfirm && (
              <div style={{ position: "fixed", inset: 0, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24 }}>
                <div style={{ background: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 340, boxShadow: "0 8px 32px #0003" }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#1b4f1b", marginBottom: 6 }}>🏁 栽培終了</div>
                  <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>「{selectedPlant.name}」を栽培終了にします。<br />終了日を確認してください。</div>
                  <Field label="栽培終了日">
                    <input type="date" value={finishDate} onChange={e => setFinishDate(e.target.value)} style={inputStyle} />
                  </Field>
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button onClick={() => setFinishConfirm(false)} style={{ flex: 1, padding: "12px", borderRadius: 14, border: "1px solid #ddd", background: "#fff", fontSize: 14, cursor: "pointer" }}>キャンセル</button>
                    <button onClick={finishPlant} style={{ flex: 1, padding: "12px", borderRadius: 14, border: "none", background: "#e64a19", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>終了する</button>
                  </div>
                </div>
              </div>
            )}

            {/* 栽培再開確認 */}
            {reviveConfirm && (
              <div style={{ position: "fixed", inset: 0, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24 }}>
                <div style={{ background: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 340, boxShadow: "0 8px 32px #0003" }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#1b4f1b", marginBottom: 8 }}>🌱 栽培を再開</div>
                  <div style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>「{selectedPlant.name}」を栽培中に戻します。よろしいですか？</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setReviveConfirm(false)} style={{ flex: 1, padding: "12px", borderRadius: 14, border: "1px solid #ddd", background: "#fff", fontSize: 14, cursor: "pointer" }}>キャンセル</button>
                    <button onClick={revivePlant} style={{ flex: 1, padding: "12px", borderRadius: 14, border: "none", background: "#2e7d32", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>再開する</button>
                  </div>
                </div>
              </div>
            )}

            {/* 統計バー */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {Object.keys(typeColor).map(t => {
                const cnt = selectedPlant.logs.filter(l => l.type === t).length;
                return (
                  <div key={t} style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "10px 6px", textAlign: "center", boxShadow: "0 1px 6px #0001" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: typeColor[t] }}>{cnt}</div>
                    <div style={{ fontSize: 9, color: "#aaa", marginTop: 2 }}>{typeLabel[t].split(" ")[1]}</div>
                  </div>
                );
              })}
            </div>

            {/* タイムライン */}
            <div style={{ fontSize: 13, color: "#5a7a5a", fontWeight: 600, marginBottom: 10 }}>成長タイムライン</div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 17, top: 0, bottom: 0, width: 2, background: "#d4edda", borderRadius: 2 }} />
              {[...selectedPlant.logs].reverse().map((log) => (
                <div key={log.id} style={{ display: "flex", gap: 12, marginBottom: 14, position: "relative" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: typeColor[log.type], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, boxShadow: "0 2px 8px #0002", zIndex: 1 }}>
                    {typeLabel[log.type].split(" ")[0]}
                  </div>
                  <div style={{ background: "#fff", borderRadius: 14, padding: "10px 14px", flex: 1, boxShadow: "0 1px 8px #0001" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: typeColor[log.type] }}>{typeLabel[log.type]}</span>
                      <span style={{ fontSize: 11, color: "#bbb" }}>{formatDate(log.date)}</span>
                      {log.watered && <span style={{ fontSize: 11, background: "#e3f2fd", color: "#1976d2", borderRadius: 8, padding: "1px 6px" }}>💧</span>}
                      {!selectedPlant.finished && (
                        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                          <button onClick={() => startEdit(log)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 10, border: "1px solid #dceedd", background: "#f5fbf5", color: "#2e7d32", cursor: "pointer", fontWeight: 600 }}>編集</button>
                          <button onClick={() => setDeleteConfirm(log.id)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 10, border: "1px solid #ffd0d0", background: "#fff5f5", color: "#e53935", cursor: "pointer", fontWeight: 600 }}>削除</button>
                        </div>
                      )}
                    </div>
                    {log.note && <div style={{ fontSize: 13, color: "#444", marginBottom: 4 }}>{log.note}</div>}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: log.photos?.length > 0 ? 8 : 0 }}>
                      {log.weather && <span style={{ fontSize: 11, color: "#888" }}>{log.weather}</span>}
                      {log.temp !== "" && log.temp !== undefined && <span style={{ fontSize: 11, color: "#888" }}>🌡 {log.temp}℃</span>}
                      {log.height && <span style={{ fontSize: 11, color: "#4caf50" }}>📏 {log.height}cm</span>}
                      {log.harvest && <span style={{ fontSize: 11, color: "#ff9800" }}>🎉 {log.harvest}個</span>}
                    </div>
                    {/* 写真サムネイル */}
                    {log.photos?.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {log.photos.map((src, pi) => (
                          <div key={pi} style={{ position: "relative" }}>
                            <img src={src} alt="" onClick={() => setLightbox({ photos: log.photos, index: pi })}
                              style={{ width: 68, height: 68, borderRadius: 10, objectFit: "cover", cursor: "pointer", boxShadow: "0 1px 6px #0002", border: "2px solid #e8f5e9" }} />
                            {log.photos.length > 1 && pi === 0 && (
                              <div style={{ position: "absolute", bottom: 4, right: 4, background: "#0007", color: "#fff", fontSize: 9, borderRadius: 6, padding: "1px 5px", fontWeight: 700 }}>
                                📷 {log.photos.length}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {deleteConfirm === log.id && (
                    <div style={{ position: "absolute", inset: 0, background: "#fff5f5ee", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, zIndex: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#c62828" }}>この記録を削除しますか？</div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => setDeleteConfirm(null)} style={{ padding: "8px 20px", borderRadius: 12, border: "1px solid #ddd", background: "#fff", fontSize: 13, cursor: "pointer" }}>キャンセル</button>
                        <button onClick={() => deleteLog(log.id)} style={{ padding: "8px 20px", borderRadius: 12, border: "none", background: "#e53935", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>削除する</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 設定 */}
        {view === "settings" && (
          <SettingsView
            settings={settings}
            onUpdate={setSettings}
            schedules={schedules}
            plants={plants}
          />
        )}

        {/* ログ追加 */}
        {view === "addLog" && selectedPlant && (
          <LogForm title={`📝 記録を追加 — ${selectedPlant.name}`} value={logDraft} onChange={setLogDraft}
            onSave={addLog} onCancel={() => { setLogDraft(blankLog()); setView("detail"); }} saveLabel="💾 記録を保存" />
        )}

        {/* ログ編集 */}
        {view === "editLog" && selectedPlant && (
          <LogForm title={`✏️ 記録を編集 — ${selectedPlant.name}`} value={logDraft} onChange={setLogDraft}
            onSave={saveEditLog} onCancel={() => { setLogDraft(blankLog()); setEditingLogId(null); setView("detail"); }} saveLabel="✅ 変更を保存" />
        )}

        {/* 野菜追加 */}
        {view === "addPlant" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#1b4f1b", marginBottom: 18 }}>🌱 新しい野菜を追加</div>
            <Field label="野菜の名前">
              <input value={newPlant.name} onChange={e => setNewPlant(p => ({ ...p, name: e.target.value }))} placeholder="例: キュウリ、ナス…" style={inputStyle} />
            </Field>
            <Field label="絵文字">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["🌱", "🍅", "🥬", "🥒", "🍆", "🌽", "🧅", "🥕", "🫑", "🌿", "🍓", "🫐"].map(e => (
                  <button key={e} onClick={() => setNewPlant(p => ({ ...p, emoji: e }))}
                    style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${newPlant.emoji === e ? "#2e7d32" : "#ddd"}`, background: newPlant.emoji === e ? "#e8f5e9" : "#fff", fontSize: 22, cursor: "pointer" }}>
                    {e}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="植え付け日">
              <input type="date" value={newPlant.plantedDate} onChange={e => setNewPlant(p => ({ ...p, plantedDate: e.target.value }))} style={inputStyle} />
            </Field>
            <button onClick={addPlant} style={{ width: "100%", background: "linear-gradient(135deg,#2e7d32,#66bb6a)", color: "#fff", border: "none", borderRadius: 16, padding: "14px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 8, boxShadow: "0 4px 14px #2e7d3240" }}>
              🌱 追加する
            </button>
          </div>
        )}
      </div>

      {/* ボトムタブ */}
      {isTabView && (
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#fff", borderTop: "1px solid #e8f5e9", display: "flex", boxShadow: "0 -4px 20px #0001", zIndex: 100 }}>
          {[
            { id: "dashboard", icon: "🏠", label: "ホーム" },
            { id: "calendar",  icon: "📅", label: "カレンダー" },
            { id: "settings",  icon: "⚙️", label: "設定" },
          ].map(tab => {
            const isActive = view === tab.id || (tab.id === "dashboard" && view === "detail");
            return (
              <button key={tab.id} onClick={() => setView(tab.id)}
                style={{ flex: 1, padding: "12px 0 8px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ fontSize: 20 }}>{tab.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: isActive ? "#2e7d32" : "#aaa" }}>{tab.label}</div>
                {isActive && <div style={{ width: 24, height: 3, background: "#2e7d32", borderRadius: 2 }} />}
              </button>
            );
          })}
        </div>
      )}

      {/* ライトボックス */}
      {lightbox && <Lightbox photos={lightbox.photos} startIndex={lightbox.index} onClose={() => setLightbox(null)} />}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 12, border: "2px solid #dceedd",
  fontSize: 14, color: "#333", outline: "none", background: "#f9fdf9", boxSizing: "border-box",
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#5a7a5a", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}