document.addEventListener('DOMContentLoaded', function() {
    // Posodobi navigacijo glede na stanje prijave
    updateNavigation();

    // Dodaj poslušalec za gumb odjava, če obstaja
    setupLogoutListeners();
    
    // Dodaj poslušalce za avtomatsko zapiranje menija na mobilnih napravah
    setupMobileMenuListeners();

    // Funkcija za nastavitev poslušalcev za mobilni meni
    function setupMobileMenuListeners() {
        // Zapri meni ko kliknemo na katerokoli povezavo v mobilnem meniju
        const mobileNavLinks = document.querySelectorAll('.navbar-collapse .nav-link');
        mobileNavLinks.forEach(link => {
            if (link.id !== 'profileDropdown') { // Izključi dropdown gumb
                link.addEventListener('click', closeNavbarCollapse);
            }
        });
    }
    
    // Funkcija za zapiranje mobilnega menija
    function closeNavbarCollapse() {
        const navbarCollapse = document.querySelector('.navbar-collapse.show');
        if (navbarCollapse) {
            const bsCollapse = new bootstrap.Collapse(navbarCollapse);
            bsCollapse.hide();
        }
    }

    // Funkcija za posodobitev navigacije
    async function updateNavigation() {
        const token = localStorage.getItem('userToken');
        const userInfoStr = localStorage.getItem('userInfo');
          // Elementi navigacije za male in velike zaslone
        const smallScreenNav = document.querySelector('.d-block.d-lg-none');
        const largeScreenDropdown = document.querySelector('.dropdown-menu.custom-profile-dropdown');
        const mainNavLinks = document.querySelector('.navbar-nav.me-auto');
        const userNameDisplay = document.querySelector('.d-none.d-md-block .navbar-nav.me-auto .nav-item');

     
        
        // Najprej odstrani vse upravljalske povezave iz glavne navigacije
        if (mainNavLinks) {
            removeAdminLinks(mainNavLinks);
        }

        // Če je uporabnik prijavljen
        if (token && userInfoStr) {
            try {
                let userInfo = JSON.parse(userInfoStr);
                
              
                // VEDNO poskusimo pridobiti podatke iz API-ja
                try {
                    // Naredimo API klic za pridobitev podatkov uporabnika
                    const userData = await fetchUserData(token);
                    if (userData) {
                       
                        userInfo = { ...userInfo, ...userData };
                        // Shranimo posodobljene podatke nazaj v localStorage
                        localStorage.setItem('userInfo', JSON.stringify(userInfo));
                       
                    }
                } catch (apiError) {
                    console.error("Napaka pri pridobivanju podatkov iz API-ja:", apiError);
                }   
                const tipUporabnika = userInfo.tipUporabnika;
              
                // Dodaj upravljalske povezave v glavno navigacijo glede na tip uporabnika
                if (mainNavLinks && (tipUporabnika === 'Administrator' || tipUporabnika === 'Organizator')) {
                    addAdminLinks(mainNavLinks, tipUporabnika);
                }

                // Posodobi dropdown meni za velike zaslone za običajne funkcije
                if (largeScreenDropdown) {
                    largeScreenDropdown.innerHTML = `
                        <li><a class="dropdown-item" href="profil.html">Moj profil</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" id="logout-btn"><i class="bi bi-box-arrow-right"></i> Odjava</a></li>
                    `;
                }                // Posodobi navigacijo za male zaslone (prijava/odjava/profil)
                if (smallScreenNav) {
                    // Najprej praznimo obstoječo vsebino
                    smallScreenNav.innerHTML = '';
                    
                    // Dodamo nove povezave za prijavljenega uporabnika
                    const navList = document.createElement('ul');
                    navList.className = 'navbar-nav me-auto';
                    
                    const profilItem = document.createElement('li');
                    profilItem.className = 'nav-item';
                    profilItem.innerHTML = '<a class="nav-link" href="profil.html">Moj profil</a>';
                    
                    const logoutItem = document.createElement('li');
                    logoutItem.className = 'nav-item';
                    logoutItem.innerHTML = '<a class="nav-link" href="#" id="small-logout-btn"><i class="bi bi-box-arrow-right"></i> Odjava</a>';
                    
                    navList.appendChild(profilItem);
                    navList.appendChild(logoutItem);
                    smallScreenNav.appendChild(navList);
                } else {
                    console.error("Element smallScreenNav ni najden!");
                }

                // Prikaži ime uporabnika v navigaciji
                if (userNameDisplay) {
                  
                    
                    // Sestavimo polno ime iz podatkov - poskusimo različne načine
                    let fullName = '';
                    
                    // Uporabimo podatek, ki je na voljo - preverimo vse možne variacije
                    let imeValue = userInfo.ime || userInfo.Ime || userInfo.IME || '';
                    let priimekValue = userInfo.priimek || userInfo.Priimek || userInfo.PRIIMEK || '';
                    
                    // Sestavimo ime
                    if (imeValue && priimekValue) {
                        fullName = `${imeValue} ${priimekValue}`;
                    } else if (imeValue) {
                        fullName = imeValue;
                    } else if (priimekValue) {
                        fullName = priimekValue;
                    }
                    
                    fullName = fullName.trim();
                    
                     // NEPOSREDNO nastavimo vsebino elementa, da se izognemo težavam s HTML elementi
                    if (fullName && fullName !== " " && fullName !== "") {
                        userNameDisplay.textContent = fullName;
                        // Dodamo razred za stil
                        userNameDisplay.classList.add('navbar-profile-name');
                    } else if (userInfo.email) {
                        userNameDisplay.textContent = userInfo.email;
                        // Dodamo razred za stil
                        userNameDisplay.classList.add('navbar-profile-name');
                    } else {
                        userNameDisplay.textContent = 'Uporabnik';
                        // Dodamo razred za stil
                        userNameDisplay.classList.add('navbar-profile-name');
                    }
                    
                    // Poskrbimo, da je element viden - preverimo, če je to morda problem
                    const parentElement = userNameDisplay.closest('.d-none.d-md-block');
                    if (parentElement) {
                        parentElement.classList.remove('d-none');
                       
                    }
                }                
                const profileIcon = document.querySelector('.navbar-profile-icon');
                if (profileIcon) {
                    let profileImageUrl = null;
                    
                    if (userInfo.is_banned) {
                        profileImageUrl = 'images/ban-img.gif';
                    } else if (userInfo.slika) {
                        profileImageUrl = userInfo.slika;
                    }
                    
                    if (profileImageUrl) {
                        const profileImageElement = document.createElement('img');
                        profileImageElement.src = profileImageUrl;
                        profileImageElement.className = 'rounded-circle navbar-profile-image';
                        profileImageElement.style.width = '40px';
                        profileImageElement.style.height = '40px';
                        profileImageElement.style.objectFit = 'cover';
                        
                        if (userInfo.is_banned) {
                            profileImageElement.style.border = '2px solid #dc3545';
                            profileImageElement.title = 'Ta uporabnik je blokiran';
                        } else {
                            profileImageElement.style.border = '2px solid rgba(255, 255, 255, 0.5)';
                        }
                        
                        profileIcon.replaceWith(profileImageElement);
                    }
                }
                
                // Nastavi poslušalce za novo dodane gumbe
                setupLogoutListeners();
                
            } catch (error) {
                console.error('Napaka pri posodabljanju navigacije:', error);
                console.error('userInfoStr:', userInfoStr);
            }
        } else {
            // Uporabnik ni prijavljen
            
            // Posodobi dropdown meni za velike zaslone
            if (largeScreenDropdown) {
                largeScreenDropdown.innerHTML = `
                    <li><a class="dropdown-item" href="prijava.html">Prijava</a></li>
                    <li><a class="dropdown-item" href="registracija.html">Registracija</a></li>
                `;
            }
            
            // Posodobi navigacijo za male zaslone
            if (smallScreenNav) {
                // Prepričamo se, da vsebuje povezave za prijavo/registracijo
                if (!smallScreenNav.querySelector('a[href="prijava.html"]')) {
                    const navList = document.createElement('ul');
                    navList.className = 'navbar-nav me-auto';
                    
                    const loginItem = document.createElement('li');
                    loginItem.className = 'nav-item';
                    loginItem.innerHTML = '<a class="nav-link" href="prijava.html">Prijava</a>';
                    
                    const registerItem = document.createElement('li');
                    registerItem.className = 'nav-item';
                    registerItem.innerHTML = '<a class="nav-link" href="registracija.html">Registracija</a>';
                    
                    navList.appendChild(loginItem);
                    navList.appendChild(registerItem);
                    
                    smallScreenNav.innerHTML = '';
                    smallScreenNav.appendChild(navList);
                }
            }
            
            // Skrij ime uporabnika
            if (userNameDisplay) {
                userNameDisplay.textContent = '';
                const parentElement = userNameDisplay.closest('.d-none.d-md-block');
                if (parentElement) {
                    parentElement.classList.add('d-none');
                }
            }
        }
    }

    // Funkcija za pridobivanje podatkov uporabnika iz API-ja
    async function fetchUserData(token) {
        try {
            // API klic za pridobitev podatkov profila - uporabi API endpoint za profile
            const response = await fetch(`${CONFIG.API_BASE_URL}/users/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Napaka pri pridobivanju podatkov: ${response.status}`);
            }

            const userData = await response.json();
          
            // Preoblikuj podatke po potrebi za uskladitev s pričakovanim formatom
            // Zelo fleksibilna koda, ki poskuša najti podatke ne glede na format
            const formattedData = {
                ime: userData.ime || userData.Ime || userData.name || userData.Name || '',
                priimek: userData.priimek || userData.Priimek || userData.surname || userData.lastName || '',
                email: userData.email || userData.Email || userData.mail || '',
                tipUporabnika: userData.tip_uporabnika || userData.tipUporabnika || 
                               userData.userType || userData.role || userData.vloga || '',
                slika: userData.slika || userData.profileImage || userData.avatar || '',
                is_banned: userData.is_banned || false,  // Dodamo podatek o banu
                userId: userData.idUporabnik || userData.id || userData.userId || '',  // Dodamo ID uporabnika
                lastUpdated: new Date().toISOString(),  // Dodamo časovni žig zadnje posodobitve
                datum_rojstva: userData.datum_rojstva || null
            };
            
            
            
            return formattedData;
        } catch (error) {
            console.error('Napaka pri pridobivanju podatkov uporabnika:', error);
            return null;
        }
    }

    // Funkcija za odstranjevanje upravljalskih povezav
    function removeAdminLinks(navElement) {
        const adminLinks = navElement.querySelectorAll('.admin-link');
        adminLinks.forEach(link => link.remove());
    }    // Funkcija za dodajanje upravljalskih povezav
    function addAdminLinks(navElement, tipUporabnika) {
        // Ustvari nove povezave
        const dogodkiLink = document.createElement('li');
        dogodkiLink.className = 'nav-item admin-link';
        
        // Različen naslov glede na vlogo uporabnika
        if (tipUporabnika === 'Organizator') {
            dogodkiLink.innerHTML = '<a class="nav-link" href="upravljanje_dogodkov.html"> Moji dogodki</a>';
        } else {
            dogodkiLink.innerHTML = '<a class="nav-link" href="upravljanje_dogodkov.html"> Upravljanje dogodkov</a>';
        }
        
        // Dogodki so vidni obema vlogama
        navElement.appendChild(dogodkiLink);
        
        // Uporabniki so vidni samo administratorju
        if (tipUporabnika === 'Administrator') {
            const uporabnikiLink = document.createElement('li');
            uporabnikiLink.className = 'nav-item admin-link';
            uporabnikiLink.innerHTML = '<a class="nav-link" href="upravljanje_uporabnikov.html"> Upravljanje uporabnikov</a>';
            navElement.appendChild(uporabnikiLink);
        }
    }// Funkcija za nastavitev poslušalcev za odjavo
    function setupLogoutListeners() {
        const logoutBtn = document.getElementById('logout-btn');
        const smallLogoutBtn = document.getElementById('small-logout-btn');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
        
        if (smallLogoutBtn) {
            smallLogoutBtn.addEventListener('click', logout);
        }
        
        // Ponovno nastavi poslušalce za mobilni meni
        setupMobileMenuListeners();
    }  function logout(e) {
        e.preventDefault();
        
        // Pobriši podatke iz local storage
        localStorage.removeItem('userToken');
        localStorage.removeItem('userInfo');
        
        // Prikaži sporočilo o uspešni odjavi v desnem zgornjem kotu
        const successAlert = document.createElement('div');
        successAlert.className = 'alert alert-success';
        successAlert.textContent = 'Uspešna odjava! Preusmerjanje...';
        successAlert.style.position = 'fixed';
        successAlert.style.top = '20px';
        successAlert.style.right = '20px';
        successAlert.style.zIndex = '9999';
        successAlert.style.maxWidth = '300px';
        document.body.appendChild(successAlert);
        
        // Posodobi navigacijo
        updateNavigation();
        
        // Če je meni odprt na mobilni napravi, ga zapri
        const navbarCollapse = document.querySelector('.navbar-collapse.show');
        if (navbarCollapse) {
            const bsCollapse = new bootstrap.Collapse(navbarCollapse);
            bsCollapse.hide();
        }
        
        // Preusmeri na domačo stran in reload z majhno zakasnitvijo
        setTimeout(() => {
            if (window.location.pathname !== '/index.html' && 
                window.location.pathname !== '/' && 
                window.location.pathname !== '/src/Frontend/index.html') {
                window.location.href = 'index.html';
            } else {
                // Če smo že na index.html, samo reloadaj stran
                window.location.reload();
            }
        }, 1500);
    }
});