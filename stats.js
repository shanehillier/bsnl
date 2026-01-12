const SEASONS = {
  s1: { start: new Date('2025-06-01'), end: new Date('2026-01-31') },
};

let currentStats = [];
let allGames = [];

async function fetchAndCalculateStats() {
  const seasonValue = document.getElementById('season-filter')?.value || 'all';
  const typeValue = document.getElementById('type-filter')?.value || 'total';

  const playersRes = await fetch(`https://bsnl-backend.vercel.app/api/players`);
  const playersArray = await playersRes.json();

  if (allGames.length === 0) {
    const gamesRes = await fetch(`https://bsnl-backend.vercel.app/api/games`);
    allGames = await gamesRes.json();
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
    filteredGames = filteredGames.filter(g => g.event_name !== "Playoffs");
  } else if (typeValue === 'playoffs') {
    filteredGames = filteredGames.filter(g => g.event_name === "Playoffs");
  }

  // Initialize stats
  const stats = {};
  for (const player of playersArray) {
    stats[player.name] = {
      name: player.name,
      team: player.team_name,
      gp: 0,
      w: 0,
      l: 0,
      otl: 0,
      cups: 0,
      ncups: 0,
      cpg: 0,
      ncpg: 0,
    };
  }

  // Process games
  for (const game of filteredGames) {

    // Build team rosters safely (NULLs removed)
    const team1Players = [
      game.team1_player1,
      game.team1_player2
    ].filter(p => p !== null);

    const team2Players = [
      game.team2_player1,
      game.team2_player2
    ].filter(p => p !== null);

    // Normalization factors
    const team1Factor = team1Players.length ? team1Players.length / 2 : 0;
    const team2Factor = team2Players.length ? team2Players.length / 2 : 0;

    for (const playerName in stats) {
      const s = stats[playerName];

      const playerPlayed =
        team1Players.includes(playerName) ||
        team2Players.includes(playerName);

      if (!playerPlayed) continue;

      // Games played
      s.gp++;

      // Wins / losses only count if player played
      if (game.winner === s.team) s.w++;
      if (game.loser === s.team) {
        game.overtime ? s.otl++ : s.l++;
      }

      // Raw + normalized cups
      if (game.team1_player1 === playerName) {
        s.cups += game.team1_player1_cups;
        s.ncups += game.team1_player1_cups * team1Factor;
      }

      if (game.team1_player2 === playerName) {
        s.cups += game.team1_player2_cups;
        s.ncups += game.team1_player2_cups * team1Factor;
      }

      if (game.team2_player1 === playerName) {
        s.cups += game.team2_player1_cups;
        s.ncups += game.team2_player1_cups * team2Factor;
      }

      if (game.team2_player2 === playerName) {
        s.cups += game.team2_player2_cups;
        s.ncups += game.team2_player2_cups * team2Factor;
      }
    }
  }

  // Final per-game calculations
  Object.values(stats).forEach(s => {
    s.cpg = s.gp ? (s.cups / s.gp).toFixed(2) : '0.00';
    s.ncpg = s.gp ? (s.ncups / s.gp).toFixed(2) : '0.00';
  });

  // Default sort: normalized cups
  currentStats = Object.values(stats).sort((a, b) => b.ncups - a.ncups);
  renderStats(currentStats);
}

let sortState = {};

document.querySelectorAll('.standings-stat[data-key]').forEach(header => {
  header.addEventListener('click', () => {
    const key = header.dataset.key;
    const currentDir = sortState[key] || 'desc';
    const newDir = currentDir === 'asc' ? 'desc' : 'asc';

    sortState = { [key]: newDir };

    document.querySelectorAll('.standings-stat').forEach(h => {
      h.classList.remove('sorted', 'asc');
    });

    header.classList.add('sorted');
    if (newDir === 'asc') header.classList.add('asc');

    const sorted = [...currentStats].sort((a, b) => {
      if (typeof a[key] === 'string') {
        return newDir === 'asc'
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]);
      }
      return newDir === 'asc' ? a[key] - b[key] : b[key] - a[key];
    });

    renderStats(sorted);
  });
});

function renderStats(data) {
  const container = document.getElementById('stats-body');
  container.innerHTML = '';

  data.forEach(player => {
    const row = document.createElement('div');
    row.classList.add('standings-row');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '2fr 3fr repeat(8, 1fr)';

    row.innerHTML = `
      <div class="standings-data">${player.name}</div>
      <div class="standings-team">${player.team}</div>
      <div class="standings-data">${player.gp}</div>
      <div class="standings-data">${player.w}</div>
      <div class="standings-data">${player.l}</div>
      <div class="standings-data">${player.otl}</div>
      <div class="standings-data">${player.cups}</div>
      <div class="standings-data">${player.cpg}</div>
      <div class="standings-data">${player.ncups.toFixed(1)}</div>
      <div class="standings-data">${player.ncpg}</div>
    `;

    container.appendChild(row);
  });
}

document.getElementById('season-filter').addEventListener('change', fetchAndCalculateStats);
document.getElementById('type-filter').addEventListener('change', fetchAndCalculateStats);

fetchAndCalculateStats();
