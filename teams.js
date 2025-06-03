function renderTeam(team, games) {
    const container = document.getElementById("team-main");
    wins = 0;
    losses = 0;
    overtimelosses = 0;
  
    const teamDiv = document.createElement("div");
    teamDiv.className = "team-card";
  
    teamDivHTML = `
      <div class="team-header">
        <img src="${team.logo_path}" alt="${team.name} Logo" class="team-logo" />
        <h2 class="team-name">${team.name}</h2>
      </div>
      <p class="team-description">${team.description || ''}</p>
  
      <div class="team-section">
        <h3>SCHEDULE</h3>
        <div class="mini-wrapper">
        <table class="mini-table">
          <thead><tr><th>DATE</th><th>OPPONENT</th><th>RESULT</th></tr></thead>
          <tbody>`;

          for (const game of games) {
            // Skip irrelevant games
            if (game.team1_name !== team.name && game.team2_name !== team.name) continue;
          
            // Identify opponent
            const opponent = game.team1_name === team.name ? game.team2_name : game.team1_name;
          
            // Identify result
            let result = "Upcoming";
            if (game.winner === team.name) {
              wins++;
              result = "W";
            } else if (game.loser === team.name) {
              if (game.overtime) {
                overtimelosses++;
                result = "OTL";
              } else {
                losses++;
                result = "L";
              }
            }
          
            // Safely build a full row
            teamDivHTML += `
              <tr>
                <td>${game.date}</td>
                <td>${opponent}</td>
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
                <tr><th>#</th><th>PLAYER</th></tr>
            </thead>
            <tbody>
                <tr><td>1</td><td>${team.player1}</td></tr>
                <tr><td>2</td><td>${team.player2}</td></tr>
            </tbody>
            </table>
        </div>
      </div>
    `;

    teamDiv.innerHTML = teamDivHTML;
  
    container.appendChild(teamDiv);
  }
  
  async function loadTeams() {
    let gamesArray = [];
    try {
        const res = await fetch(`https://bsnl-backend.vercel.app/api/gamesasc`);
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

    let teamsArray = [];
    try {
        const res = await fetch(`https://bsnl-backend.vercel.app/api/teams`);
        const data = await res.json();

    if (!Array.isArray(data)) {
        console.error('Unexpected response:', data);
        teamsArray = [];
    }

    teamsArray = data;

    } catch (err) {
        console.error('Error fetching events:', err);
        teamsArray = [];
    }

    teamsArray.forEach(team => {
      renderTeam(team, gamesArray);
  });
  }

  loadTeams();
  