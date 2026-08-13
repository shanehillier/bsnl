const CURRENT_SEASON = 's2';

const SEASONS = {
  s1: {
    start: new Date('2025-06-01'),
    end: new Date('2026-01-31'),
  },
  s2: {
    start: new Date('2026-08-01'),
    end: new Date('2099-12-31'),
  },
};

let teamLogos = {};

async function loadTeamLogos() {
  try {
    const res = await fetch(
      `https://bsnl-backend.vercel.app/api/teams?season=${CURRENT_SEASON}`
    );

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error('Unexpected team response:', data);
      return;
    }

    teamLogos = {};

    data.forEach(team => {
      teamLogos[team.name] = team.logo_path;
    });
  } catch (err) {
    console.error('Error fetching team logos:', err);
  }

  loadTeams();
}

function renderTeam(team, games) {
  const container = document.getElementById('team-main');

  let wins = 0;
  let losses = 0;
  let overtimeLosses = 0;

  const teamDiv = document.createElement('div');
  teamDiv.className = 'team-card';

  let teamDivHTML = `
    <div class="team-header">
      <img src="${team.logo_path}" alt="${team.name} Logo" class="team-logo" />
      <h2 class="team-name">${team.name}</h2>
    </div>

    <p class="team-description">${team.description || ''}</p>

    <div class="team-section">
      <h3>SCHEDULE</h3>
      <div class="mini-wrapper">
        <table class="mini-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>OPPONENT</th>
              <th>RESULT</th>
            </tr>
          </thead>
          <tbody>
  `;

  for (const game of games) {
    if (game.team1_name !== team.name && game.team2_name !== team.name) {
      continue;
    }

    const opponent =
      game.team1_name === team.name ? game.team2_name : game.team1_name;

    const opponentLogo = teamLogos[opponent];

    let result = 'Upcoming';

    if (game.winner === team.name) {
      wins++;
      result = 'W';
    } else if (game.loser === team.name) {
      if (game.overtime) {
        overtimeLosses++;
        result = 'OTL';
      } else {
        losses++;
        result = 'L';
      }
    }

    teamDivHTML += `
      <tr>
        <td>${game.date}</td>
        <td>
          ${
            opponentLogo
              ? `<img src="${opponentLogo}" alt="${opponent} Logo" style="height: 20px;">`
              : ''
          }
          ${opponent}
        </td>
        <td>${result}</td>
      </tr>
    `;
  }

  teamDivHTML += `
          </tbody>
        </table>
      </div>
    </div>

    <div class="team-section">
      <h3>ROSTER</h3>
      <div class="mini-wrapper">
        <table class="mini-table">
          <thead>
            <tr>
              <th>#</th>
              <th>PLAYER</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>1</td><td>${team.player1 || ''}</td></tr>
            <tr><td>2</td><td>${team.player2 || ''}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  teamDiv.innerHTML = teamDivHTML;
  container.appendChild(teamDiv);
}

async function loadTeams() {
  const container = document.getElementById('team-main');
  container.innerHTML = '';

  let gamesArray = [];

  try {
    const res = await fetch(
      'https://bsnl-backend.vercel.app/api/gamesasc'
    );

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error('Unexpected games response:', data);
    } else {
      const { start, end } = SEASONS[CURRENT_SEASON];

      gamesArray = data
        .filter(game => {
          const gameDate = new Date(game.date);
          return gameDate >= start && gameDate <= end;
        })
        .sort((a, b) => a.id - b.id);
    }
  } catch (err) {
    console.error('Error fetching games:', err);
  }

  let teamsArray = [];

  try {
    const res = await fetch(
      `https://bsnl-backend.vercel.app/api/teams?season=${CURRENT_SEASON}`
    );

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error('Unexpected team response:', data);
    } else {
      teamsArray = data;
    }
  } catch (err) {
    console.error('Error fetching teams:', err);
  }

  teamsArray.forEach(team => {
    renderTeam(team, gamesArray);
  });
}

loadTeamLogos();