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
}

async function fetchAndCalculateStandings() {
  let gamesArray = [];
  try {
    const res = await fetch(`https://bsnl-backend.vercel.app/api/games`);
    const data = await res.json();

    if (!Array.isArray(data)) {
        console.error('Unexpected response:', data);
        gamesArray = [];
    }

    gamesArray = data;

  } catch (err) {
      console.error('Error fetching events:', err);
      gamesArray = [];
  }
  
    const standings = {};
  
    for (const game of gamesArray) {
      const {
        team1_name,
        team2_name,
        score1,
        score2,
        winner,
        loser,
        overtime,
        team1_player1,
        team1_player1_cups,
        team1_player2,
        team1_player2_cups,
        team2_player1,
        team2_player1_cups,
        team2_player2,
        team2_player2_cups,
      } = game;
  
      // Ensure both teams are in the standings object
      for (const team of [team1_name, team2_name]) {
        if (!standings[team]) {
          standings[team] = {
            team: team,
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
  
      // Update GP
      standings[team1_name].gp += 1;
      standings[team2_name].gp += 1;
  
      // Update CF (Points For) and CA (Against)
      standings[team1_name].cf += score1;
      standings[team1_name].ca += score2;
  
      standings[team2_name].cf += score2;
      standings[team2_name].ca += score1;
  
      for (const team of Object.values(standings)) {
        team.plusMinus = team.cf - team.ca;
      }

      // Update W/L/OTL
      standings[winner].w += 1;
      standings[loser].l += overtime ? 0 : 1;
      standings[loser].otl += overtime ? 1 : 0;
  
      // Update Points
      standings[winner].pts += 2;
      if (overtime) {
        standings[loser].pts += 1;
      }
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
        team.position = index + 1;
        team.rank = index + 1;
    });

  currentStandings = standingsArray;
  renderStandings(currentStandings);
  }

  let sortState = {}; // track current direction per column

  document.querySelectorAll('.standings-stat[data-key]').forEach(header => {
    header.addEventListener('click', () => {
      const key = header.dataset.key;
      const currentDir = sortState[key] || 'desc';
      const newDir = currentDir === 'asc' ? 'desc' : 'asc';
      sortState = {}; // reset so only one active sort
      sortState[key] = newDir;

      // Remove sorted classes from all
      document.querySelectorAll('.standings-stat').forEach(h => {
        h.classList.remove('sorted', 'asc');
      });

      // Add sorted classes to current header
      header.classList.add('sorted');
      if (newDir === 'asc') {
        header.classList.add('asc');
      }

      const sorted = [...currentStandings].sort((a, b) => {
        if (a[key] === b[key]) return 0;
        if (typeof a[key] === 'string') {
          return newDir === 'asc' ? a[key].localeCompare(b[key]) : b[key].localeCompare(a[key]);
        } else {
          return newDir === 'asc' ? a[key] - b[key] : b[key] - a[key];
        }
      });

      renderStandings(sorted);
    });
  });
  
  function renderStandings(data) {
    const container = document.getElementById('standings-body');
    container.innerHTML = '';
  
    data.forEach(team => {
      teamLogo = teamLogos[team.team];
      const row = document.createElement('div');
      row.classList.add('standings-row');
      row.style.display = 'grid';
      row.innerHTML = `
        <div class="standings-team" style="display: flex; align-items: center; gap: 6px;">
        ${teamLogo ? `<img src="${teamLogo}" alt="${team.team} Logo" style="height: 20px;">` : ''}
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
  
  loadTeamLogos();