let currentStandings = [];
let teamLogos = {};

async function loadTeamLogos() {
  try {
    const res = await fetch(`https://bsnl-backend.vercel.app/api/teams`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("Unexpected response:", data);
      return;
    }

    data.forEach(team => {
      teamLogos[team.name] = team.logo_path;
    });
  } catch (err) {
    console.error("Error fetching team logos:", err);
  }

  fetchAndCalculateStandings();
}

async function fetchAndCalculateStandings() {
  let gamesArray = [];
  try {
    const res = await fetch(`https://bsnl-backend.vercel.app/api/games`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("Unexpected response:", data);
      gamesArray = [];
    } else {
      gamesArray = data;
    }
  } catch (err) {
    console.error("Error fetching games:", err);
    gamesArray = [];
  }

  const standings = {};

  for (const game of gamesArray) {
    const { team1_name, team2_name, score1, score2, winner, loser, overtime } = game;

    // Ensure both teams exist
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

    standings[team1_name].gp += 1;
    standings[team2_name].gp += 1;

    standings[team1_name].cf += score1;
    standings[team1_name].ca += score2;
    standings[team2_name].cf += score2;
    standings[team2_name].ca += score1;

    for (const t of Object.values(standings)) {
      t.plusMinus = t.cf - t.ca;
    }

    standings[winner].w += 1;
    standings[loser].l += overtime ? 0 : 1;
    standings[loser].otl += overtime ? 1 : 0;

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
  buildBracket(currentStandings, teamLogos);
}

function buildBracket(teams, logos) {
  const container = document.getElementById("bracket-container");
  container.innerHTML = "";

  if (teams.length === 5) {
    buildFiveTeamBracket(teams, logos, container);
  } else {
    buildStandardBracket(teams, logos, container);
  }
}

// CUSTOM 5-TEAM BRACKET
function buildFiveTeamBracket(teams, logos, container) {
  const [seed1, seed2, seed3, seed4, seed5] = teams;

  container.innerHTML = `
    <div class="round">
      <h2>Round 1</h2>
      <div class="playoffmatch">
        <div class="playoffteam">${renderTeam(seed4, logos)}</div>
        <span>vs</span>
        <div class="playoffteam">${renderTeam(seed5, logos)}</div>
        <div class="note">Winner plays ${seed1.team}</div>
      </div>
    </div>

    <div class="round">
      <h2>Semi-Finals</h2>
      <div class="playoffmatch">
        <div class="playoffteam">${renderTeam(seed1, logos)}</div>
        <span>vs</span>
        <div class="playoffteam">Winner of 4 vs 5</div>
      </div>
       <div class="playoffmatch">
        <div class="playoffteam">${renderTeam(seed2, logos)}</div>
        <span>vs</span>
        <div class="playoffteam">${renderTeam(seed3, logos)}</div>
      </div>
    </div>

    <div class="round">
      <h2>Final</h2>
      <div class="playoffmatch">
        <div class="playoffteam">Winner SF1</div>
        <span>vs</span>
        <div class="playoffteam">Winner SF2</div>
      </div>
    </div>
  `;
}

//GENERIC BRACKET BUILDER (works best with multiples of 2)
function buildStandardBracket(teams, logos, container) {
  // Pad to next power of 2
  const size = Math.pow(2, Math.ceil(Math.log2(teams.length)));
  const padded = [...teams];
  while (padded.length < size) padded.push({ team: "BYE", rank: "-" });

  let roundTeams = padded;
  let roundNum = 1;

  while (roundTeams.length > 1) {
    const roundDiv = document.createElement("div");
    roundDiv.className = "round";
    roundDiv.innerHTML = `<h2>${roundTitle(roundNum, roundTeams.length)}</h2>`;

    const nextRound = [];
    for (let i = 0; i < roundTeams.length; i += 2) {
      const t1 = roundTeams[i];
      const t2 = roundTeams[i + 1];

      const matchDiv = document.createElement("div");
      matchDiv.className = "playoffmatch";
      matchDiv.innerHTML = `
        <div class="playoffteam">${renderTeam(t1, logos)}</div>
        <span>vs</span>
        <div class="playoffteam">${renderTeam(t2, logos)}</div>
      `;
      roundDiv.appendChild(matchDiv);

      nextRound.push({ team: "Winner", rank: "-" });
    }

    container.appendChild(roundDiv);
    roundTeams = nextRound;
    roundNum++;
  }
}

function roundTitle(roundNum, teamsLeft) {
  if (teamsLeft === 2) return "Final";
  if (teamsLeft === 4) return "Semi-Finals";
  if (teamsLeft === 8) return "Quarter-Finals";
  return `Round ${roundNum}`;
}

function renderTeam(team, logos) {
  if (!team || team.team === "BYE") return `<span style="color:#aaa;">BYE</span>`;
  const logo = logos[team.team];
  return `${logo ? `<img src="${logo}" style="height:20px;">` : ""} ${team.team} (Seed ${team.rank})`;
}

loadTeamLogos();
