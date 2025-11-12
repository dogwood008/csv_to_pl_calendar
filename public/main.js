const calendarElement = document.getElementById("calendar");
const yearForm = document.getElementById("yearForm");
const yearInput = document.getElementById("yearInput");
const yearError = document.getElementById("yearError");
const monthTemplate = document.getElementById("monthTemplate");
const monthModal = document.getElementById("monthModal");
const modalCalendarContainer = document.getElementById("modalCalendarContainer");
const modalCloseButton = document.getElementById("modalCloseButton");
let lastFocusedMonth = null;

function createWeekdayHeaderRow(labels) {
  const fragment = document.createDocumentFragment();
  labels.forEach((label) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    fragment.appendChild(th);
  });
  return fragment;
}

function renderWeeks(tbody, weeks) {
  weeks.forEach((week) => {
    const tr = document.createElement("tr");
    week.forEach((day) => {
      const td = document.createElement("td");
      if (day === null) {
        td.classList.add("empty");
      } else {
        td.textContent = String(day.day);
        if (day.isToday) {
          td.classList.add("today");
        }
        td.setAttribute("data-date", day.isoDate);
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function closeMonthModal() {
  if (!monthModal || !modalCalendarContainer) {
    return;
  }
  if (!monthModal.classList.contains("is-open")) {
    return;
  }
  modalCalendarContainer.replaceChildren();
  monthModal.classList.remove("is-open");
  monthModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (lastFocusedMonth instanceof HTMLElement) {
    lastFocusedMonth.focus();
  }
}

function openMonthModal(monthNode) {
  if (!monthModal || !modalCalendarContainer) {
    return;
  }
  const clone = monthNode.cloneNode(true);
  clone.removeAttribute("tabindex");
  clone.removeAttribute("role");
  modalCalendarContainer.replaceChildren(clone);
  monthModal.classList.add("is-open");
  monthModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  lastFocusedMonth = monthNode;
  modalCloseButton?.focus();
}

function attachMonthInteractions(monthNode, monthTitle) {
  monthNode.tabIndex = 0;
  monthNode.setAttribute("role", "button");
  monthNode.setAttribute("aria-label", `${monthTitle}を拡大表示`);
  monthNode.addEventListener("click", () => {
    openMonthModal(monthNode);
  });
  monthNode.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMonthModal(monthNode);
    }
  });
}

function renderCalendar(calendar) {
  calendarElement.replaceChildren();
  const weekdayLabels = Array.isArray(calendar.weekdayLabels)
    ? calendar.weekdayLabels
    : [];
  const weekdayHeader = createWeekdayHeaderRow(weekdayLabels);

  calendar.months.forEach((month) => {
    const firstChild = monthTemplate.content.firstElementChild;
    if (!firstChild) {
      console.error(
        "monthTemplate is malformed or empty: no firstElementChild found."
      );
      return;
    }
    const monthNode = firstChild.cloneNode(true);
    const header = monthNode.querySelector(".month-header");
    const caption = monthNode.querySelector(".month-caption");
    const weekdayRow = monthNode.querySelector(".weekday-row");
    const weeksBody = monthNode.querySelector(".weeks");

    header.textContent = month.title;
    if (caption) {
      caption.textContent = month.title;
    }
    weekdayRow.appendChild(weekdayHeader.cloneNode(true));
    renderWeeks(weeksBody, month.weeks);

    calendarElement.appendChild(monthNode);
    attachMonthInteractions(monthNode, month.title);
  });
}

async function fetchCalendar(year) {
  const response = await fetch(`/api/calendar?year=${encodeURIComponent(year)}`);
  if (!response.ok) {
    let errorMessage = `カレンダーを取得できませんでした (${response.status})`;
    const bodyText = await response.text().catch(() => "");
    if (bodyText) {
      let errorDetail = bodyText;
      try {
        const data = JSON.parse(bodyText);
        if (data && typeof data === "object") {
          if (typeof data.error === "string" && data.error) {
            errorDetail = data.error;
          } else if (typeof data.message === "string" && data.message) {
            errorDetail = data.message;
          }
        }
      } catch {
        // JSON に変換できない場合は生テキストを利用する
      }
      errorMessage += `: ${errorDetail}`;
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

async function loadCalendar(year) {
  try {
    const calendar = await fetchCalendar(year);
    renderCalendar(calendar);
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "カレンダーを読み込めませんでした。";
    const paragraph = document.createElement("p");
    paragraph.className = "error";
    paragraph.textContent = message;
    calendarElement.replaceChildren(paragraph);
  }
}

function initYearForm() {
  const currentYear = new Date().getFullYear();
  yearInput.value = String(currentYear);

  yearForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const year = Number.parseInt(yearInput.value, 10);
    const isValid = !Number.isNaN(year) && year > 0 && year <= 9999;
    if (yearError) {
      yearError.textContent = isValid ? "" : "年は1から9999までの整数を入力してください";
    }

    if (!isValid) {
      return;
    }
    loadCalendar(year);
  });
}

function initMonthModal() {
  if (!monthModal || !modalCalendarContainer) {
    return;
  }

  document.querySelectorAll("[data-modal-close]").forEach((element) => {
    element.addEventListener("click", () => {
      closeMonthModal();
    });
  });

  monthModal.addEventListener("click", (event) => {
    if (event.target === monthModal) {
      closeMonthModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && monthModal.classList.contains("is-open")) {
      closeMonthModal();
    }
  });
}

function init() {
  if (
    !calendarElement ||
    !yearForm ||
    !yearInput ||
    !yearError ||
    !monthTemplate ||
    !monthModal ||
    !modalCalendarContainer ||
    !modalCloseButton
  ) {
    console.error("必要なUI要素が見つかりませんでした:", {
      calendarElement: !!calendarElement,
      yearForm: !!yearForm,
      yearInput: !!yearInput,
      yearError: !!yearError,
      monthTemplate: !!monthTemplate,
      monthModal: !!monthModal,
      modalCalendarContainer: !!modalCalendarContainer,
      modalCloseButton: !!modalCloseButton,
    });
    return;
  }

  initYearForm();
  initMonthModal();
  const initialYear = Number.parseInt(yearInput.value, 10);
  void loadCalendar(initialYear);
}

document.addEventListener("DOMContentLoaded", init);
