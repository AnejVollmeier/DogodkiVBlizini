// Funkcija za odštevanje do začetka dogodka
function updateCountdown() {
  // Uporaba parametra datatime iz data-* atributa, če obstaja, sicer privzeti datum
  const dateElement = document.querySelector(".event-date");
  const dateStr = dateElement
    ? dateElement.getAttribute("data-datetime")
    : "May 28, 2025 20:00:00";
  const eventDate = new Date(dateStr).getTime();
  const now = new Date().getTime();
  const distance = eventDate - now;

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  // Če je datum že minil
  if (distance < 0) {
    //clearInterval(countdownTimer);

    // Prikaži sporočilo namesto odštevanja
    const countdownContainer = document.querySelector(
      ".countdown-container"
    );

    // Nastavi sporočilo in center
    countdownContainer.innerHTML = `
      <div class="text-center my-4">
        <h4 class="event-passed">Dogodek se je že začel!</h4>
      </div>
    `;
  }
  else
  {
    // Posodobitev HTML elementov
    document.getElementById("days").innerText = String(days).padStart(
      2,
      "0"
    );
    document.getElementById("hours").innerText = String(hours).padStart(
      2,
      "0"
    );
    document.getElementById("minutes").innerText = String(minutes).padStart(
      2,
      "0"
    );
    document.getElementById("seconds").innerText = String(seconds).padStart(
      2,
      "0"
    ); 
  }
} 

// Funkcija za preverjanje ali je dogodek že minil
function checkEventStatus() {
  const dateElement = document.querySelector(".event-date");
  const dateStr = dateElement
    ? dateElement.getAttribute("data-datetime")
    : "May 28, 2025 20:00:00";
  const eventDate = new Date(dateStr).getTime();
  const now = new Date().getTime();

  // Če je dogodek že minil, prikaži sporočilo takoj
  if (eventDate < now) {
    const countdownContainer = document.querySelector(
      ".countdown-container"
    );
    countdownContainer.innerHTML = `
      <div class="text-center my-4">
        <h4 class="event-passed">Dogodek se je že začel!</h4>
      </div>
    `;
    return true;
  }
  return false;
}

// Ko se dokument naloži, inicializiraj odštevanje
document.addEventListener('DOMContentLoaded', function() {
  // Najprej preveri, če je dogodek že minil
  const eventPassed = checkEventStatus();

  // Samo če dogodek še ni minil, nastavi interval za odštevanje
  let countdownTimer;
  if (!eventPassed) {
    // Posodobi odštevanje
    updateCountdown();
    // Nastavi interval za posodobitev odštevanja vsako sekundo
    countdownTimer = setInterval(updateCountdown, 1000);
  }
});
