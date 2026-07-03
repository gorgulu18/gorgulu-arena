const palette = ["#3fc7a1", "#ff765f", "#f8c34a", "#5a8cff", "#ff8ab3", "#94c949"];

const defaultMembers = [
  { id: "anne", name: "Anne", face: "😊", bg: "#ff8ab3", shirt: "#3fc7a1" },
  { id: "baba", name: "Baba", face: "😄", bg: "#5a8cff", shirt: "#f8c34a" },
  { id: "cocuk-1", name: "Çocuk 1", face: "😎", bg: "#94c949", shirt: "#ff765f" },
  { id: "cocuk-2", name: "Çocuk 2", face: "🤩", bg: "#f8c34a", shirt: "#5a8cff" },
];

const defaultCategories = [
  {
    id: "yildiz",
    title: "Bugünün yıldızı kimdi?",
    hint: "Eve en güzel enerjiyi kim kattı?",
    badge: "⭐",
    accent: "#f8c34a",
  },
  {
    id: "tatli-huysuz",
    title: "Bugünün tatlı huysuzu kimdi?",
    hint: "Huysuzluğu bile komik olan kişiye küçük bir rozet.",
    badge: "🌶️",
    accent: "#ff765f",
  },
  {
    id: "verimli",
    title: "Bugünün en verimlisi kimdi?",
    hint: "İşini gücünü halledip sahadan galip ayrılan kişi.",
    badge: "⚡",
    accent: "#3fc7a1",
  },
  {
    id: "sarji-biten",
    title: "Bugünün şarjı en hızlı biteni kimdi?",
    hint: "Yorgunluk kupası sevgiyle verilir.",
    badge: "🔋",
    accent: "#5a8cff",
  },
  {
    id: "yardimsever",
    title: "Bugünün gizli kahramanı kimdi?",
    hint: "Küçük bir yardımla günü güzelleştiren kişi.",
    badge: "🦸",
    accent: "#94c949",
  },
  {
    id: "kahkaha",
    title: "Bugünün kahkaha kaynağı kimdi?",
    hint: "En az bir kişiyi güldüren aday sahneye gelsin.",
    badge: "💬",
    accent: "#ff8ab3",
  },
];

const avatarFaces = ["😊", "😄", "😎", "🤩", "😇", "😋", "🥳", "🫶"];
const storageKey = "aile-arenasi-v1";
const state = loadState();
const missedDaysOnOpen = calculateMissedDays(state.lastVisit);
const cloud = {
  status: "local",
  ready: false,
  applyingRemote: false,
  unsubscribe: null,
  familyRef: null,
  saveTimer: null,
  api: null,
};

let currentVoterId = null;
let currentQuestion = 0;
let currentNoteAuthorId = state.members[0].id;
let toastTimer = null;
let deferredInstallPrompt = null;

const els = {
  todayLabel: document.querySelector("#todayLabel"),
  appMoodIcon: document.querySelector("#appMoodIcon"),
  heroMascot: document.querySelector("#heroMascot"),
  moodLine: document.querySelector("#moodLine"),
  openProfiles: document.querySelector("#openProfiles"),
  openFamily: document.querySelector("#openFamily"),
  familyDialog: document.querySelector("#familyDialog"),
  familyCodeInput: document.querySelector("#familyCodeInput"),
  familyCloudHelp: document.querySelector("#familyCloudHelp"),
  cloudStateBox: document.querySelector("#cloudStateBox"),
  saveFamilyCode: document.querySelector("#saveFamilyCode"),
  leaveFamily: document.querySelector("#leaveFamily"),
  installApp: document.querySelector("#installApp"),
  installDialog: document.querySelector("#installDialog"),
  profileDialog: document.querySelector("#profileDialog"),
  profileEditor: document.querySelector("#profileEditor"),
  saveProfiles: document.querySelector("#saveProfiles"),
  voterStrip: document.querySelector("#voterStrip"),
  questionCount: document.querySelector("#questionCount"),
  voterStatus: document.querySelector("#voterStatus"),
  progressBar: document.querySelector("#progressBar"),
  categoryTitle: document.querySelector("#categoryTitle"),
  categoryHint: document.querySelector("#categoryHint"),
  candidateGrid: document.querySelector("#candidateGrid"),
  prevQuestion: document.querySelector("#prevQuestion"),
  nextQuestion: document.querySelector("#nextQuestion"),
  resetToday: document.querySelector("#resetToday"),
  resultsStage: document.querySelector("#resultsStage"),
  revealResults: document.querySelector("#revealResults"),
  scoreGrid: document.querySelector("#scoreGrid"),
  addCategory: document.querySelector("#addCategory"),
  newCategory: document.querySelector("#newCategory"),
  saveCategory: document.querySelector("#saveCategory"),
  missedBanner: document.querySelector("#missedBanner"),
  noteAuthorStrip: document.querySelector("#noteAuthorStrip"),
  dailyNoteInput: document.querySelector("#dailyNoteInput"),
  noteCounter: document.querySelector("#noteCounter"),
  saveDailyNote: document.querySelector("#saveDailyNote"),
  clearTodayNotes: document.querySelector("#clearTodayNotes"),
  dailyNotesList: document.querySelector("#dailyNotesList"),
  toast: document.querySelector("#toast"),
  confettiCanvas: document.querySelector("#confettiCanvas"),
};

state.lastVisit = todayKey();
saveState();
registerServiceWorker();
initCloud();

function loadState() {
  const fallback = {
    members: defaultMembers,
    categories: defaultCategories,
    votes: {},
    notes: {},
    lastVisit: null,
    familyCode: "",
  };

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved) return fallback;
    return {
      members: normalizeMembers(saved.members),
      categories: Array.isArray(saved.categories) && saved.categories.length ? saved.categories : defaultCategories,
      votes: saved.votes || {},
      notes: saved.notes || {},
      lastVisit: saved.lastVisit || null,
      familyCode: saved.familyCode || "",
    };
  } catch {
    return fallback;
  }
}

function normalizeMembers(members) {
  const source = Array.isArray(members) && members.length === 4 ? members : defaultMembers;
  return source.map((member, index) => ({
    ...defaultMembers[index],
    ...member,
    id: defaultMembers[index].id,
  }));
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (!cloud.applyingRemote) scheduleCloudSave();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {
    showToast("Offline kurulum şimdilik hazırlanamadı.");
  });
}

function hasFirebaseConfig() {
  const config = window.GORGULU_FIREBASE_CONFIG;
  return Boolean(
    config &&
      config.apiKey &&
      config.projectId &&
      !String(config.apiKey).includes("BURAYA") &&
      !String(config.projectId).includes("BURAYA")
  );
}

function getCloudPayload() {
  return {
    members: state.members,
    categories: state.categories,
    votes: state.votes,
    notes: state.notes,
    lastVisit: state.lastVisit,
    updatedAt: new Date().toISOString(),
  };
}

function applyCloudPayload(data) {
  if (!data) return;
  state.members = normalizeMembers(data.members);
  state.categories = Array.isArray(data.categories) && data.categories.length ? data.categories : defaultCategories;
  state.votes = data.votes || {};
  state.notes = data.notes || {};
  state.lastVisit = data.lastVisit || state.lastVisit;
  saveLocalStateOnly();
}

function saveLocalStateOnly() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function setCloudStatus(status, message = "") {
  cloud.status = status;
  renderCloudStatus(message);
}

function renderCloudStatus(message = "") {
  const hasCode = Boolean(state.familyCode);
  const hasConfig = hasFirebaseConfig();
  els.openFamily.classList.toggle("is-online", cloud.status === "online");
  els.openFamily.classList.toggle("is-setup", !hasConfig || cloud.status === "error");

  if (cloud.status === "online" && hasCode) {
    els.openFamily.textContent = state.familyCode;
  } else if (!hasConfig) {
    els.openFamily.textContent = "Kurulum";
  } else if (hasCode) {
    els.openFamily.textContent = "Bulut...";
  } else {
    els.openFamily.textContent = "Yerel";
  }

  const title =
    cloud.status === "online"
      ? "Bulut bağlı"
      : cloud.status === "connecting"
        ? "Buluta bağlanıyor"
        : cloud.status === "error"
          ? "Bulut hatası"
          : hasConfig
            ? "Bulut hazır"
            : "Firebase bekleniyor";
  const detail =
    message ||
    (cloud.status === "online"
      ? `${state.familyCode} odasına bağlısınız.`
      : hasConfig
        ? "Aile kodunu girince ortak oda açılacak."
        : "Firebase ayar dosyası eklendikten sonra ortak veri açılacak.");

  els.cloudStateBox.innerHTML = `
    <strong>${title}</strong>
    <small>${detail}</small>
  `;
  els.familyCloudHelp.textContent = hasConfig
    ? "Aynı aile kodunu giren herkes aynı oyları, rozetleri ve günlük cümleleri görecek."
    : "Önce Firebase ücretsiz proje ayarlarını ekleyeceğiz; sonra bu kod tüm telefonları aynı odaya bağlayacak.";
}

async function initCloud() {
  renderCloudStatus();
  if (!hasFirebaseConfig() || !state.familyCode) return;
  try {
    setCloudStatus("connecting", "Firebase REST bağlantısı deneniyor...");
    if (cloud.unsubscribe) cloud.unsubscribe();
    const config = window.GORGULU_FIREBASE_CONFIG;
    cloud.api = await createCloudApi(config, state.familyCode);
    cloud.familyRef = state.familyCode;
    cloud.ready = true;

    const remoteData = await cloud.api.getFamily();
    if (remoteData) {
      cloud.applyingRemote = true;
      applyCloudPayload(remoteData);
      cloud.applyingRemote = false;
      renderAll();
    } else {
      await cloud.api.setFamily(getCloudPayload());
    }

    cloud.unsubscribe = startCloudPolling();
    setCloudStatus("online");
  } catch (error) {
    cloud.ready = false;
    const detail = error?.message || "Bilinmeyen hata";
    setCloudStatus("error", `Bulut bağlantısı kurulamadı: ${detail}`);
  }
}

function scheduleCloudSave() {
  if (!cloud.ready && cloud.status !== "online") return;
  if (!cloud.familyRef || !cloud.api) return;
  window.clearTimeout(cloud.saveTimer);
  cloud.saveTimer = window.setTimeout(async () => {
    try {
      await cloud.api.setFamily(getCloudPayload());
      setCloudStatus("online");
    } catch (error) {
      setCloudStatus("error", `Buluta yazılamadı: ${error?.message || "İnternet veya Firebase kuralı gerekebilir."}`);
    }
  }, 450);
}

function startCloudPolling() {
  const intervalId = window.setInterval(async () => {
    if (!cloud.api || cloud.applyingRemote) return;
    try {
      const remoteData = await cloud.api.getFamily();
      if (!remoteData) return;
      cloud.applyingRemote = true;
      applyCloudPayload(remoteData);
      cloud.applyingRemote = false;
      renderAll();
      setCloudStatus("online");
    } catch (error) {
      setCloudStatus("error", `Bulut okunamadı: ${error?.message || "Bağlantı hatası"}`);
    }
  }, 5000);
  return () => window.clearInterval(intervalId);
}

async function createCloudApi(config, familyCode) {
  const auth = await signInAnonymouslyWithRest(config.apiKey);
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/families/${encodeURIComponent(familyCode)}`;

  async function request(url, options = {}) {
    return fetchWithTimeout(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${auth.idToken}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  }

  return {
    async getFamily() {
      const response = await request(baseUrl);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(await getFirebaseError(response, "Firestore okuma hatası"));
      const documentData = await response.json();
      return fromFirestoreFields(documentData.fields || {});
    },
    async setFamily(payload) {
      const response = await request(baseUrl, {
        method: "PATCH",
        body: JSON.stringify({ fields: toFirestoreFields(payload) }),
      });
      if (!response.ok) throw new Error(await getFirebaseError(response, "Firestore yazma hatası"));
      return response.json();
    },
  };
}

async function signInAnonymouslyWithRest(apiKey) {
  const response = await fetchWithTimeout(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  if (!response.ok) throw new Error(await getFirebaseError(response, "Anonim giriş hatası"));
  return response.json();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Bağlantı zaman aşımına uğradı.");
    throw new Error(error.message || "Ağ bağlantısı kurulamadı.");
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function getFirebaseError(response, fallback) {
  try {
    const body = await response.json();
    const message = body?.error?.message || fallback;
    return `${fallback} (${response.status}): ${message}`;
  } catch {
    return `${fallback} (${response.status})`;
  }
}

function toFirestoreFields(objectValue) {
  return Object.fromEntries(
    Object.entries(objectValue || {}).map(([key, value]) => [key, toFirestoreValue(value)])
  );
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => toFirestoreValue(item)) } };
  }
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "object") return { mapValue: { fields: toFirestoreFields(value) } };
  return { stringValue: String(value) };
}

function fromFirestoreFields(fields) {
  return Object.fromEntries(
    Object.entries(fields || {}).map(([key, value]) => [key, fromFirestoreValue(value)])
  );
}

function fromFirestoreValue(value) {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in value) return fromFirestoreFields(value.mapValue.fields || {});
  return null;
}

function normalizeFamilyCode(value) {
  return value
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replaceAll("Ğ", "G")
    .replaceAll("Ü", "U")
    .replaceAll("Ş", "S")
    .replaceAll("İ", "I")
    .replaceAll("Ö", "O")
    .replaceAll("Ç", "C")
    .replace(/[^A-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function saveFamilyCode() {
  const code = normalizeFamilyCode(els.familyCodeInput.value);
  if (code.length < 4) {
    els.familyCodeInput.focus();
    showToast("Aile kodu en az 4 karakter olsun.");
    return;
  }
  state.familyCode = code;
  saveState();
  els.familyDialog.close();
  renderCloudStatus("Aile kodu kaydedildi.");
  initCloud();
  showToast(`${code} aile odası seçildi.`);
}

function leaveFamily() {
  if (cloud.unsubscribe) cloud.unsubscribe();
  cloud.unsubscribe = null;
  cloud.familyRef = null;
  cloud.api = null;
  cloud.ready = false;
  cloud.status = "local";
  state.familyCode = "";
  saveState();
  els.familyDialog.close();
  renderCloudStatus("Yerel moda dönüldü.");
  showToast("Yerel moda dönüldü.");
}

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function todayVotes() {
  const key = todayKey();
  state.votes[key] ||= {};
  return state.votes[key];
}

function todayNotes() {
  const key = todayKey();
  state.notes[key] ||= [];
  return state.notes[key];
}

function dateFromKey(key) {
  if (!key) return null;
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function calculateMissedDays(lastVisitKey) {
  const lastVisit = dateFromKey(lastVisitKey);
  if (!lastVisit) return 0;
  const today = dateFromKey(todayKey());
  const oneDay = 24 * 60 * 60 * 1000;
  const dayDiff = Math.round((today - lastVisit) / oneDay);
  return Math.max(0, dayDiff - 1);
}

function renderAll() {
  renderDate();
  renderMood();
  renderCloudStatus();
  renderVoters();
  renderVoteCard();
  renderScores();
  renderNoteAuthors();
  renderDailyNotes();
  renderNoteCounter();
}

function renderDate() {
  const label = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  els.todayLabel.textContent = label;
}

function avatarMarkup(member, size = "") {
  return `
    <div class="avatar ${size}" style="--avatar-bg: ${member.bg}; --avatar-shirt: ${member.shirt}">
      <span>${member.face}</span>
    </div>
  `;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderMood() {
  const isSad = missedDaysOnOpen > 0;
  const icon = isSad ? "🥺" : "🏆";
  els.appMoodIcon.textContent = icon;
  els.heroMascot.textContent = icon;
  els.appMoodIcon.classList.toggle("is-sad", isSad);
  els.heroMascot.classList.toggle("is-sad", isSad);

  if (isSad) {
    const dayText = missedDaysOnOpen === 1 ? "1 gün" : `${missedDaysOnOpen} gün`;
    els.moodLine.textContent = `${dayText} uğramadınız; kupa biraz alındı ama bugün gönlü alınabilir.`;
    els.missedBanner.classList.add("is-visible");
    els.missedBanner.innerHTML = `
      <span>🥺</span>
      <div>
        <strong>Uygulama sizi ${dayText} beklemiş.</strong>
        <p>Bugüne bir cümle bırakınca ve oy verince morali yerine gelecek.</p>
      </div>
    `;
  } else {
    els.moodLine.textContent = "Bugün geldiniz; kupa mutlu, aile serisi devam ediyor.";
    els.missedBanner.classList.remove("is-visible");
    els.missedBanner.innerHTML = "";
  }

  updateFavicon(icon, isSad);
}

function updateFavicon(icon, isSad) {
  let favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }
  const bandage = isSad
    ? `<rect x="34" y="10" width="24" height="10" rx="5" fill="white" stroke="#d45f56" stroke-width="2" transform="rotate(24 46 15)" />`
    : "";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="18" fill="${isSad ? "#f4efe5" : "#fff8d9"}"/>
      <text x="32" y="43" text-anchor="middle" font-size="34">${icon}</text>
      ${bandage}
    </svg>
  `;
  favicon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function updateInstallButton() {
  if (isStandaloneApp()) {
    els.installApp.hidden = true;
    return;
  }
  els.installApp.hidden = false;
}

async function handleInstallClick() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    updateInstallButton();
    return;
  }
  els.installDialog.showModal();
}

function renderVoters() {
  const votes = todayVotes();
  els.voterStrip.innerHTML = state.members
    .map((member) => {
      const answered = Object.keys(votes[member.id] || {}).length;
      const isDone = answered >= state.categories.length;
      const active = member.id === currentVoterId;
      return `
        <button class="member-card ${active ? "is-active" : ""} ${isDone ? "is-done" : ""}" type="button" data-voter="${member.id}">
          ${avatarMarkup(member)}
          <span class="member-name">${member.name}</span>
        </button>
      `;
    })
    .join("");
}

function renderVoteCard() {
  const category = state.categories[currentQuestion] || state.categories[0];
  const voter = getMember(currentVoterId);
  const votes = todayVotes();
  const voterVotes = currentVoterId ? votes[currentVoterId] || {} : {};
  const chosenId = category ? voterVotes[category.id] : null;
  const answered = Object.keys(voterVotes).length;
  const total = state.categories.length;

  els.questionCount.textContent = `${Math.min(currentQuestion + 1, total)} / ${total}`;
  els.voterStatus.textContent = voter ? `${voter.name} oy veriyor` : "Oy veren seçilmedi";
  els.progressBar.style.width = voter ? `${Math.round((answered / total) * 100)}%` : "0%";
  els.categoryTitle.textContent = voter ? category.title : "Başlamak için birini seç.";
  els.categoryHint.textContent = voter ? category.hint : "Her soru tek ekranda gelir. Büyük avatara bas, oyun aksın.";
  els.prevQuestion.disabled = !voter || currentQuestion === 0;
  els.nextQuestion.disabled = !voter;
  els.nextQuestion.textContent = currentQuestion === total - 1 ? "Sonuçlara geç" : "Sonraki";

  if (!voter) {
    els.candidateGrid.innerHTML = state.members.map((member) => `
      <div class="candidate-card">
        ${avatarMarkup(member, "large")}
        <span class="candidate-name">${member.name}</span>
      </div>
    `).join("");
    return;
  }

  els.candidateGrid.innerHTML = state.members
    .map((member) => `
      <button class="candidate-card ${chosenId === member.id ? "is-selected" : ""}" type="button" data-candidate="${member.id}">
        ${avatarMarkup(member, "large")}
        <span class="candidate-name">${member.name}</span>
      </button>
    `)
    .join("");
}

function setVoter(voterId) {
  currentVoterId = voterId;
  const votes = todayVotes()[voterId] || {};
  const firstOpen = state.categories.findIndex((category) => !votes[category.id]);
  currentQuestion = firstOpen === -1 ? 0 : firstOpen;
  renderAll();
}

function castVote(candidateId) {
  if (!currentVoterId) return;
  const category = state.categories[currentQuestion];
  const votes = todayVotes();
  votes[currentVoterId] ||= {};
  votes[currentVoterId][category.id] = candidateId;
  saveState();
  renderAll();

  const member = getMember(candidateId);
  showToast(`${category.badge} ${member.name} için oy kaydedildi.`);

  if (currentQuestion < state.categories.length - 1) {
    window.setTimeout(() => {
      currentQuestion += 1;
      renderAll();
    }, 260);
  }
}

function moveQuestion(direction) {
  if (!currentVoterId) return;
  if (direction === "next" && currentQuestion === state.categories.length - 1) {
    activateView("resultsView");
    return;
  }
  currentQuestion = Math.max(0, Math.min(state.categories.length - 1, currentQuestion + (direction === "next" ? 1 : -1)));
  renderAll();
}

function getMember(id) {
  return state.members.find((member) => member.id === id);
}

function calculateResultsForDate(key) {
  const votes = state.votes[key] || {};
  return state.categories.map((category) => {
    const counts = {};
    Object.values(votes).forEach((voterVotes) => {
      const candidateId = voterVotes[category.id];
      if (candidateId) counts[candidateId] = (counts[candidateId] || 0) + 1;
    });
    const max = Math.max(0, ...Object.values(counts));
    const winners = max ? Object.keys(counts).filter((id) => counts[id] === max) : [];
    return { category, counts, max, winners };
  });
}

function revealResults() {
  const totalVotes = Object.values(todayVotes()).reduce((sum, voterVotes) => sum + Object.keys(voterVotes || {}).length, 0);
  if (!totalVotes) {
    showToast("Önce en az bir oy verelim.");
    return;
  }

  const results = calculateResultsForDate(todayKey());
  els.resultsStage.innerHTML = `
    <div class="results-grid">
      ${results.map((result, index) => renderResultCard(result, index)).join("")}
    </div>
  `;
  launchConfetti();
  renderScores();
}

function renderResultCard(result, index) {
  const names = result.winners.map((id) => getMember(id)?.name).filter(Boolean).join(" + ");
  const firstWinner = getMember(result.winners[0]);
  const voteText = result.max ? `${result.max} oy` : "Henüz oy yok";
  const title = names || "Sahne boş";
  const face = firstWinner ? avatarMarkup(firstWinner) : `<div class="avatar"><span>🎁</span></div>`;

  return `
    <article class="result-card" style="--accent: ${result.category.accent}; animation-delay: ${index * 70}ms">
      <h4>${result.category.badge} ${result.category.title}</h4>
      <div class="winner-row">
        ${face}
        <div>
          <strong>${title}</strong>
          <small>${voteText}</small>
        </div>
      </div>
    </article>
  `;
}

function renderScores() {
  const scores = Object.fromEntries(state.members.map((member) => [member.id, 0]));
  Object.keys(state.votes).forEach((date) => {
    calculateResultsForDate(date).forEach((result) => {
      result.winners.forEach((winnerId) => {
        scores[winnerId] = (scores[winnerId] || 0) + 1;
      });
    });
  });

  els.scoreGrid.innerHTML = state.members
    .map((member) => `
      <article class="score-card">
        ${avatarMarkup(member)}
        <span class="score-name">${member.name}</span>
        <span class="score-number">${scores[member.id] || 0}</span>
        <p class="score-note">toplam rozet</p>
      </article>
    `)
    .join("");
}

function renderNoteAuthors() {
  els.noteAuthorStrip.innerHTML = state.members
    .map((member) => `
      <button class="author-card ${member.id === currentNoteAuthorId ? "is-active" : ""}" type="button" data-note-author="${member.id}">
        ${avatarMarkup(member)}
        <span class="member-name">${escapeHTML(member.name)}</span>
      </button>
    `)
    .join("");
}

function renderDailyNotes() {
  const notes = todayNotes();
  if (!notes.length) {
    els.dailyNotesList.innerHTML = `
      <div class="empty-notes">
        <span>📝</span>
        <h3>Bugünün cümlesi henüz yok.</h3>
        <p>İlk cümleyi biri bıraksın, gün hatıraya dönüşsün.</p>
      </div>
    `;
    return;
  }

  els.dailyNotesList.innerHTML = notes
    .map((note, index) => {
      const author = getMember(note.authorId) || state.members[0];
      return `
        <article class="daily-note-card" style="--accent: ${author.bg}; animation-delay: ${index * 55}ms">
          <div class="winner-row">
            ${avatarMarkup(author)}
            <div>
              <strong>${escapeHTML(author.name)}</strong>
              <small>${note.time}</small>
              <blockquote>${escapeHTML(note.text)}</blockquote>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderNoteCounter() {
  const length = els.dailyNoteInput.value.length;
  els.noteCounter.textContent = `${length} / 140`;
}

function saveDailyNote() {
  const text = els.dailyNoteInput.value.trim();
  if (!text) {
    els.dailyNoteInput.focus();
    showToast("Önce bugünün cümlesini yazalım.");
    return;
  }

  const time = new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  todayNotes().unshift({
    id: `not-${Date.now()}`,
    authorId: currentNoteAuthorId,
    text,
    time,
  });
  els.dailyNoteInput.value = "";
  saveState();
  renderAll();
  showToast("Bugünün cümlesi bırakıldı.");
}

function clearTodayNotes() {
  const notes = todayNotes();
  if (!notes.length) {
    showToast("Bugün temizlenecek cümle yok.");
    return;
  }
  if (!confirm("Bugünün cümlelerini temizleyelim mi?")) return;
  state.notes[todayKey()] = [];
  saveState();
  renderAll();
  showToast("Bugünün cümleleri temizlendi.");
}

function renderProfileEditor() {
  els.profileEditor.innerHTML = state.members
    .map((member, index) => `
      <div class="profile-row" data-member-row="${member.id}">
        ${avatarMarkup(member)}
        <input type="text" maxlength="18" value="${member.name}" aria-label="${member.name} adı" data-name-input="${member.id}" />
        <div class="avatar-picker" aria-label="Avatar seç">
          ${avatarFaces.map((face) => `
            <button class="avatar-option ${face === member.face ? "is-selected" : ""}" type="button" data-face="${face}" data-member="${member.id}" style="background: ${palette[(index + avatarFaces.indexOf(face)) % palette.length]}22">
              ${face}
            </button>
          `).join("")}
        </div>
      </div>
    `)
    .join("");
}

function saveProfiles() {
  state.members = state.members.map((member, index) => {
    const input = document.querySelector(`[data-name-input="${member.id}"]`);
    return {
      ...member,
      name: input.value.trim() || defaultMembers[index].name,
    };
  });
  saveState();
  renderAll();
  showToast("Profiller güncellendi.");
}

function activateView(viewId) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === viewId);
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === viewId);
  });
}

function addCategory() {
  const value = els.newCategory.value.trim();
  if (!value) {
    els.newCategory.focus();
    showToast("Önce kategori cümlesini yaz.");
    return;
  }
  const accent = palette[state.categories.length % palette.length];
  state.categories.push({
    id: `ozel-${Date.now()}`,
    title: value.endsWith("?") ? value : `${value}?`,
    hint: "Aileye özel kategori.",
    badge: "🎯",
    accent,
  });
  els.newCategory.value = "";
  saveState();
  renderAll();
  showToast("Kategori eklendi.");
}

function resetToday() {
  const votes = todayVotes();
  const hasVotes = Object.keys(votes).length > 0;
  if (!hasVotes) {
    showToast("Bugün zaten tertemiz.");
    return;
  }
  if (!confirm("Bugünün oylarını sıfırlayalım mı?")) return;
  state.votes[todayKey()] = {};
  currentQuestion = 0;
  saveState();
  renderAll();
  els.resultsStage.innerHTML = `
    <div class="locked-results">
      <span>🎁</span>
      <h3>Sonuçlar hazır olunca burada parlayacak.</h3>
      <p>Biraz oy biriksin, sonra kazanan rozetleri açalım.</p>
    </div>
  `;
  showToast("Bugünün oyları sıfırlandı.");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 1900);
}

function launchConfetti() {
  const canvas = els.confettiCanvas;
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  ctx.scale(ratio, ratio);

  const pieces = Array.from({ length: 150 }, () => ({
    x: Math.random() * window.innerWidth,
    y: -20 - Math.random() * window.innerHeight * 0.4,
    size: 6 + Math.random() * 10,
    speed: 2 + Math.random() * 5,
    spin: Math.random() * 0.2,
    angle: Math.random() * Math.PI,
    color: palette[Math.floor(Math.random() * palette.length)],
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    pieces.forEach((piece) => {
      piece.y += piece.speed;
      piece.x += Math.sin(frame * piece.spin + piece.angle) * 2;
      piece.angle += piece.spin;
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.angle);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.62);
      ctx.restore();
    });
    frame += 1;
    if (frame < 150) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
  draw();
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => activateView(tab.dataset.view));
});

els.voterStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-voter]");
  if (button) setVoter(button.dataset.voter);
});

els.candidateGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-candidate]");
  if (button) castVote(button.dataset.candidate);
});

els.prevQuestion.addEventListener("click", () => moveQuestion("prev"));
els.nextQuestion.addEventListener("click", () => moveQuestion("next"));
els.revealResults.addEventListener("click", revealResults);
els.resetToday.addEventListener("click", resetToday);
els.addCategory.addEventListener("click", () => {
  activateView("boardView");
  els.newCategory.focus();
});
els.saveCategory.addEventListener("click", addCategory);
els.newCategory.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addCategory();
});

els.noteAuthorStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-note-author]");
  if (!button) return;
  currentNoteAuthorId = button.dataset.noteAuthor;
  renderNoteAuthors();
});

els.dailyNoteInput.addEventListener("input", renderNoteCounter);
els.dailyNoteInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") saveDailyNote();
});
els.saveDailyNote.addEventListener("click", saveDailyNote);
els.clearTodayNotes.addEventListener("click", clearTodayNotes);

els.openFamily.addEventListener("click", () => {
  els.familyCodeInput.value = state.familyCode || "";
  renderCloudStatus();
  els.familyDialog.showModal();
  els.familyCodeInput.focus();
});

els.saveFamilyCode.addEventListener("click", saveFamilyCode);
els.leaveFamily.addEventListener("click", leaveFamily);
els.familyCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveFamilyCode();
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButton();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallButton();
  showToast("GÖRGÜLÜ ARENA telefona kuruldu.");
});

els.installApp.addEventListener("click", handleInstallClick);

els.openProfiles.addEventListener("click", () => {
  renderProfileEditor();
  els.profileDialog.showModal();
});

els.saveProfiles.addEventListener("click", (event) => {
  event.preventDefault();
  saveProfiles();
  els.profileDialog.close();
});

els.profileEditor.addEventListener("click", (event) => {
  const option = event.target.closest("[data-face]");
  if (!option) return;
  const member = getMember(option.dataset.member);
  const colorIndex = avatarFaces.indexOf(option.dataset.face);
  member.face = option.dataset.face;
  member.bg = palette[colorIndex % palette.length];
  member.shirt = palette[(colorIndex + 3) % palette.length];
  renderProfileEditor();
});

renderAll();
updateInstallButton();
