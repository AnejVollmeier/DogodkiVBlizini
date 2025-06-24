// Dolgčas (Boredom) - Spinning wheel for random events
let allEvents = [];
let isSpinning = false;
let currentRotation = 0;

const sectionColors = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
  '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
  '#10ac84', '#ee5a24', '#0984e3', '#6c5ce7', '#fdcb6e'
];

document.addEventListener('DOMContentLoaded', function () {
  loadEvents();
});

async function loadEvents() {
  const loadingEl = document.getElementById('loading');
  const wheelWrapper = document.getElementById('wheelWrapper');
  const spinButton = document.getElementById('spinButton');

  try {
    loadingEl.style.display = 'block';
    const response = await fetch(`${CONFIG.API_BASE_URL}/dogodki/`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    allEvents = Array.isArray(data) ? data : (data.dogodki || []);
    if (!allEvents.length) throw new Error('Ni najdenih dogodkov');

    // Take max 12 events and shuffle them
    allEvents = shuffleArray(allEvents).slice(0, 12);
    setupWheel();

    loadingEl.style.display = 'none';
    wheelWrapper.style.display = 'flex';
    spinButton.style.display = 'inline-block';
  } catch (error) {
    console.error('Napaka pri nalaganju dogodkov:', error);
    loadingEl.innerHTML = `
      <div class="text-danger text-center">
        ❌ Napaka pri nalaganju dogodkov.<br>Poskusite znova kasneje.
      </div>`;
  }
}

function setupWheel() {
  const wheel = document.getElementById('wheel');
  wheel.innerHTML = '';
  
  if (!allEvents.length) return;
  
  const sectionAngle = 360 / allEvents.length;
  const radius = 150; // Half of 300px wheel
  const centerX = radius;
  const centerY = radius;

  // Create SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '300');
  svg.setAttribute('height', '300');
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';

  allEvents.forEach((event, index) => {
    const startAngle = (index * sectionAngle - 90) * (Math.PI / 180); // -90 to start from top
    const endAngle = ((index + 1) * sectionAngle - 90) * (Math.PI / 180);

    // Calculate path coordinates
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    const largeArcFlag = sectionAngle > 180 ? 1 : 0;

    // Create path element for pie slice
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathData = [
      `M ${centerX} ${centerY}`,  // Move to center
      `L ${x1} ${y1}`,            // Line to start of arc
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, // Arc
      'Z'                         // Close path
    ].join(' ');

    path.setAttribute('d', pathData);
    path.setAttribute('fill', sectionColors[index % sectionColors.length]);
    path.setAttribute('stroke', '#fff');
    path.setAttribute('stroke-width', '2');
    path.style.cursor = 'pointer';

    svg.appendChild(path);

    // Add text label
    const textAngle = (index * sectionAngle + sectionAngle / 2 - 90) * (Math.PI / 180);
    const textRadius = radius * 0.7; // Position text 70% from center
    const textX = centerX + textRadius * Math.cos(textAngle);
    const textY = centerY + textRadius * Math.sin(textAngle);

    const eventName = event.naziv || 'Neimenovan dogodek';
    const displayName = eventName.length > 12 ? eventName.slice(0, 10) + '..' : eventName;

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', textX);
    text.setAttribute('y', textY);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', 'white');
    text.setAttribute('font-size', '11');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
    text.style.userSelect = 'none';
    text.style.pointerEvents = 'none';
    text.textContent = displayName;

    svg.appendChild(text);
  });

  wheel.appendChild(svg);
}

function spinWheel() {
  if (isSpinning || !allEvents.length) return;
  isSpinning = true;

  const spinButton = document.getElementById('spinButton');
  const eventResult = document.getElementById('eventResult');

  spinButton.disabled = true;
  spinButton.textContent = 'Vrtim...';
  eventResult.classList.remove('show');

  const spins = Math.random() * (8 - 5) + 5;
  const finalAngle = Math.random() * 360;
  const totalRotation = (spins * 360) + finalAngle;
  currentRotation += totalRotation;

  const wheel = document.getElementById('wheel');
  wheel.style.transition = 'transform 3s ease-out';
  wheel.style.transform = `rotate(${currentRotation}deg)`;

  // Calculate which section the pointer is pointing at
  const normalizedAngle = (360 - (currentRotation % 360)) % 360;
  const sectionAngle = 360 / allEvents.length;
  const selectedIndex = Math.floor(normalizedAngle / sectionAngle);
  const selectedEvent = allEvents[selectedIndex] || allEvents[0];

  setTimeout(() => {
    displayEventResult(selectedEvent);
    isSpinning = false;
    spinButton.disabled = false;
    spinButton.textContent = '🎲 Zavrti kolo!';
  }, 3000);
}

function displayEventResult(event) {
  const eventResult = document.getElementById('eventResult');
  const eventTitle = document.getElementById('eventTitle');
  const eventImage = document.getElementById('eventImage');
  const eventDetails = document.getElementById('eventDetails');

  eventTitle.textContent = event.naziv || 'Neimenovan dogodek';

  let details = '';
  if (event.cas) details += `📅 <strong>Datum:</strong> ${formatDate(new Date(event.cas))}<br>`;
  if (event.tipDogodka) details += `🏷️ <strong>Tip:</strong> ${event.tipDogodka}<br>`;
  if (event.naslov) details += `📍 <strong>Lokacija:</strong> ${event.naslov}<br>`;
  if (event.opis) {
    const shortDescription = event.opis.length > 200 ? event.opis.slice(0, 197) + '...' : event.opis;
    details += `📝 <strong>Opis:</strong> ${shortDescription}<br>`;
  }
  if (event.cena) details += `💰 <strong>Cena:</strong> ${event.cena}<br>`;

  eventDetails.innerHTML = details || 'Podrobnosti niso na voljo.';

  if (event.slika?.trim()) {
    eventImage.src = event.slika;
    eventImage.style.display = 'block';
    eventImage.onerror = () => eventImage.style.display = 'none';
  } else {
    eventImage.style.display = 'none';
  }

  // Use the show class for proper animation
  eventResult.classList.add('show');
  eventResult.style.cursor = 'pointer';
  eventResult.onclick = () => {
    const eventId = event.idDogodek || event.id;
    window.location.href = `podrobnosti_dogodka.html?id=${eventId}`;
  };
}

function formatDate(date) {
  return date.toLocaleDateString('sl-SI', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
