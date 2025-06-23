const monthYear = document.getElementById("month-year");
const dates = document.getElementById("dates");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");

let teamLogos = {};
let teamsArray = [];

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
}

let currentDate = new Date();

async function getEventDatesForMonth(year, month) {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;

    try {
        const res = await fetch(`https://bsnl-backend.vercel.app/api/eventsrange?start=${start}&end=${end}`);
        const data = await res.json();

        if (!Array.isArray(data)) {
            console.error('Unexpected response:', data);
            return [];
        }

        const dates = data.map(event => new Date(event.date).getDate());
        return dates;

    } catch (err) {
        console.error('Error fetching events:', err);
        return [];
    }
}

const updateCalendar = async () => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const eventDays = await getEventDatesForMonth(currentYear, currentMonth);

    const firstDay = new Date(currentYear, currentMonth, 0);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const totalDays = lastDay.getDate();
    const firstDayIndex = firstDay.getDay();
    const lastDayIndex = lastDay.getDay();

    const monthYearString = currentDate.toLocaleString('default', {month: 'long', year: 'numeric'});
    monthYear.textContent = monthYearString;

    let datesHTML = ``;

    for(let i = firstDayIndex; i > 0; i--){
        const prevDate = new Date(currentYear, currentMonth, 0 - i + 1);
        datesHTML += `<div class="date inactive">${prevDate.getDate()}</div>`;
    }

    for (let i = 1; i <= totalDays; i++) {
        const date = new Date(currentYear, currentMonth, i);
        const isActive = date.toDateString() === new Date().toDateString();
        const hasEvent = eventDays.includes(i-1);
        const classes = ['date'];
        if (isActive) classes.push('active');
        if (hasEvent) classes.push('has-event');
        datesHTML += `<div class="${classes.join(' ')}">${i}</div>`;
    }

    for(let i = 1; i <= 7-lastDayIndex; i++){
        const nextDate = new Date(currentYear, currentMonth+1, i);
        datesHTML += `<div class="date inactive">${nextDate.getDate()}</div>`;
    }

    dates.innerHTML = datesHTML;

    const dateElements = document.querySelectorAll('.date');
    dateElements.forEach(date => {
        const day = parseInt(date.textContent, 10);
        const selectedDate = new Date(currentYear, currentMonth, day);

        date.addEventListener('click', () => {
            if (date.classList.contains('inactive')) return;

            document.querySelectorAll('.date.active').forEach(active => {
                active.classList.remove('active');
            });

            date.classList.add('active');

            getEvents(selectedDate);
        });
    });
}

const events = document.getElementById('events');

async function getEvents(dateObj) {
    eventsArray = [];
    const date = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    try {
        const res = await fetch(`https://bsnl-backend.vercel.app/api/eventsdate?date=${date}`);
        const data = await res.json();

        if (!Array.isArray(data)) {
            console.error('Unexpected response:', data);
            eventsArray = [];
        }

        eventsArray = data;

    } catch (err) {
        console.error('Error fetching events:', err);
        eventsArray = [];
    }

    eventsHTML = `<h1>${dateObj.toDateString()}</h1>`;

    if (eventsArray.length === 0) {
        eventsHTML += `<p>No events scheduled.</p>`;
    }

    for (const event of eventsArray) {
        if (!event.game) {
            eventsHTML += `
                <div class="event-card">
                    <h3 class="event-title">${event.event_name}</h3>
                    <p class="event-meta">League Event</p>
                </div>
            `;
            continue;
        }

        const isCompleted = event.score1 !== null && event.score2 !== null;

        const logo1 = teamLogos[event.team1_name] || '';
        const logo2 = teamLogos[event.team2_name] || '';

        const gameHTML = `
            <div class="game-card ${isCompleted ? '' : 'upcoming'}" onclick="showGameDetails(${event.id})">
                <div class="team-row">
                    <img class="team-game-logo" src="${logo1}" alt="${event.team1_name} logo" />
                    <span class="team-name">${event.team1_name}</span>
                    <span class="score ${isCompleted && event.winner === event.team1_name ? 'winner' : ''}">
                        ${isCompleted ? event.score1 : '-'}
                    </span>
                </div>
                <div class="team-row">
                    <img class="team-game-logo" src="${logo2}" alt="${event.team2_name} logo" />
                    <span class="team-name">${event.team2_name}</span>
                    <span class="score ${isCompleted && event.winner === event.team2_name ? 'winner' : ''}">
                        ${isCompleted ? event.score2 : '-'}
                    </span>
                </div>
                <div class="overtime-row">
                    <span class="overtime">
                        ${isCompleted ? (event.overtime ? 'Final (OT)' : 'Final') : 'Upcoming'}
                    </span>
                </div>
            </div>
        `;


        eventsHTML += gameHTML;
    }

    events.innerHTML = eventsHTML;
}

function closeModal() {
    document.getElementById('game-modal').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
}

async function showGameDetails(gameId) {
    try {
        const res = await fetch(`https://bsnl-backend.vercel.app/api/eventsid?id=${gameId}`);
        const game = await res.json();

        const modalBody = `
            <h2>${game.team1_name} vs ${game.team2_name}</h2>
            <p>Score: ${game.score1} - ${game.score2}</p>
            <p>Winner: ${game.winner}</p>
            <p>${game.overtime ? 'Final (OT)' : 'Final'}</p>

            <h3>${game.team1_name} Players</h3>
            <p>${game.team1_player1}: ${game.team1_player1_cups} cups</p>
            <p>${game.team1_player2}: ${game.team1_player2_cups} cups</p>

            <h3>${game.team2_name} Players</h3>
            <p>${game.team2_player1}: ${game.team2_player1_cups} cups</p>
            <p>${game.team2_player2}: ${game.team2_player2_cups} cups</p>
        `;

        document.getElementById('modal-body').innerHTML = modalBody;
        document.getElementById('game-modal').classList.remove('hidden');
    } catch (err) {
        console.error('Failed to load game details:', err);
    }
}

prevButton.addEventListener('click', function() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
});

nextButton.addEventListener('click', function() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
});

updateCalendar();
getEvents(currentDate);
loadTeamLogos();