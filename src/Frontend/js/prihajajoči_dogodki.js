// Skripta za nalaganje prihajajočih dogodkov in vročih dogodkov na glavni strani
document.addEventListener('DOMContentLoaded', () => {
    fetchUpcomingEvents();
    fetchHotEvents();
});

/**
 * Pridobi prihajajoče dogodke iz backend-a
 */
async function fetchUpcomingEvents() {
    try {
        // Določimo današnji datum za filtriranje dogodkov
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
        
        // Pridobi dogodke iz API-ja, uporabi obstoječi endpoint z dodatnim filtriranjem
        const response = await fetch(`${CONFIG.API_BASE_URL}/dogodki?datum_od=${todayStr}`);
        
        if (!response.ok) {
            throw new Error(`HTTP napaka! Status: ${response.status}`);
        }
        
        const data = await response.json();
        // Pridobimo dogodke iz modela (struktura JSON-a se razlikuje glede na bookshelf)
        const events = data.map(event => ({
            id: event.idDogodek,
            naziv: event.naziv,
            cas: event.cas,
            tip: event.tipDogodka ? event.tipDogodka.naziv : '',
            slika: event.slika,
            lokacija: event.naslov ? `${event.naslov.obcina}, ${event.naslov.postna_stevilka}` : '',
            organizator: event.organizator ? `${event.organizator.ime} ${event.organizator.priimek}` : ''
        }));
        
        displayUpcomingEvents(events);
    } catch (error) {
        console.error('Napaka pri nalaganju prihajajočih dogodkov:', error);
        
        // Napaka pri nalaganju - prikaži sporočilo o napaki
        document.querySelector('.calendar-events').innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> 
                Pri nalaganju dogodkov je prišlo do napake. Poskusite znova kasneje.
            </div>
        `;
    }
}

/**
 * Prikaži prihajajoče dogodke na strani
 * @param {Array} events - Seznam dogodkov
 */
function displayUpcomingEvents(events) {
    const calendarEventsContainer = document.querySelector('.calendar-events');
    
    // Če ni dogodkov
    if (!events || events.length === 0) {
        calendarEventsContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> 
                Trenutno ni prihajajočih dogodkov.
            </div>
        `;
        return;
    }
    
    // Organizirajmo dogodke po datumih
    const eventsByDate = groupEventsByDate(events);
    
    // Omeji na prve 4 datume
    const limitedDates = Object.keys(eventsByDate).slice(0, 4);
    
    let htmlOutput = '';
    
    // Ustvari HTML za vsak datum
    limitedDates.forEach(date => {
        const eventsForDate = eventsByDate[date];
        const formattedDate = formatDate(date);
        
        htmlOutput += `
            <div class="calendar-day">
                <div class="calendar-date">${formattedDate}</div>
                <div class="calendar-items">
        `;
        
        // Dodaj vse dogodke za ta dan
        eventsForDate.forEach(event => {
            const eventTime = formatTime(event.cas);
            
            htmlOutput += `
                <div class="calendar-item">
                    <span class="calendar-item-time">${eventTime}</span>
                    <span class="calendar-item-name">${event.naziv}</span>
                </div>
            `;
        });
        
        htmlOutput += `
                </div>
            </div>
        `;
    });
    
    // Posodobi DOM
    calendarEventsContainer.innerHTML = htmlOutput;
}

/**
 * Združi dogodke po datumih
 * @param {Array} events - Seznam dogodkov
 * @returns {Object} Dogodki združeni po datumih
 */
function groupEventsByDate(events) {
    const eventsByDate = {};
    
    events.forEach(event => {
        // Ekstrahiraj samo datum iz datuma/časa
        const eventDate = new Date(event.cas).toISOString().split('T')[0];
        
        if (!eventsByDate[eventDate]) {
            eventsByDate[eventDate] = [];
        }
        
        eventsByDate[eventDate].push(event);
    });
    
    return eventsByDate;
}

/**
 * Formatira datum v lepšo obliko
 * @param {string} dateString - Datum v formatu YYYY-MM-DD
 * @returns {string} Formatiran datum
 */
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('sl-SI', options);
}

/**
 * Formatira čas v obliko HH:MM
 * @param {string} dateTimeString - Datum in čas
 * @returns {string} Formatiran čas
 */
function formatTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Pridobi vroče dogodke iz backend-a (z je_promoviran = 1)
 */
async function fetchHotEvents() {
    try {
        // Pošlji zahtevek na backend za pridobitev promoviranih dogodkov
        const response = await fetch(`${CONFIG.API_BASE_URL}/dogodki?je_promoviran=1`);
        
        if (!response.ok) {
            throw new Error(`HTTP napaka! Status: ${response.status}`);
        }
        
        const events = await response.json();
        
        // Pridobimo dogodke iz modela
        const formattedEvents = events.map(event => ({
            id: event.idDogodek,
            naziv: event.naziv,
            cas: event.cas,
            slika: event.slika || 'placeholder.png', // Če slika ne obstaja, uporabi placeholder
            // Ekstrahiramo datum v kratek format
            datum: formatShortDate(event.cas)
        }));
        
        // Omejimo na maksimalno 7 dogodkov
        const limitedEvents = formattedEvents.slice(0, 7);
        
        displayHotEvents(limitedEvents);
    } catch (error) {
        console.error('Napaka pri nalaganju vročih dogodkov:', error);
        
        // Napaka pri nalaganju - prikaži sporočilo o napaki
        document.querySelector('.hot-events').innerHTML = `
            <h3 class="hot-events-title">
                <i class="bi bi-fire"></i> Vroči dogodki
            </h3>
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> 
                Pri nalaganju vročih dogodkov je prišlo do napake.
            </div>
        `;
    }
}

/**
 * Prikaži vroče dogodke na strani
 * @param {Array} events - Seznam vročih dogodkov
 */
function displayHotEvents(events) {
    const hotEventsContainer = document.querySelector('.hot-events');
    
    // Če ni dogodkov
    if (!events || events.length === 0) {
        hotEventsContainer.innerHTML = `
            <h3 class="hot-events-title">
                <i class="bi bi-fire"></i> Vroči dogodki
            </h3>
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> 
                Trenutno ni vročih dogodkov.
            </div>
        `;
        return;
    }
    
    let htmlOutput = `
        <h3 class="hot-events-title">
            <i class="bi bi-fire"></i> Vroči dogodki
        </h3>
    `;
    
    // Prikaži vsak vroč dogodek
    events.forEach((event, index) => {
        const eventNumber = index + 1;
        const imagePath = event.slika.startsWith('http') ? event.slika : event.slika;
        
        htmlOutput += `
            <a href="podrobnosti_dogodka.html?id=${event.id}" class="hot-event-item text-decoration-none">
                <span class="hot-event-number">#${eventNumber}</span>
                <img src="${imagePath}" alt="${event.naziv}" class="hot-event-img" onerror="this.src='images/placeholder.png'">
                <p class="hot-event-name">${event.naziv}</p>
                <span class="hot-event-date">${event.datum}</span>
            </a>
        `;
    });
    
    // Posodobi DOM
    hotEventsContainer.innerHTML = htmlOutput;
}

/**
 * Formatira datum v kratek format (npr. "28. maj")
 * @param {string} dateTimeString - Datum in čas
 * @returns {string} Formatiran kratek datum
 */
function formatShortDate(dateTimeString) {
    const date = new Date(dateTimeString);
    
    // Array z imeni mesecev v slovenščini
    const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    
    return `${day}. ${month}`;
}
