const SEASONS = {
  s1: { start: new Date('2025-06-01'), end: new Date('2026-01-31') },
};

let currentStandings = [];
let teamLogos = {};
let allGames = [];

async function loadTeamLogos() {
  try {
    const res = await fetch(`https://bsnl-backend.vercel.app/api/teams`);
    const data = await res.json();

    data.forEach(team => {
      teamLogos[team.name] = team.logo_path;
    });
  } catch (err) {
    console.error('Error fetching team logos:', err);
  }

  fetchAndCalculateStandings();
}

async function fetchAndCalculateStandings() {
  const seasonValue = document.getElementById('season-filter')?.value || 'all';
  const typeValue = 'regular'; // Standings only for regular season

  if (allGames.length === 0) {
    try {
      const res = await fetch(`https://bsnl-backend.vercel.app/api/games`);
      allGames = await res.json();
    } catch (err) {
      console.error('Error fetching games:', err);
      allGames = [];
    }
  }

  let filteredGames = [...allGames];

  // Season filter
  if (seasonValue !== 'all') {
    const { start, end } = SEASONS[seasonValue];
    filteredGames = filteredGames.filter(g => {
      const gameDate = new Date(g.date);
      return gameDate >= start && gameDate <= end;
    });
  }

  // Game type filter
  if (typeValue === 'regular') {
    filteredGames = filteredGames.filter(g => g.event_name !== 'Playoffs');
  } else if (typeValue === 'playoffs') {
    filteredGames = filteredGames.filter(g => g.event_name === 'Playoffs');
  }

  const standings = {};

  for (const game of filteredGames) {
    const {
      team1_name,
      team2_name,
      score1,
      score2,
      winner,
      loser,
      overtime,
    } = game;

    for (const team of [team1_name, team2_name]) {
      if (!standings[team]) {
        standings[team] = {
          team,
          gp: 0,
          w: 0,
          l: 0,
          otl: 0,
          pts: 0,
          cf: 0,
          ca: 0,
          rank: 0,
        };
      }
    }

    // GP
    standings[team1_name].gp++;
    standings[team2_name].gp++;

    // Cups For / Against
    standings[team1_name].cf += score1;
    standings[team1_name].ca += score2;

    standings[team2_name].cf += score2;
    standings[team2_name].ca += score1;

    // Wins / losses
    standings[winner].w++;
    standings[loser].l += overtime ? 0 : 1;
    standings[loser].otl += overtime ? 1 : 0;

    // Points
    standings[winner].pts += 2;
    if (overtime) standings[loser].pts += 1;
  }

  const standingsArray = Object.values(standings)
    .map(team => ({
      ...team,
      plusMinus: team.cf - team.ca,
    }))
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      return b.plusMinus - a.plusMinus;
    });

  standingsArray.forEach((team, index) => {
    team.rank = index + 1;
  });

  currentStandings = standingsArray;
  renderStandings(currentStandings);
}

let sortState = {};

document.querySelectorAll('.standings-stat[data-key]').forEach(header => {
  header.addEventListener('click', () => {
    const key = header.dataset.key;
    const dir = sortState[key] === 'asc' ? 'desc' : 'asc';
    sortState = { [key]: dir };

    document.querySelectorAll('.standings-stat').forEach(h =>
      h.classList.remove('sorted', 'asc')
    );

    header.classList.add('sorted');
    if (dir === 'asc') header.classList.add('asc');

    const sorted = [...currentStandings].sort((a, b) => {
      if (typeof a[key] === 'string') {
        return dir === 'asc'
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]);
      }
      return dir === 'asc' ? a[key] - b[key] : b[key] - a[key];
    });

    renderStandings(sorted);
  });
});

function renderStandings(data) {
  const container = document.getElementById('standings-body');
  container.innerHTML = '';

  data.forEach(team => {
    const logo = teamLogos[team.team];
    const row = document.createElement('div');
    row.classList.add('standings-row');
    row.style.display = 'grid';

    row.innerHTML = `
      <div class="standings-team" style="display:flex;align-items:center;gap:6px;">
        ${logo ? `<img src="${logo}" style="height:20px;">` : ''}
        <span>${team.team}</span>
      </div>
      <div class="standings-data">${team.rank}</div>
      <div class="standings-data">${team.gp}</div>
      <div class="standings-data">${team.w}</div>
      <div class="standings-data">${team.l}</div>
      <div class="standings-data">${team.otl}</div>
      <div class="standings-data">${team.pts}</div>
      <div class="standings-data">${team.cf}</div>
      <div class="standings-data">${team.ca}</div>
      <div class="standings-data">${team.plusMinus}</div>
    `;

    container.appendChild(row);
  });
}

document.getElementById('season-filter')?.addEventListener('change', fetchAndCalculateStandings);
document.getElementById('type-filter')?.addEventListener('change', fetchAndCalculateStandings);

loadTeamLogos();
