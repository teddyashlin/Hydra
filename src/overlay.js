'use strict';
const api = window.hydra;
const $ = (id) => document.getElementById(id);
const stage = $('stage');
const bubble = $('bubble');
const guy = window.HydraCharacter.mount($('guy'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const POSES = ['is-idle', 'is-walking', 'is-waving', 'is-cheers', 'is-happy'];
const ON_SCREEN = 'translate3d(0, 0, 0)';

let current = null; // payload of the reminder on screen
let busy = false;
let ignoringMouse = true;
let audioCtx = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const offScreen = () => `translate3d(${stage.offsetWidth + 60}px, 0, 0)`;

function setPose(...poses) {
  guy.classList.remove(...POSES);
  guy.classList.add(...poses);
}

async function moveStage(from, to, duration, lean) {
  if (reducedMotion.matches) {
    stage.style.transform = to;
    return;
  }
  guy.style.setProperty('--lean', lean);
  setPose('is-walking');
  const anim = stage.animate([{ transform: from }, { transform: to }], {
    duration, easing: 'cubic-bezier(.4, .1, .35, 1)', fill: 'forwards',
  });
  await anim.finished;
  stage.style.transform = to;
  anim.cancel();
}

function chime() {
  try {
    audioCtx = audioCtx || new AudioContext();
    const t = audioCtx.currentTime;
    [[620, 0], [880, 0.13]].forEach(([freq, delay]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.45, t + delay + 0.14);
      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.16, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.38);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 0.4);
    });
  } catch {
    // Sound is optional.
  }
}

function splash() {
  const el = $('splash');
  el.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const drop = document.createElement('i');
    drop.style.setProperty('--dx', `${Math.round(Math.random() * 90 - 45)}px`);
    drop.style.setProperty('--dy', `${Math.round(-40 - Math.random() * 60)}px`);
    drop.style.animationDelay = `${i * 40}ms`;
    el.appendChild(drop);
  }
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
}

function setIgnoreMouse(ignore) {
  if (ignoringMouse === ignore) return;
  ignoringMouse = ignore;
  api.setIgnoreMouse(ignore);
}

function glassesText(count, goal) {
  return `${count} of ${goal} glasses today`;
}

async function show(payload) {
  current = payload;
  busy = true;
  $('msg').textContent = payload.message;
  $('meta').textContent = glassesText(payload.count, payload.goal);
  $('actions').classList.remove('hidden');
  bubble.classList.remove('show');
  stage.style.visibility = 'visible';

  await moveStage(offScreen(), ON_SCREEN, 2100, '-3deg');
  setPose('is-idle', 'is-waving');
  await sleep(reducedMotion.matches ? 0 : 450);
  bubble.classList.add('show');
  if (payload.sound) chime();
  await sleep(1300);
  if (current === payload) guy.classList.remove('is-waving');
  busy = false;
  $('yesBtn').focus({ preventScroll: true });
}

async function leave(message, pose) {
  const payload = current;
  if (!payload) return;
  current = null;
  $('actions').classList.add('hidden');
  if (message) {
    $('msg').textContent = message;
    bubble.classList.add('show');
    if (pose) setPose('is-idle', ...pose);
    await sleep(1500);
  }
  bubble.classList.remove('show');
  await sleep(250);
  await moveStage(stage.style.transform || ON_SCREEN, offScreen(), 1700, '3deg');
  stage.style.visibility = 'hidden';
  guy.classList.remove(...POSES);
  setIgnoreMouse(true);
  api.done();
}

async function respond(action) {
  if (!current || busy) return;
  const payload = current;
  api.respond(action);
  if (action === 'yes') {
    $('meta').textContent = glassesText(payload.count + 1, payload.goal);
    setTimeout(splash, 350);
    await leave('Nice! Stay hydrated 💧', ['is-cheers', 'is-happy']);
  } else if (action === 'later') {
    await leave(`Okay! I'll be back in ${payload.snoozeMin} min 👋`, ['is-waving']);
  } else {
    await leave('', null);
  }
}

$('yesBtn').addEventListener('click', () => respond('yes'));
$('laterBtn').addEventListener('click', () => respond('later'));
$('dismissBtn').addEventListener('click', () => respond('dismiss'));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') respond('dismiss');
});

// Transparent areas stay click-through; only the bubble and character catch the mouse.
document.addEventListener('mousemove', (e) => {
  setIgnoreMouse(!(e.target instanceof Element && e.target.closest('.bubble, .guy')));
});
document.addEventListener('mouseleave', () => setIgnoreMouse(true));

api.onShow(show);
api.onLeave(async ({ message }) => {
  while (busy) await sleep(100);
  leave(message, ['is-waving']);
});
