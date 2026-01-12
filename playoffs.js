const USE_MANUAL_BRACKET = true; // Set to true to use manual bracket configuration

const MANUAL_BRACKET = {
  rounds: [
    {
      title: "Round 1",
      matches: [
        { team1: "Balls Deep", team2: "Labubu Ladies", winner: "Balls Deep", note: "Balls Deep Wins 2-0"  }
      ]
    },
    {
      title: "Semi-Finals",
      matches: [
        { team1: "2 Girls, 1 Cup", team2: "Balls Deep", winner: "2 Girls, 1 Cup", note: "2 Girls, 1 Cup Wins 2-1" },
        { team1: "Fent Fellas", team2: "Short Stacks", winner: "Short Stacks", note: "Short Stacks Wins 2-1"  }
      ]
    },
    {
      title: "Final",
      matches: [
        { team1: "2 Girls, 1 Cup", team2: "Short Stacks", winner: "2 Girls, 1 Cup", note: "2 Girls, 1 Cup Wins 3-0"  }
      ]
    }
  ]
};

let currentStandings = [];
let teamLogos = {};

async function loadTeamLogos() {
  try {
    const res = await fetch(`https://bsnl-backend.vercel.app/api/teams`);
    const data = await res.json();

    if (!Array.isArray(data)) return;

    data.forEach(team => {
      teamLogos[team.name] = team.logo_path;
    });
  } catch (err) {
    console.error("Error fetching team logos:", err);
  }

  if (USE_MANUAL_BRACKET) {
    buildManualBracket(MANUAL_BRACKET, teamLogos);
  } else {
    fetchAndCalculateStandings();
  }
}

async function fetchAndCalculateStandings() {
  let gamesArray = [];

  try {
    const res = await fetch(`https://bsnl-backend.vercel.app/api/games`);
    const data = await res.json();
    if (Array.isArray(data)) gamesArray = data;
  } catch (err) {
    console.error("Error fetching games:", err);
  }

  const standings = {};

  for (const game of gamesArray) {
    const { team1_name, team2_name, score1, score2, winner, loser, overtime } = game;

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

    standings[team1_name].gp++;
    standings[team2_name].gp++;

    standings[team1_name].cf += score1;
    standings[team1_name].ca += score2;
    standings[team2_name].cf += score2;
    standings[team2_name].ca += score1;

    standings[winner].w++;
    standings[winner].pts += 2;

    if (overtime) {
      standings[loser].otl++;
      standings[loser].pts += 1;
    } else {
      standings[loser].l++;
    }
  }

  const standingsArray = Object.values(standings)
    .map(t => ({ ...t, plusMinus: t.cf - t.ca }))
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

/* ---------- 5 TEAM BRACKET ---------- */

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

/* ---------- STANDARD BRACKET ---------- */

function buildStandardBracket(teams, logos, container) {
  const size = Math.pow(2, Math.ceil(Math.log2(teams.length)));
  const padded = [...teams];

  while (padded.length < size) {
    padded.push({ team: "BYE", rank: "-" });
  }

  let roundTeams = padded;
  let roundNum = 1;

  while (roundTeams.length > 1) {
    const roundDiv = document.createElement("div");
    roundDiv.className = "round";
    roundDiv.innerHTML = `<h2>${roundTitle(roundTeams.length)}</h2>`;

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

function roundTitle(teamsLeft) {
  if (teamsLeft === 2) return "Final";
  if (teamsLeft === 4) return "Semi-Finals";
  if (teamsLeft === 8) return "Quarter-Finals";
  return "Round";
}

function buildManualBracket(config, logos) {
  const container = document.getElementById("bracket-container");
  container.innerHTML = "";

  config.rounds.forEach(round => {
    const roundDiv = document.createElement("div");
    roundDiv.className = "round";
    roundDiv.innerHTML = `<h2>${round.title}</h2>`;

    round.matches.forEach(match => {
      const matchDiv = document.createElement("div");
      matchDiv.className = "playoffmatch";

      matchDiv.innerHTML = `
        <div class="playoffteam ${match.winner === match.team1 ? "winner" : ""}">
          ${renderTeamName(match.team1, logos)}
        </div>
        <span>vs</span>
        <div class="playoffteam ${match.winner === match.team2 ? "winner" : ""}">
          ${renderTeamName(match.team2, logos)}
        </div>
        ${match.note ? `<div class="note">${match.note}</div>` : ""}
      `;

      roundDiv.appendChild(matchDiv);
    });

    container.appendChild(roundDiv);
  });
}

function renderTeam(team, logos) {
  if (!team || team.team === "BYE") {
    return `<span style="color:#aaa;">BYE</span>`;
  }

  const logo = logos[team.team];
  return `${logo ? `<img src="${logo}" style="height:20px;">` : ""} ${team.team} (Seed ${team.rank})`;
}

function renderTeamName(name, logos) {
  if (!name) return "TBD";
  const logo = logos[name];
  return `${logo ? `<img src="${logo}" style="height:20px;">` : ""} ${name}`;
}

loadTeamLogos();
