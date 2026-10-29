'use strict';
const api = window.hydra;
const $ = (id) => document.getElementById(id);
const heroGuy = window.HydraCharacter.mount($('heroGuy'));
heroGuy.classList.add('is-idle');

let state = null;
let toastTimer = null;

const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

function setValue(id, value) {
  const el = $(id);
  if (document.activeElement === el) return; // don't fight the user while typing
  if (el.type === 'checkbox') el.checked = Boolean(value);
  else el.value = value;
}

function describeNext(s) {
  const { settings, nextDue, active } = s;
  if (active) return { label: 'Now', status: 'Reminder is on your screen' };
  if (!settings.running) return { label: '—', status: 'Reminders paused' };
  if (!nextDue) return { label: '—', status: 'Add at least one reminder time' };
  const label = nextDue <= Date.now() ? 'Now' : fmtTime(nextDue);
  const sameDay = new Date(nextDue).toDateString() === new Date().toDateString();
  return { label, status: `Reminders on · next ${sameDay ? 'at' : 'tomorrow at'} ${fmtTime(nextDue)}` };
}

function render(s) {
  state = s;
  const st = s.settings;
  setValue('name', st.name);
  setValue('interval', String(st.intervalMin));
  if ($('interval').value !== String(st.intervalMin)) {
    $('interval').add(new Option(`${st.intervalMin} minutes`, String(st.intervalMin)));
    $('interval').value = String(st.intervalMin);
  }
  setValue('start', st.start);
  setValue('end', st.end);
  setValue('times', st.times.join(', '));
  setValue('snooze', String(st.snoozeMin));
  setValue('goal', st.goal);
  for (const key of ['sound', 'pauseWhenAway', 'nativeNotify', 'launchAtLogin']) setValue(key, st[key]);

  $('intervalMode').classList.toggle('active', st.mode === 'interval');
  $('timesMode').classList.toggle('active', st.mode === 'times');
  $('intervalFields').hidden = st.mode !== 'interval';
  $('timesFields').hidden = st.mode !== 'times';

  const next = describeNext(s);
  $('next').textContent = next.label;
  $('runState').textContent = next.status;
  $('dot').classList.toggle('on', st.running);
  $('toggleBtn').textContent = st.running ? 'Pause reminders' : 'Start reminders';
  $('toggleBtn').classList.toggle('paused', !st.running);

  $('count').textContent = s.today.length;
  $('goalLabel').textContent = st.goal;
  $('progress').style.width = `${Math.min(100, (s.today.length / st.goal) * 100)}%`;
  const sips = $('sips');
  sips.replaceChildren();
  if (!s.today.length) {
    const empty = document.createElement('span');
    empty.className = 'empty';
    empty.textContent = 'Nothing logged yet today.';
    sips.append(empty);
  }
  for (const ts of s.today) {
    const chip = document.createElement('span');
    chip.className = 'sip';
    chip.textContent = `💧 ${fmtTime(ts)}`;
    sips.append(chip);
  }
  $('undoBtn').disabled = !s.today.length;
}

async function save(patch, message) {
  render(await api.saveSettings(patch));
  if (message) toast(message);
}

function parseTimes(text) {
  const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
  const bad = parts.filter((p) => !/^([01]?\d|2[0-3]):[0-5]\d$/.test(p));
  return { parts, bad };
}

$('today').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

$('intervalMode').onclick = () => save({ mode: 'interval' });
$('timesMode').onclick = () => save({ mode: 'times' });
$('name').addEventListener('change', (e) => save({ name: e.target.value }, 'Saved'));
$('interval').addEventListener('change', (e) => save({ intervalMin: Number(e.target.value) }, 'Interval updated — timer restarted'));
$('start').addEventListener('change', (e) => e.target.value && save({ start: e.target.value }));
$('end').addEventListener('change', (e) => e.target.value && save({ end: e.target.value }));
$('snooze').addEventListener('change', (e) => save({ snoozeMin: Number(e.target.value) }));
$('goal').addEventListener('change', (e) => save({ goal: Number(e.target.value) }));
for (const key of ['sound', 'pauseWhenAway', 'nativeNotify', 'launchAtLogin']) {
  $(key).addEventListener('change', (e) => save({ [key]: e.target.checked }));
}

$('times').addEventListener('change', (e) => {
  const { parts, bad } = parseTimes(e.target.value);
  const note = $('timesNote');
  if (bad.length || !parts.length) {
    e.target.classList.add('invalid');
    note.classList.add('error');
    note.textContent = bad.length ? `Couldn't read: ${bad.join(', ')} — use HH:MM (e.g. 14:30).` : 'Add at least one time.';
    return;
  }
  e.target.classList.remove('invalid');
  note.classList.remove('error');
  note.textContent = '24-hour times, separated by commas.';
  e.target.blur();
  save({ times: parts }, 'Reminder times saved');
});

$('toggleBtn').onclick = async () => {
  render(await api.toggleRunning());
  toast(state.settings.running ? 'Reminders started' : 'Reminders paused');
};
$('previewBtn').onclick = async () => {
  render(await api.preview());
  toast('Look at the bottom-right of your screen 👀');
};
$('drankBtn').onclick = async () => { render(await api.logDrink()); toast('Sip logged. Nice!'); };
$('undoBtn').onclick = async () => render(await api.undoDrink());

$('heroGuy').addEventListener('click', () => {
  heroGuy.classList.remove('is-waving');
  void heroGuy.getBoundingClientRect();
  heroGuy.classList.add('is-waving');
  setTimeout(() => heroGuy.classList.remove('is-waving'), 1700);
});

api.onState(render);
api.getState().then(render);
setInterval(() => {
  if (document.visibilityState === 'visible') api.getState().then(render);
}, 20000);
