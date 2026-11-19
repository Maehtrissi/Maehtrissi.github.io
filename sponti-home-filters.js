/* Sponti-eigene Orts- und Datumsauswahl auf der Startseite.
   Native Felder bleiben als Formularwerte und als Fallback ohne JavaScript erhalten. */
(function () {
  'use strict';

  function init() {
    const form = document.querySelector('.sponti-hero-search');
    const locationSelect = document.getElementById('sponti-home-ort');
    const otherLocation = document.getElementById('sponti-home-ort-custom');
    const dateInput = form && form.querySelector('input[name="datum"]');
    if (!form || !locationSelect || !otherLocation || !dateInput) return;

    const locationField = locationSelect.closest('.sponti-hero-search-field');
    const dateField = dateInput.closest('.sponti-hero-search-field');
    if (!locationField || !dateField) return;

    const locationUI = document.createElement('div');
    locationUI.className = 'sponti-home-dropdown';
    const locationTrigger = document.createElement('button');
    locationTrigger.type = 'button';
    locationTrigger.className = 'sponti-home-dropdown-trigger';
    locationTrigger.setAttribute('aria-expanded', 'false');
    locationTrigger.setAttribute('aria-controls', 'sponti-home-location-options');
    locationTrigger.setAttribute('aria-haspopup', 'listbox');
    locationTrigger.setAttribute('aria-label', 'Ort auswählen');
    locationTrigger.innerHTML = '<span class="sponti-home-trigger-label"></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

    const locationMenu = document.createElement('div');
    locationMenu.className = 'sponti-home-dropdown-panel sponti-home-location-panel';
    locationMenu.id = 'sponti-home-location-options';
    locationMenu.setAttribute('role', 'listbox');
    locationMenu.setAttribute('aria-label', 'Ort auswählen');
    locationMenu.hidden = true;

    function updateLocation() {
      const option = locationSelect.options[locationSelect.selectedIndex];
      locationTrigger.querySelector('.sponti-home-trigger-label').textContent = option ? option.textContent : 'Alle Orte';
      locationMenu.querySelectorAll('[data-home-place]').forEach(function (button) {
        const selected = button.dataset.homePlace === locationSelect.value;
        button.setAttribute('aria-selected', String(selected));
        button.classList.toggle('is-selected', selected);
      });
    }

    Array.from(locationSelect.options).forEach(function (option) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sponti-home-option';
      button.setAttribute('role', 'option');
      button.dataset.homePlace = option.value;
      const title = document.createElement('span');
      title.textContent = option.textContent;
      const tick = document.createElement('span');
      tick.className = 'sponti-home-option-check';
      tick.textContent = '✓';
      tick.setAttribute('aria-hidden', 'true');
      button.append(title, tick);
      button.addEventListener('click', function () {
        locationSelect.value = option.value;
        locationSelect.dispatchEvent(new Event('change', { bubbles: true }));
        updateLocation();
        closeAll();
        if (option.value === 'andere') otherLocation.focus();
        else locationTrigger.focus();
      });
      locationMenu.appendChild(button);
    });
    locationUI.append(locationTrigger, locationMenu);
    locationSelect.after(locationUI);

    const dateUI = document.createElement('div');
    dateUI.className = 'sponti-home-dropdown sponti-home-date';
    const dateTrigger = document.createElement('button');
    dateTrigger.type = 'button';
    dateTrigger.className = 'sponti-home-dropdown-trigger';
    dateTrigger.setAttribute('aria-expanded', 'false');
    dateTrigger.setAttribute('aria-controls', 'sponti-home-date-calendar');
    dateTrigger.setAttribute('aria-haspopup', 'dialog');
    dateTrigger.setAttribute('aria-label', 'Kursdatum auswählen');
    dateTrigger.innerHTML = '<span class="sponti-home-trigger-label">Datum wählen</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

    const datePanel = document.createElement('div');
    datePanel.id = 'sponti-home-date-calendar';
    datePanel.className = 'sponti-home-dropdown-panel sponti-home-calendar';
    datePanel.setAttribute('role', 'dialog');
    datePanel.setAttribute('aria-label', 'Kursdatum wählen');
    datePanel.hidden = true;
    datePanel.innerHTML =
      '<div class="sponti-home-calendar-head">' +
        '<button type="button" class="sponti-home-calendar-nav" data-cal-prev aria-label="Vorheriger Monat">‹</button>' +
        '<strong class="sponti-home-calendar-month"></strong>' +
        '<button type="button" class="sponti-home-calendar-nav" data-cal-next aria-label="Nächster Monat">›</button>' +
      '</div>' +
      '<div class="sponti-home-calendar-weekdays" aria-hidden="true"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div>' +
      '<div class="sponti-home-calendar-days"></div>' +
      '<div class="sponti-home-calendar-foot">' +
        '<button type="button" class="sponti-home-calendar-shortcut" data-cal-today>Heute</button>' +
        '<button type="button" class="sponti-home-calendar-shortcut" data-cal-clear>Alle Daten</button>' +
      '</div>';
    dateUI.append(dateTrigger, datePanel);
    dateInput.after(dateUI);

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth();

    function toISO(date) {
      return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    }
    function fromISO(value) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
      const parts = value.split('-').map(Number);
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      return toISO(date) === value ? date : null;
    }
    function formatDate(date) {
      return String(date.getDate()).padStart(2, '0') + '.' + String(date.getMonth() + 1).padStart(2, '0') + '.' + date.getFullYear();
    }
    function updateDateLabel() {
      const selected = fromISO(dateInput.value);
      dateTrigger.querySelector('.sponti-home-trigger-label').textContent = selected ? formatDate(selected) : 'Datum wählen';
    }
    function pickDate(value) {
      dateInput.value = value;
      dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      updateDateLabel();
      closeAll();
      dateTrigger.focus();
    }
    function renderCalendar() {
      const first = new Date(viewYear, viewMonth, 1);
      const offset = (first.getDay() + 6) % 7;
      const dayCount = new Date(viewYear, viewMonth + 1, 0).getDate();
      const grid = datePanel.querySelector('.sponti-home-calendar-days');
      grid.replaceChildren();
      datePanel.querySelector('.sponti-home-calendar-month').textContent =
        new Intl.DateTimeFormat('de-CH', { month: 'long', year: 'numeric' }).format(first);
      datePanel.querySelector('[data-cal-prev]').disabled =
        viewYear < todayStart.getFullYear() ||
        (viewYear === todayStart.getFullYear() && viewMonth <= todayStart.getMonth());

      for (let i = 0; i < offset; i++) {
        const blank = document.createElement('span');
        blank.className = 'sponti-home-calendar-empty';
        grid.appendChild(blank);
      }
      for (let day = 1; day <= dayCount; day++) {
        const date = new Date(viewYear, viewMonth, day);
        const value = toISO(date);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sponti-home-calendar-day';
        button.textContent = String(day);
        button.dataset.homeDate = value;
        button.setAttribute('aria-label', new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'long', year: 'numeric' }).format(date));
        button.setAttribute('aria-pressed', String(dateInput.value === value));
        button.disabled = date < todayStart;
        if (value === toISO(todayStart)) button.classList.add('is-today');
        if (value === dateInput.value) button.classList.add('is-selected');
        button.addEventListener('click', function () { pickDate(value); });
        grid.appendChild(button);
      }
    }

    function closeAll() {
      locationUI.classList.remove('is-open');
      dateUI.classList.remove('is-open');
      locationField.classList.remove('is-dropdown-open');
      dateField.classList.remove('is-dropdown-open');
      locationMenu.hidden = true;
      datePanel.hidden = true;
      locationTrigger.setAttribute('aria-expanded', 'false');
      dateTrigger.setAttribute('aria-expanded', 'false');
    }

    locationTrigger.addEventListener('click', function () {
      const shouldOpen = locationMenu.hidden;
      closeAll();
      if (!shouldOpen) return;
      locationUI.classList.add('is-open');
      locationField.classList.add('is-dropdown-open');
      locationMenu.hidden = false;
      locationTrigger.setAttribute('aria-expanded', 'true');
    });
    dateTrigger.addEventListener('click', function () {
      const shouldOpen = datePanel.hidden;
      closeAll();
      if (!shouldOpen) return;
      const selected = fromISO(dateInput.value);
      if (selected && selected >= todayStart) {
        viewYear = selected.getFullYear();
        viewMonth = selected.getMonth();
      } else {
        viewYear = todayStart.getFullYear();
        viewMonth = todayStart.getMonth();
      }
      renderCalendar();
      dateUI.classList.add('is-open');
      dateField.classList.add('is-dropdown-open');
      datePanel.hidden = false;
      dateTrigger.setAttribute('aria-expanded', 'true');
    });
    datePanel.querySelector('[data-cal-prev]').addEventListener('click', function () {
      if (viewYear === todayStart.getFullYear() && viewMonth === todayStart.getMonth()) return;
      const previous = new Date(viewYear, viewMonth - 1, 1);
      viewYear = previous.getFullYear();
      viewMonth = previous.getMonth();
      renderCalendar();
    });
    datePanel.querySelector('[data-cal-next]').addEventListener('click', function () {
      const next = new Date(viewYear, viewMonth + 1, 1);
      viewYear = next.getFullYear();
      viewMonth = next.getMonth();
      renderCalendar();
    });
    datePanel.querySelector('[data-cal-today]').addEventListener('click', function () { pickDate(toISO(todayStart)); });
    datePanel.querySelector('[data-cal-clear]').addEventListener('click', function () { pickDate(''); });

    locationTrigger.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      if (locationMenu.hidden) locationTrigger.click();
      const selected = locationMenu.querySelector('[aria-selected="true"]');
      (selected || locationMenu.querySelector('.sponti-home-option'))?.focus();
    });
    locationMenu.addEventListener('keydown', function (event) {
      const options = Array.from(locationMenu.querySelectorAll('.sponti-home-option'));
      const index = options.indexOf(document.activeElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length].focus();
      }
    });
    document.addEventListener('pointerdown', function (event) {
      if (!locationUI.contains(event.target) && !dateUI.contains(event.target)) closeAll();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && (!locationMenu.hidden || !datePanel.hidden)) {
        const wasDate = !datePanel.hidden;
        closeAll();
        (wasDate ? dateTrigger : locationTrigger).focus();
      }
    });
    locationSelect.addEventListener('change', updateLocation);
    dateInput.addEventListener('change', updateDateLabel);

    locationSelect.tabIndex = -1;
    dateInput.tabIndex = -1;
    locationSelect.setAttribute('aria-hidden', 'true');
    dateInput.setAttribute('aria-hidden', 'true');
    updateLocation();
    updateDateLabel();
    form.classList.add('sponti-home-enhanced');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
