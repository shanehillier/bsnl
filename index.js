const SEASONS = {
  s1: { start: new Date('2025-06-01'), end: new Date('2026-01-31') },
  s2: { start: new Date('2026-08-01'), end: new Date('2099-12-31') },
};

let resultsAutoScrollFrame = null;
let resultsAutoScrollStopped = false;
let resultsScrollDirection = 1;
let resultsLastFrameTime = 0;

function stopResultsAutoScroll() {
  resultsAutoScrollStopped = true;

  if (resultsAutoScrollFrame) {
    cancelAnimationFrame(resultsAutoScrollFrame);
    resultsAutoScrollFrame = null;
  }
}

function startResultsAutoScroll() {
  const resultsTrack = document.getElementById('latest-results-body');

  if (
    !resultsTrack ||
    resultsAutoScrollStopped ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    resultsTrack.scrollWidth <= resultsTrack.clientWidth
  ) {
    return;
  }

  if (resultsAutoScrollFrame) {
    cancelAnimationFrame(resultsAutoScrollFrame);
  }

  resultsScrollDirection = 1;
  resultsLastFrameTime = 0;

  const scrollResults = timestamp => {
    if (resultsAutoScrollStopped) return;

    if (!resultsLastFrameTime) {
      resultsLastFrameTime = timestamp;
    }

    const elapsed = timestamp - resultsLastFrameTime;
    resultsLastFrameTime = timestamp;

    const maxScroll = resultsTrack.scrollWidth - resultsTrack.clientWidth;

    /* Slow speed: approximately 25 pixels per second */
    resultsTrack.scrollLeft += resultsScrollDirection * elapsed * 0.025;

    /* Reverse direction at either end of the strip */
    if (resultsTrack.scrollLeft >= maxScroll) {
      resultsTrack.scrollLeft = maxScroll;
      resultsScrollDirection = -1;
    } else if (resultsTrack.scrollLeft <= 0) {
      resultsTrack.scrollLeft = 0;
      resultsScrollDirection = 1;
    }

    resultsAutoScrollFrame = requestAnimationFrame(scrollResults);
  };

  resultsAutoScrollFrame = requestAnimationFrame(scrollResults);
}

function setUpResultsAutoScrollControls() {
  const resultsTrack = document.getElementById('latest-results-body');

  if (!resultsTrack) return;

  /* Any user interaction means the user has taken over */
  resultsTrack.addEventListener('pointerdown', stopResultsAutoScroll, {
    passive: true
  });

  resultsTrack.addEventListener('touchstart', stopResultsAutoScroll, {
    passive: true
  });

  resultsTrack.addEventListener('wheel', stopResultsAutoScroll, {
    passive: true
  });

  resultsTrack.addEventListener('keydown', stopResultsAutoScroll);
  resultsTrack.addEventListener('focusin', stopResultsAutoScroll);
}

let currentStandings = [];
let teamLogos = {};

async function loadTeamLogos() {
  try {
    const res = await fetch(`https://bsnl-backend.vercel.app/api/teams`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error('Unexpected response:', data);
      return;
    }

    data.forEach(team => {
      teamLogos[team.name] = team.logo_path;
    });
  } catch (err) {
    console.error('Error fetching team logos:', err);
  }

  fetchAndCalculateStandings();
  fetchLatestResults();
}

async function fetchAndCalculateStandings() {
  let gamesArray = [];
  try {
    const res = await fetch(`https://bsnl-backend.vercel.app/api/games`);
    const data = await res.json();
    gamesArray = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error fetching games:', err);
    gamesArray = [];
  }

  // Determine the most recent season
  const latestSeasonKey = Object.keys(SEASONS).sort((a, b) => SEASONS[b].start - SEASONS[a].start)[0];
  const { start, end } = SEASONS[latestSeasonKey];

  // Filter to regular season games in the latest season
  const filteredGames = gamesArray.filter(g => {
    const gameDate = new Date(g.date);
    return gameDate >= start && gameDate <= end && g.event_name !== 'Playoffs';
  });

  const standings = {};

  for (const game of filteredGames) {
    const { team1_name, team2_name, score1, score2, winner, loser, overtime } = game;

    [team1_name, team2_name].forEach(team => {
      if (!standings[team]) {
        standings[team] = { team, gp: 0, w: 0, l: 0, otl: 0, pts: 0, cf: 0, ca: 0 };
      }
    });

    standings[team1_name].gp += 1;
    standings[team2_name].gp += 1;

    standings[team1_name].cf += score1;
    standings[team1_name].ca += score2;
    standings[team2_name].cf += score2;
    standings[team2_name].ca += score1;

    standings[winner].w += 1;
    standings[loser].l += overtime ? 0 : 1;
    standings[loser].otl += overtime ? 1 : 0;

    standings[winner].pts += 2;
    if (overtime) standings[loser].pts += 1;
  }

  const standingsArray = Object.values(standings)
    .map(team => ({ ...team, plusMinus: team.cf - team.ca }))
    .sort((a, b) => (b.pts !== a.pts ? b.pts - a.pts : b.plusMinus - a.plusMinus))
    .map((team, index) => ({ ...team, rank: index + 1 }));

  currentStandings = standingsArray;
  renderStandings(currentStandings);
}

function renderStandings(data) {
  const container = document.getElementById('standings-body');
  container.innerHTML = '';

  data.forEach(team => {
    const logo = teamLogos[team.team];
    const row = document.createElement('div');
    row.classList.add('small-standings-row');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';

    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px;">
        ${logo ? `<img src="${logo}" alt="${team.team} Logo" style="height: 20px;">` : ''}
        <span>${team.team}</span>
      </div>
      <div style="font-size: 0.9em;">
        ${team.w}-${team.l}${team.otl > 0 ? '-' + team.otl : ''} | ${team.pts} pts
      </div>
    `;
    container.appendChild(row);
  });
}

async function fetchLatestResults() {
  let resultsArray = [];
  try {
    const res = await fetch(`https://bsnl-backend.vercel.app/api/games`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error('Unexpected response:', data);
      resultsArray = [];
    } else {
      resultsArray = data;
    }
  } catch (err) {
    console.error('Error fetching games:', err);
    resultsArray = [];
  }

  // Filter only completed games
  const completedGames = resultsArray.filter(g => g.score1 !== null && g.score2 !== null);

  // Sort by date descending (newest first)
  completedGames.sort((a, b) => b.id - a.id);

  // Take top 10
  const latestGames = completedGames.slice(0, 10);

  let resultsHTML = '';

  for (const game of latestGames) {
    const logo1 = teamLogos[game.team1_name] || '';
    const logo2 = teamLogos[game.team2_name] || '';
    const isOT = game.overtime;

    // Format date
    const gameDate = formatLocalDate(game.date);

    resultsHTML += `
      <div class="latest-result-card">
        <div class="team-row">
          <img class="team-logo" src="${logo1}" alt="${game.team1_name} logo">
          <span class="team-name">${game.team1_name}</span>
          <span class="score ${game.winner === game.team1_name ? 'winner' : ''}">${game.score1}</span>
        </div>
        <div class="team-row">
          <img class="team-logo" src="${logo2}" alt="${game.team2_name} logo">
          <span class="team-name">${game.team2_name}</span>
          <span class="score ${game.winner === game.team2_name ? 'winner' : ''}">${game.score2}</span>
        </div>
        <div class="overtime-text">
          ${isOT ? 'Final (OT)' : 'Final'} | ${gameDate}
        </div>
      </div>
    `;
  }

  const resultsTrack = document.getElementById('latest-results-body');

  resultsTrack.innerHTML = resultsHTML;

  setUpResultsAutoScrollControls();

  /* Wait for the browser to measure the newly rendered game cards */
  requestAnimationFrame(() => {
    startResultsAutoScroll();
  });
}

// Format date correctly for local timezone
function formatLocalDate(dateStr) {
  if (!dateStr) return '';
  // Split YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
  const [year, month, day] = dateStr.split('T')[0].split('-');
  const d = new Date(year, month - 1, day); // month is 0-indexed
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

loadTeamLogos();
