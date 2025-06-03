let currentStandings = [];

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

  document.querySelectorAll('.sort-btn').forEach(button => {
    button.addEventListener('click', () => {
      const key = button.dataset.key;
      const direction = button.dataset.dir;
  
      const sorted = [...currentStandings].sort((a, b) => {
        if (a[key] === b[key]) return 0;
        return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
      });
  
      renderStandings(sorted);
    });
  });
  
  function renderStandings(data) {
    const container = document.getElementById('standings-body');
    container.innerHTML = '';
  
    data.forEach(team => {
      const row = document.createElement('div');
      row.classList.add('standings-row');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = 'repeat(10, 1fr)';
      row.innerHTML = `
        <div class="standings-team">${team.team}</div>
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
  
  fetchAndCalculateStandings();