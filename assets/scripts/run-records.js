// ════════════════════════════════════════════════════════════════════════════
//  run-records.js - run history and menu leaderboard, stored in MariaDB through api/runs.php
// ════════════════════════════════════════════════════════════════════════════

const RUN_API_URL = 'api/runs.php';

function initRunRecords() {
  loadRunRecords();
}

function saveRunRecord(record) {
  return fetch(RUN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      score: Math.floor(record.score),
      wave:  Math.floor(record.wave),
      kills: Math.floor(record.kills),
      cards: Math.floor(record.cardsTaken),
    }),
  })
    .then(response => { if (!response.ok) throw new Error('Run save failed'); })
    .then(loadRunRecords)
    .catch(() => showRunRecordStatus('RUN RECORD COULD NOT BE SAVED'));
}

function loadRunRecords() {
  return fetch(RUN_API_URL, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Could not read run records');
      return response.json();
    })
    .then(renderRunRecords)
    .catch(() => showRunRecordStatus('RUN RECORDS UNAVAILABLE'));
}

function renderRunRecords(bestRuns) {
  const list = el('run-record-list');
  if (!list) return;
  list.innerHTML = '';

  if (bestRuns.length === 0) {
    showRunRecordStatus('NO RUNS RECORDED');
    return;
  }

  bestRuns.forEach((run, index) => {
    const row = document.createElement('div');
    row.className = 'run-record-row';

    const rank = document.createElement('span');
    rank.className = 'run-record-rank';
    rank.textContent = String(index + 1).padStart(2, '0');

    const waveLabel = document.createElement('span');
    waveLabel.className = 'run-record-wave';
    waveLabel.textContent = 'WAVE ' + run.wave;

    const scoreLabel = document.createElement('span');
    scoreLabel.className = 'run-record-score';
    scoreLabel.textContent = Number(run.score).toLocaleString();

    row.append(rank, waveLabel, scoreLabel);
    list.appendChild(row);
  });
}

function showRunRecordStatus(message) {
  const list = el('run-record-list');
  if (!list) return;
  list.textContent = message;
}