const STORAGE_KEY = "harbor-plan-data";
const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getTodayIndex() {
  return new Date().getDay();
}

function createDefaultData() {
  const today = getTodayIndex();
  return {
    meals: [
      {
        id: crypto.randomUUID(),
        title: "Breakfast: oatmeal & berries",
        time: "08:00",
        notes: "Warm tea, gentle prompt",
        day: today,
      },
    ],
    exercises: [
      {
        id: crypto.randomUUID(),
        title: "10 min walk in the garden",
        time: "10:30",
        notes: "Bring water, walk together",
        day: today,
      },
    ],
    reminders: [
      {
        id: crypto.randomUUID(),
        title: "Hydration check",
        time: "09:30",
        tone: "gentle",
        day: today,
      },
    ],
    meds: [],
    notes: "",
    safety: {
      prefFoods: "",
      avoidFoods: "",
      mobilityNotes: "",
      emergencyContact: "",
    },
    mode: "caregiver",
    view: "today",
    alertsEnabled: false,
  };
}

const routines = {
  "gentle-morning": {
    meals: [
      {
        title: "Breakfast: warm cereal",
        time: "08:00",
        notes: "Serve warm, offer tea",
      },
    ],
    reminders: [
      {
        title: "Hydration reminder",
        time: "08:45",
        tone: "gentle",
      },
    ],
    exercises: [
      {
        title: "5 min stretch together",
        time: "09:15",
        notes: "Slow pace, chair nearby",
      },
    ],
  },
  "midday-move": {
    meals: [
      {
        title: "Midday snack",
        time: "12:00",
        notes: "Soft fruit or yogurt",
      },
    ],
    exercises: [
      {
        title: "15 min walk",
        time: "11:15",
        notes: "Bring water, shade if needed",
      },
    ],
    reminders: [
      {
        title: "Rest and breathe",
        time: "12:30",
        tone: "encouraging",
      },
    ],
  },
  "evening-winddown": {
    meals: [
      {
        title: "Dinner: comforting soup",
        time: "18:00",
        notes: "Soft textures, warm broth",
      },
    ],
    reminders: [
      {
        title: "Calm music",
        time: "19:00",
        tone: "gentle",
      },
    ],
  },
};

const state = loadState();
let alertTimers = [];

const mealForm = document.getElementById("mealForm");
const exerciseForm = document.getElementById("exerciseForm");
const reminderForm = document.getElementById("reminderForm");
const medForm = document.getElementById("medForm");
const mealList = document.getElementById("mealList");
const exerciseList = document.getElementById("exerciseList");
const reminderList = document.getElementById("reminderList");
const medList = document.getElementById("medList");
const summary = document.getElementById("summary");
const careNotes = document.getElementById("careNotes");
const saveNotes = document.getElementById("saveNotes");
const saveStatus = document.getElementById("saveStatus");
const printPlan = document.getElementById("printPlan");
const resetPlan = document.getElementById("resetPlan");
const toggleButtons = document.querySelectorAll(".toggle-btn");
const viewTabs = document.querySelectorAll(".tab");
const views = document.querySelectorAll(".view");
const weekView = document.getElementById("weekView");
const routineGrid = document.getElementById("routineGrid");
const handoffText = document.getElementById("handoffText");
const copyHandoff = document.getElementById("copyHandoff");
const printHandoff = document.getElementById("printHandoff");
const enableAlerts = document.getElementById("enableAlerts");
const alertStatus = document.getElementById("alertStatus");

const safetyFields = {
  prefFoods: document.getElementById("prefFoods"),
  avoidFoods: document.getElementById("avoidFoods"),
  mobilityNotes: document.getElementById("mobilityNotes"),
  emergencyContact: document.getElementById("emergencyContact"),
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createDefaultData();
  try {
    const parsed = JSON.parse(raw);
    return normalizeState({ ...createDefaultData(), ...parsed });
  } catch (error) {
    return createDefaultData();
  }
}

function normalizeState(current) {
  const today = getTodayIndex();
  current.meals = current.meals.map((item) => ({ ...item, day: item.day ?? today }));
  current.exercises = current.exercises.map((item) => ({ ...item, day: item.day ?? today }));
  current.reminders = current.reminders.map((item) => ({ ...item, day: item.day ?? today }));
  current.meds = current.meds?.map((item) => ({ ...item, day: item.day ?? today })) || [];
  current.alertsEnabled = Boolean(current.alertsEnabled);
  return current;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sortByTime(items) {
  return [...items].sort((a, b) => a.time.localeCompare(b.time));
}

function formatTime(timeString) {
  if (!timeString) return "";
  const [hour, minute] = timeString.split(":");
  const date = new Date();
  date.setHours(Number(hour));
  date.setMinutes(Number(minute));
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function buildItemDetails(item) {
  const details = [];
  if (item.dosage) details.push(item.dosage);
  if (item.notes) details.push(item.notes);
  if (item.tone) details.push(`${item.tone} tone`);
  return details.join(" · ");
}

function renderList(listElement, items, type, listKey) {
  listElement.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "status";
    empty.textContent = `No ${type} planned yet.`;
    listElement.appendChild(empty);
    return;
  }

  sortByTime(items).forEach((item) => {
    const wrapper = document.createElement("div");
    wrapper.className = "list-item";

    const title = document.createElement("strong");
    title.textContent = item.title;

    const meta = document.createElement("div");
    meta.className = "meta";

    const time = document.createElement("small");
    time.textContent = `${formatTime(item.time)} · ${DAYS[item.day]}`;

    const button = document.createElement("button");
    button.textContent = "Mark done";
    button.addEventListener("click", () => {
      wrapper.style.opacity = 0.55;
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-btn";
    removeButton.textContent = "x";
    removeButton.setAttribute("aria-label", `Remove ${item.title}`);
    removeButton.addEventListener("click", () => {
      state[listKey] = state[listKey].filter((entry) => entry.id !== item.id);
      saveState();
      renderAll();
    });

    const actionGroup = document.createElement("div");
    actionGroup.className = "action-buttons";
    actionGroup.appendChild(button);
    actionGroup.appendChild(removeButton);

    meta.appendChild(time);
    meta.appendChild(actionGroup);

    const notes = document.createElement("small");
    notes.textContent = buildItemDetails(item);

    wrapper.appendChild(title);
    wrapper.appendChild(meta);
    if (notes.textContent) wrapper.appendChild(notes);

    listElement.appendChild(wrapper);
  });
}

function renderSummary() {
  summary.innerHTML = "";
  const totalMeals = state.meals.length;
  const totalExercises = state.exercises.length;
  const totalReminders = state.reminders.length;
  const totalMeds = state.meds.length;

  const data = [
    { label: "Meals", value: totalMeals },
    { label: "Activities", value: totalExercises },
    { label: "Reminders", value: totalReminders },
    { label: "Meds", value: totalMeds },
  ];

  data.forEach((item) => {
    const row = document.createElement("div");
    row.className = "summary-item";
    row.innerHTML = `<span>${item.label}</span><span>${item.value}</span>`;
    summary.appendChild(row);
  });
}

function renderNotes() {
  careNotes.value = state.notes;
  Object.entries(safetyFields).forEach(([key, field]) => {
    field.value = state.safety[key] || "";
  });
}

function renderWeek() {
  weekView.innerHTML = "";
  DAYS.forEach((day, index) => {
    const items = [
      ...state.meals.map((item) => ({ ...item, type: "Meal" })),
      ...state.exercises.map((item) => ({ ...item, type: "Activity" })),
      ...state.reminders.map((item) => ({ ...item, type: "Reminder" })),
      ...state.meds.map((item) => ({ ...item, type: "Medication" })),
    ].filter((item) => item.day === index);

    const card = document.createElement("div");
    card.className = "week-day";

    const title = document.createElement("h3");
    title.textContent = day;

    const list = document.createElement("ul");
    if (!items.length) {
      const empty = document.createElement("li");
      empty.textContent = "No plans yet.";
      list.appendChild(empty);
    } else {
      sortByTime(items).forEach((item) => {
        const li = document.createElement("li");
        li.textContent = `${formatTime(item.time)} · ${item.type}: ${item.title}`;
        list.appendChild(li);
      });
    }

    card.appendChild(title);
    card.appendChild(list);
    weekView.appendChild(card);
  });
}

function setMode(mode) {
  state.mode = mode;
  document.body.classList.toggle("simple-mode", mode === "patient");
  toggleButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  if (mode === "patient") {
    setView("today");
  }
  saveState();
}

function setView(view) {
  const desired = state.mode === "patient" && view !== "today" ? "today" : view;
  state.view = desired;
  viewTabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === desired);
  });
  views.forEach((section) => {
    const matches = section.dataset.view === desired;
    section.classList.toggle("view-hidden", !matches);
  });
  saveState();
}

function handleSubmit(form, listKey) {
  const formData = new FormData(form);
  const entry = Object.fromEntries(formData.entries());
  entry.id = crypto.randomUUID();
  entry.day = Number(entry.day);
  state[listKey].push(entry);
  saveState();
  renderAll();
  form.reset();
  setDaySelectDefaults();
}

function setDaySelectDefaults() {
  const today = String(getTodayIndex());
  document.querySelectorAll(".day-select").forEach((select) => {
    select.value = today;
  });
  document.querySelectorAll(".routine-day").forEach((select) => {
    select.value = today;
  });
}

function buildHandoff() {
  const todayIndex = getTodayIndex();
  const todayLabel = DAYS[todayIndex];
  const todayItems = {
    meals: state.meals.filter((item) => item.day === todayIndex),
    exercises: state.exercises.filter((item) => item.day === todayIndex),
    reminders: state.reminders.filter((item) => item.day === todayIndex),
    meds: state.meds.filter((item) => item.day === todayIndex),
  };

  const lines = [];
  lines.push(`Harbor Plan handoff - ${todayLabel}`);
  lines.push("");
  lines.push("Meals:");
  lines.push(...formatHandoffList(todayItems.meals));
  lines.push("");
  lines.push("Activities:");
  lines.push(...formatHandoffList(todayItems.exercises));
  lines.push("");
  lines.push("Reminders:");
  lines.push(...formatHandoffList(todayItems.reminders));
  lines.push("");
  lines.push("Medication:");
  lines.push(...formatHandoffList(todayItems.meds));
  lines.push("");
  lines.push("Care notes:");
  lines.push(state.notes ? state.notes : "No notes yet.");
  lines.push("");
  lines.push("Safety quick check:");
  lines.push(`Preferred foods: ${state.safety.prefFoods || ""}`);
  lines.push(`Foods to avoid: ${state.safety.avoidFoods || ""}`);
  lines.push(`Mobility notes: ${state.safety.mobilityNotes || ""}`);
  lines.push(`Emergency contact: ${state.safety.emergencyContact || ""}`);

  return lines.join("\n");
}

function formatHandoffList(items) {
  if (!items.length) return ["- None scheduled."];
  return sortByTime(items).map((item) => {
    const details = [item.title];
    if (item.dosage) details.push(item.dosage);
    if (item.notes) details.push(item.notes);
    if (item.tone) details.push(`${item.tone} tone`);
    return `- ${formatTime(item.time)}: ${details.join(" · ")}`;
  });
}

function renderAll() {
  renderList(mealList, state.meals, "meals", "meals");
  renderList(exerciseList, state.exercises, "activities", "exercises");
  renderList(reminderList, state.reminders, "reminders", "reminders");
  renderList(medList, state.meds, "medications", "meds");
  renderSummary();
  renderNotes();
  renderWeek();
  handoffText.value = buildHandoff();
  setMode(state.mode);
  setView(state.view || "today");
  updateAlertStatus();
  scheduleAlerts();
  setDaySelectDefaults();
}

function addRoutine(routineId, day) {
  const routine = routines[routineId];
  if (!routine) return;
  const dayValue = Number(day);

  routine.meals?.forEach((item) => {
    state.meals.push({ ...item, day: dayValue, id: crypto.randomUUID() });
  });
  routine.exercises?.forEach((item) => {
    state.exercises.push({ ...item, day: dayValue, id: crypto.randomUUID() });
  });
  routine.reminders?.forEach((item) => {
    state.reminders.push({ ...item, day: dayValue, id: crypto.randomUUID() });
  });
  routine.meds?.forEach((item) => {
    state.meds.push({ ...item, day: dayValue, id: crypto.randomUUID() });
  });
  saveState();
  renderAll();
}

function requestAlerts() {
  if (!("Notification" in window)) {
    alert("Notifications are not supported in this browser.");
    return;
  }
  Notification.requestPermission().then((permission) => {
    if (permission !== "granted") {
      state.alertsEnabled = false;
      updateAlertStatus();
      saveState();
      return;
    }
    state.alertsEnabled = true;
    saveState();
    updateAlertStatus();
    scheduleAlerts();
  });
}

function updateAlertStatus() {
  alertStatus.textContent = state.alertsEnabled ? "Alerts on" : "Alerts off";
  enableAlerts.textContent = state.alertsEnabled ? "Refresh alerts" : "Enable alerts";
}

function scheduleAlerts() {
  alertTimers.forEach((timer) => clearTimeout(timer));
  alertTimers = [];
  if (!state.alertsEnabled) return;
  if (!("Notification" in window) || Notification.permission !== "granted") {
    state.alertsEnabled = false;
    updateAlertStatus();
    saveState();
    return;
  }

  const todayIndex = getTodayIndex();
  const now = new Date();

  const events = [
    ...state.meals.map((item) => ({ ...item, label: "Meal" })),
    ...state.exercises.map((item) => ({ ...item, label: "Activity" })),
    ...state.reminders.map((item) => ({ ...item, label: "Reminder" })),
    ...state.meds.map((item) => ({ ...item, label: "Medication" })),
  ].filter((item) => item.day === todayIndex);

  events.forEach((event) => {
    const [hour, minute] = event.time.split(":").map(Number);
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    const delay = target.getTime() - now.getTime();
    if (delay <= 0) return;

    const timer = setTimeout(() => {
      new Notification(`${event.label}: ${event.title}`, {
        body: event.notes || event.dosage || "",
      });
    }, delay);

    alertTimers.push(timer);
  });
}

mealForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleSubmit(mealForm, "meals");
});

exerciseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleSubmit(exerciseForm, "exercises");
});

reminderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleSubmit(reminderForm, "reminders");
});

medForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleSubmit(medForm, "meds");
});

saveNotes.addEventListener("click", () => {
  state.notes = careNotes.value.trim();
  Object.entries(safetyFields).forEach(([key, field]) => {
    state.safety[key] = field.value.trim();
  });
  saveState();
  saveStatus.textContent = `Saved at ${new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
  handoffText.value = buildHandoff();
});

printPlan.addEventListener("click", () => {
  window.print();
});

resetPlan.addEventListener("click", () => {
  if (!confirm("Start a new day? This clears today’s plan.")) return;
  Object.assign(state, createDefaultData());
  saveState();
  renderAll();
  saveStatus.textContent = "Not saved";
});

toggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});

viewTabs.forEach((button) => {
  button.addEventListener("click", () => {
    setView(button.dataset.view);
  });
});

routineGrid.addEventListener("click", (event) => {
  const addButton = event.target.closest(".routine-add");
  if (!addButton) return;
  const card = addButton.closest(".routine-card");
  const routineId = card.dataset.routine;
  const daySelect = card.querySelector(".routine-day");
  addRoutine(routineId, daySelect.value);
});

enableAlerts.addEventListener("click", () => {
  if (state.alertsEnabled) {
    scheduleAlerts();
    alertStatus.textContent = "Alerts refreshed";
    return;
  }
  requestAlerts();
});

copyHandoff.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(handoffText.value);
    copyHandoff.textContent = "Copied!";
    setTimeout(() => {
      copyHandoff.textContent = "Copy summary";
    }, 1500);
  } catch (error) {
    alert("Unable to copy. You can select and copy manually.");
  }
});

printHandoff.addEventListener("click", () => {
  setView("handoff");
  window.print();
});

setDaySelectDefaults();
renderAll();
