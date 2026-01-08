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

    if (seasonValue !== 'all') {
        const { start, end } = SEASONS[seasonValue];
        filteredGames = filteredGames.filter(g => {
        const gameDate = new Date(g.date);
        return gameDate >= start && gameDate <= end;
    });
    }

  // Filter games by type
    if (typeValue === 'regular') {
        filteredGames = filteredGames.filter(g => g.event_name !== "Playoffs");
        console.log(filteredGames);
        } else if (typeValue === 'playoffs') {
        filteredGames = filteredGames.filter(g => g.event_name === "Playoffs");
}

  // Build stats
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
            cpg: 0,
        };
    }

    for (const game of filteredGames) {
        for (const playerName in stats) {
            const s = stats[playerName];

            if (game.team1_name === s.team || game.team2_name === s.team) {
            s.gp++;
            }

            if (game.winner === s.team) s.w++;
            if (game.loser === s.team) {
            game.overtime ? s.otl++ : s.l++;
            }

            if (game.team1_player1 === playerName) s.cups += game.team1_player1_cups;
            if (game.team1_player2 === playerName) s.cups += game.team1_player2_cups;
            if (game.team2_player1 === playerName) s.cups += game.team2_player1_cups;
            if (game.team2_player2 === playerName) s.cups += game.team2_player2_cups;
        }
    }

    Object.values(stats).forEach(s => {
        s.cpg = s.gp ? (s.cups / s.gp).toFixed(2) : '0.00';
    });

    currentStats = Object.values(stats).sort((a, b) => b.cups - a.cups);
    renderStats(currentStats);
}

let sortState = {}; // tracks which column & direction

document.querySelectorAll('.standings-stat[data-key]').forEach(header => {
  header.addEventListener('click', () => {
    const key = header.dataset.key;
    const currentDir = sortState[key] || 'desc';
    const newDir = currentDir === 'asc' ? 'desc' : 'asc';
    sortState = {}; // reset: only one column sorted
    sortState[key] = newDir;

    // Remove sorted classes from all
    document.querySelectorAll('.standings-stat').forEach(h => {
      h.classList.remove('sorted', 'asc');
    });

    // Add sorted classes to clicked header
    header.classList.add('sorted');
    if (newDir === 'asc') {
      header.classList.add('asc');
    }

    // Sort data
    const sorted = [...currentStats].sort((a, b) => {
      if (a[key] === b[key]) return 0;
      if (typeof a[key] === 'string') {
        return newDir === 'asc' ? a[key].localeCompare(b[key]) : b[key].localeCompare(a[key]);
      } else {
        return newDir === 'asc' ? a[key] - b[key] : b[key] - a[key];
      }
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
      row.style.gridTemplateColumns = '2fr 3fr repeat(6, 1fr)';
      row.innerHTML = `
        <div class="standings-data">${player.name}</div>
        <div class="standings-team">${player.team}</div>
        <div class="standings-data">${player.gp}</div>
        <div class="standings-data">${player.w}</div>
        <div class="standings-data">${player.l}</div>
        <div class="standings-data">${player.otl}</div>
        <div class="standings-data">${player.cups}</div>
        <div class="standings-data">${player.cpg}</div>
      `;
      container.appendChild(row);
    });
  }  

document.getElementById('season-filter').addEventListener('change', fetchAndCalculateStats);
document.getElementById('type-filter').addEventListener('change', fetchAndCalculateStats);

fetchAndCalculateStats();