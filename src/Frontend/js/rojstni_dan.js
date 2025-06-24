document.addEventListener('DOMContentLoaded', function() {
    // Preveri, če je uporabnik prijavljen
    const token = localStorage.getItem('userToken');
    if (!token) {
        // Uporabnik ni prijavljen, zato ne prikažemo obvestila
        return;
    }

    // Pridobi podatke uporabnika iz localStorage
    checkBirthday();
});

// Funkcija za pridobitev uporabniških podatkov in preverjanje rojstnega dne
async function checkBirthday() {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        // Namesto API klica, uporabimo podatke iz localStorage
        const userInfoStr = localStorage.getItem('userInfo');
        if (!userInfoStr) {
            console.log('Podatki o uporabniku niso na voljo v localStorage.');
            return;
        }

        const userData = JSON.parse(userInfoStr);
        
        // Preveri, če je danes uporabnikov rojstni dan
        // Uporabimo datum_rojstva ali katerokoli drug ključ, ki bi lahko vseboval datum rojstva
        const birthDate = userData.datum_rojstva
        
        if (isToday(birthDate)) {
            // Prikažemo obvestilo za rojstni dan
            // Uporabimo ime ali katerokoli drugo ustrezno polje za prikaz imena
            const userName = userData.ime || userData.name || userData.Ime || 'uporabnik';
            displayBirthdayMessage(userName);
        }
    } catch (error) {
        console.error('Napaka:', error);
    }
}

// Funkcija za preverjanje ali je datum danes (ignoriraj leto)
function isToday(dateString) {
    if (!dateString) return false;

    // Pridobi današnji datum
    const today = new Date();
    
    // Parsing datuma iz baze
    const birthDate = new Date(dateString);
    
    // Preveri, če se ujemata mesec in dan
    return (
        today.getDate() === birthDate.getDate() &&
        today.getMonth() === birthDate.getMonth()
    );
}

// Funkcija za prikaz obvestila o rojstnem dnevu
function displayBirthdayMessage(ime) {
    // Ustvarimo element za obvestilo
    const birthdayMessage = document.createElement('div');
    birthdayMessage.className = 'alert alert-info birthday-alert';
    birthdayMessage.style.textAlign = 'center';
    birthdayMessage.style.padding = '15px';
    birthdayMessage.style.margin = '0';
    birthdayMessage.style.backgroundColor = '#1976d2';
    birthdayMessage.style.color = 'white';
    birthdayMessage.style.borderRadius = '0';
    birthdayMessage.style.borderLeft = 'none';
    birthdayMessage.style.borderRight = 'none';
    birthdayMessage.style.animation = 'fadeIn 1s';
    birthdayMessage.style.position = 'relative';
    
    // Vsebina obvestila
    birthdayMessage.innerHTML = `
        <div class="birthday-message">
            <button type="button" class="birthday-close-btn" aria-label="Close" 
                style="position: absolute; top: 10px; right: 15px; background: none; border: none; 
                font-size: 20px; cursor: pointer; color: white; transition: opacity 0.2s ease;">&times;</button>
            
            <h4 style="margin-bottom: 15px; font-weight: bold;">🎉 Vse najboljše, ${ime}! 🎉</h4>
            <p>Danes praznuješ ti, mi pa praznujemo s tabo! 🥳</p>
            <p>Ob tvojem rojstnem dnevu ti želimo dan, poln doživetij, smeha in lepih trenutkov. ✨</p>
            <p>Naj bo to leto zate posebno in nepozabno.</p>
            <p><em>Hvala, ker si z nami!</em></p>
        </div>
    `;
      // Dodamo slog za animacijo
    const style = document.createElement('style');    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .birthday-alert {
            position: relative;
            z-index: 100;
        }
        
        .birthday-close-btn:hover {
            opacity: 0.7;
            transform: rotate(90deg);
        }
        
        .birthday-close-btn {
            transition: transform 0.3s ease, opacity 0.2s ease;
        }
        
        @keyframes fadeOut {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            50% { opacity: 0.5; transform: translateY(-10px) scale(0.95); }
            100% { opacity: 0; transform: translateY(-20px) scale(0.9); }
        }
        
        @keyframes shrinkOut {
            0% { max-height: 200px; opacity: 1; padding: 15px; }
            50% { max-height: 100px; opacity: 0.5; padding: 10px 15px; }
            100% { max-height: 0; opacity: 0; padding: 0 15px; overflow: hidden; }
        }
    `;document.head.appendChild(style);
    
    // Vstavimo obvestilo takoj pod navigacijo
    const navElement = document.querySelector('nav');
    if (navElement && navElement.nextElementSibling) {
        document.body.insertBefore(birthdayMessage, navElement.nextElementSibling);
    } else {
        // Če ne moremo najti nav elementa, dodamo na začetek body
        document.body.insertBefore(birthdayMessage, document.body.firstChild);
    }
      // Dodamo funkcionalnost zapiranja obvestila
    const closeButton = birthdayMessage.querySelector('.birthday-close-btn');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            // Najprej zavrtimo gumb za lepši efekt
            closeButton.style.transform = 'rotate(90deg)';
            
            // Dodamo obema animacijama z zamikom za lepši vizualni efekt
            birthdayMessage.style.animation = 'fadeOut 0.7s forwards, shrinkOut 0.9s forwards';
            
            // Po končani animaciji odstranimo element
            setTimeout(() => {
                birthdayMessage.remove();
            }, 900);
        });
    }
}