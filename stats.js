let currentStats = [];

async function fetchAndCalculateStats() {
    let playersArray = [];
    try {
        const res = await fetch(`https://bsnl-backend.vercel.app/api/players`);
        const data = await res.json();

    if (!Array.isArray(data)) {
        console.error('Unexpected response:', data);
        playersArray = [];
    }

    playersArray = data;

  } catch (err) {
      console.error('Error fetching events:', err);
      playersArray = [];
  }

    const stats = {};

    for (const player of playersArray) {
        const {
        name,
        team_name
        } = player;

        if (!stats[name]){
            stats[name] = {
                name: name,
                team: team_name,
                gp: 0,
                w: 0,
                l: 0,
                otl: 0,
                cups: 0,
                cpg: 0,
            };
        } 

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
            
            if(team1_name == team_name || team2_name == team_name){
                stats[name].gp ++;
            }
            
            if (winner == team_name){
                stats[name].w ++;
            }

            if (loser == team_name){
                if (overtime){
                    stats[name].otl ++;
                }
                else{
                    stats[name].l ++;
                }
            }
            if(team1_player1 == name){
                stats[name].cups += team1_player1_cups;
            }
            if(team1_player2 == name){
                stats[name].cups += team1_player2_cups;
            }
            if(team2_player1 == name){
                stats[name].cups += team2_player1_cups;
            }
            if(team2_player2 == name){
                stats[name].cups += team2_player2_cups;
            }
        }
        stats[name].cpg = stats[name].cups/stats[name].gp;
    }

    const statsArray = Object.values(stats)
    .sort((a, b) => {
        return b.cups - a.cups;
    });

    currentStats = statsArray;
    renderStats(currentStats);
}


document.querySelectorAll('.sort-btn').forEach(button => {
    button.addEventListener('click', () => {
      const key = button.dataset.key;
      const direction = button.dataset.dir;
  
      const sorted = [...currentStats].sort((a, b) => {
        if (a[key] === b[key]) return 0;
        return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
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
      row.style.gridTemplateColumns = '2fr repeat(7, 1fr)';
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

fetchAndCalculateStats();