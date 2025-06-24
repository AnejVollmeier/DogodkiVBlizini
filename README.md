# SkupajTukaj.si
_Projekt v sklopu predmeta Praktikum 1, FERI IPT UN 1. letnik_

## O projektu
Glavni namen spletne strani [skupajtukaj.si](https://skupajtukaj.si/) je zbližati organizatorje dogodkov in lokalno občinstvo. Aplikacija rešuje problem slabe obveščenosti o lokalnih dogodkih, ki se pogosto izgubijo v poplavi informacij, in olajšuje povezovanje udeležencev z organizatorji. Platforma deluje kot centralno stičišče za vse lokalne dogodke, kjer lahko obiskovalci hitro najdejo dogodke v svoji bližini glede na svoje interese, organizatorji pa dosežejo ciljno občinstvo za svoje prireditve.

## Glavne funkcionalnosti

### Za obiskovalce:
- **Pregled dogodkov, napredno iskanje ter filtriranje** po različnih kriterijih (cena, lokacija, tip dogodka...)
- **Prikaz dogodkov v seznamu in v obliki kartic** z vsemi pomembnimi informacijami
- **Lokacijski filter** za iskanje dogodkov v določeni razdalji od uporabnikove lokacije
- **Preverba vremenske napovedi** za načrtovane dogodke
- **Shranjevanje najljubših dogodkov ali organizatorjev** za lažje sledenje
- **Prijava na dogodke** s prejemanjem opomnikov pred začetkom
- **Uporabniški profil** s pregledom preteklih dogodkov in ocen
- **Ocenjevanje in komentiranje dogodkov** po njihovi izvedbi

### Za organizatorje:
- **Dodajanje in urejanje dogodkov** z vsemi potrebnimi podatki
- **Pregled prijavljenih udeležencev** na organizirane dogodke

### Za administratorje:
- **Nadzor nad vsemi vsebinami** na platformi
- **Preverjanje neprimernih dogodkov ali komentarjev** ter blokiranje uporabnikov
- **Promoviranje izbranih dogodkov** na prvi strani
- **Upravljanje uporabniških računov**

## Izbrane tehnologije

### Frontend:
- **HTML, CSS, JavaScript** - osnova za razvoj spletnega vmesnika
- **Bootstrap** - za odziven in moderen uporabniški vmesnik

### Backend:
- **Node.js** - strežniško okolje
- **Express.js** - ogrodje za razvoj spletnega strežnika
- **Knex.js** - SQL query builder za lažjo interakcijo s podatkovno bazo
- **Bookshelf.js** - ORM za definiranje modelov in relacij

### Podatkovna baza:
- **MySQL** - za shranjevanje vseh podatkov

### Dodatne storitve in knjižnice:
- **Cloudinary** - za shranjevanje in upravljanje slik dogodkov in profilov
- **OpenStreetMap API** - za geolokacijske storitve in geocoding naslovov
- **OpenWeatherMap API** - za pridobivanje vremenskih podatkov za dogodke
- **JWT (JSON Web Tokens)** - za avtentikacijo uporabnikov
- **bcrypt** - za varno shranjevanje gesel

### Cloud arhitektura
- Frontend del spletne strani gostujemo na brezplačni platformi [netlify.com](https://www.netlify.com/).
- Za gostovanje NodeJS strežnika uporabljamo heroku, saj ga imamo kot študentje brezplačno za 2 leti.
- Mysql strežnik pa se prav tako nahaja v heroku, in sicer kot add-on JawsDB Mysql,
- Za shranjevanje slik smo pa uporabili platformo [cloudinary.com](https://cloudinary.com/).

tukaj je še preprost diagram kako izgleda arhitektura:
![arhitektura](Documentation/CloudDiagram.svg)

## Uporaba
Spletno stran lahko najdete na [skupajtukaj.si](https://skupajtukaj.si/), spletna stran bo najverjetneje dostopna 1 leto, torej do okrog maja 2026, ko bo potekla domena in bomo ustavili strežnik.

### Namestitev in zagon lokalno:

1. **Kloniranje repozitorija**:
   ```bash
   git clone https://github.com/uporabnik/skupajtukaj.git
   cd skupajtukaj
   ```

2. **Namestitev odvisnosti**:
   ```bash
   # Namestitev backend odvisnosti
   cd src/Backend/Server
   npm install
   ```

3. **Konfiguracija okolja**:
   - Ustvarite `.env` datoteko v mapi `src/Backend/Server` po vzoru `.env.example`
   - Nastavite potrebne okoljske spremenljivke (povezava do baze, API ključi, itd.)
   - V `src/Backend/Server/knexfile.js` spremenite v DEV konfiguracijo, isto naredite v `src/Frontend/js/config.js`.
4. **Nastavitev podatkovne baze**:
   ```bash
   # Zaženite sql kodo, ki jo najdete pod Documentation
   ```

5. **Zagon aplikacije**:
   ```bash
   # Zagon strežnika
   cd src/Backend/Server
   npm start
   
   # Zagon frontend strežnika, če uporabljate vs code ali kaj podobnega
   ```

6. **Dostop do aplikacije**:
   - Backend API bo dostopen na `http://localhost:3000`
   - Frontend bo dostopen na `http://localhost:5000` (ali drug port, odvisno od konfiguracije)


## Avtorji

- Matija Gusel,
- Anej Vollmeier,
- Luka Grobelnik,
- Jan Mrkonjič

Mentor: Gaja Gujt

