const msgEl       = document.getElementById('message');
const attEl       = document.getElementById('attempts-label');
const resetBtn    = document.getElementById('reset-btn');
const winResetBtn = document.getElementById('win-reset-btn');
const overlayText = document.getElementById('overlay-text');
const overlayIcon = document.getElementById('overlay-icon');
const overlayMsg  = document.getElementById('overlay-msg');
const statusPanel = document.getElementById('status-panel');
const statusIcon  = document.getElementById('status-icon');
const distBar     = document.getElementById('distance-bar');
const distLabel   = document.getElementById('distance-label');
const winOverlay  = document.getElementById('win-overlay');
const winMessage  = document.getElementById('win-message');
const chips       = document.querySelectorAll('.hint-chips .chip');

const BOUNDS = {
  minLat: 41.290, maxLat: 41.360,
  minLng: 19.770, maxLng: 19.870
};

const THRESHOLDS = {
  found:     80,
  veryClose: 300,
  close:     700,
  medium:    1500
};

const MAX_DIST = 8000;

let map, secret, attempts, found, tileLayer;

function initMap() {
  map = L.map('map', {
    center: [41.3275, 19.8187],
    zoom: 14,
    zoomControl: true
  });

  tileLayer = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }
  ).addTo(map);

  map.on('click', handleClick);
  map.whenReady(newGame);
}

function randomSecret() {
  const lat = BOUNDS.minLat + Math.random() * (BOUNDS.maxLat - BOUNDS.minLat);
  const lng = BOUNDS.minLng + Math.random() * (BOUNDS.maxLng - BOUNDS.minLng);
  return L.latLng(lat, lng);
}

function getDirection(from, to) {
  const dLat  = to.lat - from.lat;
  const dLng  = to.lng - from.lng;
  const angle = Math.atan2(dLng, dLat) * 180 / Math.PI;
  if (angle >= -22.5  && angle <  22.5)  return 'Veri ↑';
  if (angle >=  22.5  && angle <  67.5)  return 'Veri-lindje ↗';
  if (angle >=  67.5  && angle < 112.5)  return 'Lindje →';
  if (angle >= 112.5  && angle < 157.5)  return 'Jug-lindje ↘';
  if (angle >=  157.5 || angle < -157.5) return 'Jug ↓';
  if (angle >= -157.5 && angle < -112.5) return 'Jug-perëndim ↙';
  if (angle >= -112.5 && angle <  -67.5) return 'Perëndim ←';
  return 'Veri-perëndim ↖';
}

function makeClickIcon(color, num) {
  return L.divIcon({
    className: '',
    html: `<div style="
        width:26px;height:26px;border-radius:50%;
        background:${color};border:2.5px solid rgba(255,255,255,0.95);
        display:flex;align-items:center;justify-content:center;
        font-size:10px;font-weight:700;color:white;
        box-shadow:0 2px 10px rgba(0,0,0,0.35),0 0 0 3px ${color}55;
        font-family:Inter,sans-serif;">${num}</div>`,
    iconSize:   [26, 26],
    iconAnchor: [13, 13]
  });
}

function makeTreasureIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
        font-size:34px;line-height:1;
        filter:drop-shadow(0 0 14px rgba(245,200,66,0.9));">🏆</div>`,
    iconSize:   [38, 38],
    iconAnchor: [19, 19]
  });
}

function updateDistBar(dist, color) {
  const pct = Math.max(0, Math.min(100, (1 - dist / MAX_DIST) * 100));
  distBar.style.width      = pct + '%';
  distBar.style.background = color;
  distBar.style.boxShadow  = `0 0 8px ${color}`;
  distLabel.textContent    = dist < 1000
    ? `${Math.round(dist)} m`
    : `${(dist / 1000).toFixed(1)} km`;
}

function activateChip(name) {
  chips.forEach(c => c.classList.remove('active'));
  const target = document.querySelector(`.chip.${name}`);
  if (target) target.classList.add('active');
}

function bounceIcon() {
  statusIcon.style.transform = 'scale(1.4) rotate(-10deg)';
  setTimeout(() => {
    statusIcon.style.transform = 'scale(1) rotate(0deg)';
  }, 300);
}

function setOverlay(icon, text, bgColor, borderColor) {
  overlayIcon.textContent      = icon;
  overlayText.textContent      = text;
  overlayMsg.style.background  = bgColor;
  overlayMsg.style.borderColor = borderColor;
  overlayMsg.style.transform   = 'translateX(-50%) scale(1.07)';
  setTimeout(() => {
    overlayMsg.style.transform = 'translateX(-50%) scale(1)';
  }, 180);
}

function handleClick(e) {
  if (found) return;

  const clicked = e.latlng;
  attempts++;
  attEl.textContent = attempts + (attempts === 1 ? ' tentativë' : ' tentativa');

  const dist = map.distance(clicked, secret);
  const dir  = getDirection(clicked, secret);

  statusPanel.className = '';
  let color, chipName;

  if (dist < THRESHOLDS.found) {
    found    = true;
    color    = '#52d68a';
    chipName = 'found';

    L.marker(clicked, { icon: makeClickIcon(color, attempts) }).addTo(map);
    L.marker(secret,  { icon: makeTreasureIcon() }).addTo(map);
    L.circle(secret, {
      radius: THRESHOLDS.found,
      color: '#52d68a', fillColor: '#52d68a',
      fillOpacity: 0.15, weight: 2
    }).addTo(map);

    setOverlay('🏆', 'E gjete thesarin!',
      'rgba(82,214,138,0.85)', 'rgba(82,214,138,0.6)');
    statusPanel.classList.add('state-found');
    statusIcon.textContent = '🏆';
    msgEl.textContent = `🏆 E gjete thesarin pas ${attempts} ${attempts === 1 ? 'tentativë' : 'tentativa'}! Bravo!`;
    updateDistBar(0, color);
    activateChip('found');

    setTimeout(() => {
      winMessage.textContent =
        `E gjete pas ${attempts} ${attempts === 1 ? 'tentativë' : 'tentativa'}! Bravo eksplorer! 🗺️`;
      winOverlay.classList.remove('hidden');
    }, 900);
    return;

  } else if (dist < THRESHOLDS.veryClose) {
    color    = '#52d68a'; chipName = 'hot';
    statusPanel.classList.add('state-hot');
    statusIcon.textContent = '🔥';
    msgEl.textContent = `🟢 Shumë afër! (${Math.round(dist)} m) — Drejtohu nga ${dir}`;
    setOverlay('🟢', `Shumë afër! → ${dir}`,
      'rgba(82,214,138,0.75)', 'rgba(82,214,138,0.5)');

  } else if (dist < THRESHOLDS.close) {
    color    = '#f5c842'; chipName = 'warm';
    statusPanel.classList.add('state-warm');
    statusIcon.textContent = '🌡️';
    msgEl.textContent = `🟡 Afër! (${Math.round(dist)} m) — Drejtim: ${dir}`;
    setOverlay('🟡', `Afër! → ${dir}`,
      'rgba(245,200,66,0.75)', 'rgba(245,200,66,0.5)');

  } else if (dist < THRESHOLDS.medium) {
    color    = '#e86c4a'; chipName = 'warm';
    statusPanel.classList.add('state-medium');
    statusIcon.textContent = '🌡️';
    msgEl.textContent = `🔴 Mesatarisht larg. (${Math.round(dist)} m) — Drejtim: ${dir}`;
    setOverlay('🔴', `Mesatarisht larg → ${dir}`,
      'rgba(232,108,74,0.75)', 'rgba(232,108,74,0.5)');

  } else {
    color    = '#7ecbf7'; chipName = 'cold';
    statusPanel.classList.add('state-cold');
    statusIcon.textContent = '❄️';
    msgEl.textContent = `❄️ Shumë larg! (${(dist / 1000).toFixed(1)} km) — Shko nga ${dir}`;
    setOverlay('❄️', `Shumë larg → ${dir}`,
      'rgba(126,203,247,0.7)', 'rgba(126,203,247,0.4)');
  }

  L.marker(clicked, { icon: makeClickIcon(color, attempts) }).addTo(map);
  updateDistBar(dist, color);
  activateChip(chipName);
  bounceIcon();
}

function newGame() {
  map.eachLayer(layer => {
    if (layer !== tileLayer) map.removeLayer(layer);
  });

  secret   = randomSecret();
  attempts = 0;
  found    = false;

  winOverlay.classList.add('hidden');
  statusPanel.className = '';

  const defaultMsg = 'Kliko në hartë për të gjetur thesarin!';
  msgEl.textContent            = defaultMsg;
  attEl.textContent            = '0 tentativa';
  statusIcon.textContent       = '🧭';
  overlayIcon.textContent      = '🧭';
  overlayText.textContent      = defaultMsg;
  overlayMsg.style.background  = 'rgba(11,15,26,0.78)';
  overlayMsg.style.borderColor = 'rgba(255,255,255,0.08)';
  distBar.style.width          = '0%';
  distLabel.textContent        = '—';
  chips.forEach(c => c.classList.remove('active'));

  map.setView([41.3275, 19.8187], 14);
}

resetBtn.addEventListener('click',    newGame);
winResetBtn.addEventListener('click', newGame);

initMap();
