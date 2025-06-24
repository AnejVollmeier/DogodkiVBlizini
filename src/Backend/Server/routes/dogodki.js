var express = require('express');
var router = express.Router();
const knex = require('../knex');
const path = require('path');
const fetch = require('node-fetch');
const { Dogodek , Uporabnik, Naslov, TipDogodka, Cenik, NajljubsiDogodki, NajljubsiOrganizatorji} = require('../models');
const { isOrganizator, getUserFromToken, isAuthenticated} = require('../middleware/authMiddleware');
const {upload, deleteFromCloudinary} = require('../middleware/fileUploadMiddleware');

const EARTH_RADIUS_KM = 6371; // Earth's radius in kilometers

async function geocodeAddress(address) {
  try {
    const formattedAddress = `${address.ulica} ${address.hisna_stevilka}, ${address.postna_stevilka} ${address.obcina}, Slovenia`;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API Key is not set in environment variables');
      return null;
    }
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formattedAddress)}&key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data = await response.json();
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lon: location.lng // Note: Google uses 'lng' instead of 'lon'
      };
    }
    console.error('Geocoding failed with status:', data.status);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// GET all dogodki with filters
router.get('/', async (req, res) => {
    try {
        // filters
        const {
          naziv,
          lokacija,
          tip,
          zacetek,
          konec,
          priljubljeniOrganizatorji,
          priljubljeniDogodki,
          sort,
          cena
      } = req.query;

      let user = null;
      // Check if user is authenticated for favorite events and organizers
      try
      {
        const token = req.headers.authorization?.split(' ')[1];

        if (token) {
          user = await getUserFromToken(token);
        }
      }
      catch (error)
      {
        console.log("token expired")
      }

      if ((priljubljeniDogodki === 'true' || priljubljeniOrganizatorji === 'true') && !user) {
        return res.status(401).json({ error: 'Za dostop do priljubljenih vsebin se morate prijaviti' });
      }
      const currentDate = new Date().toISOString().slice(0, 10);
        // Find dogodki by filters
        const dogodkiQuery = await Dogodek
            .query(qb => {
                // Join related tables
                qb.join('naslov', 'dogodek.TK_naslov', 'naslov.idNaslov')
                  .join('tip_dogodka', 'dogodek.TK_tip_dogodka', 'tip_dogodka.idTip_dogodka');

                  qb.join('cenik', function() {
                    
                    this.on('dogodek.idDogodek', '=', 'cenik.TK_dogodek')
                       .andOn('cenik.datum_od', '<=', knex.raw('?', [currentDate]))
                       .andOn(knex.raw('cenik.datum_do IS NULL'));
                });

                // Add je_promoviran filter
                if (req.query.je_promoviran !== undefined) {
                    qb.where('dogodek.je_promoviran', '=', req.query.je_promoviran);
                }

                if (naziv) {
                    qb.where('dogodek.naziv', 'LIKE', `%${naziv}%`);
                }

                // Location filter 
                if (lokacija) {
                    qb.where(function() {
                        this.where('naslov.obcina', 'LIKE', `%${lokacija}%`)
                          .orWhere('naslov.ulica', 'LIKE', `%${lokacija}%`)
                          .orWhere('naslov.hisna_stevilka', 'LIKE', `%${lokacija}%`)
                          .orWhere('naslov.postna_stevilka', 'LIKE', `%${lokacija}%`);
                    });
                }

                // Event type filter
                if (tip) {
                    qb.where('tip_dogodka.naziv', '=', tip);
                }

                // Date range filters
                if (zacetek) {
                    qb.where('dogodek.cas', '>=', new Date(zacetek));
                }
                if (konec) {
                    qb.where('dogodek.cas', '<=', new Date(konec));
                }

                // Cenovni razpon
                if (cena) {
                  switch(cena) {
                      case 'Brezplačno':
                          qb.where('cenik.cena', 0);
                          break;
                      case '10':
                          qb.where('cenik.cena', '<=', 10);
                          break;
                      case '10-25':
                          qb.whereBetween('cenik.cena', [10, 25]);
                          break;
                      case '25-50':
                          qb.whereBetween('cenik.cena', [25, 50]);
                          break;
                      case '50':
                          qb.where('cenik.cena', '>', 50);
                          break;
                  }
                }

                // Favorite events filter
                if (priljubljeniDogodki === 'true') {
                    qb.join('najljubsi_dogodki', 'dogodek.idDogodek', 'najljubsi_dogodki.TK_dogodek')
                      .where('najljubsi_dogodki.TK_uporabnik', '=', user.id);
                }

                // Favorite organizers filter
                if (priljubljeniOrganizatorji === 'true') {
                    qb.join('najljubsi_organizator', 'dogodek.TK_uporabnik', 'najljubsi_organizator.TK_uporabnik_organizator')
                      .where('najljubsi_organizator.TK_uporabnik', '=', user.id); 
                }

                // Radius filter
                if (req.query.lat && req.query.lon && req.query.radius) {
                  const userLat = parseFloat(req.query.lat);
                  const userLon = parseFloat(req.query.lon);
                  const radius = parseFloat(req.query.radius);

                  qb.where(function () {
                    this.whereRaw(
                      `(${EARTH_RADIUS_KM} * acos(cos(radians(?)) * cos(radians(naslov.lat)) * cos(radians(naslov.lon) - radians(?)) + sin(radians(?)) * sin(radians(naslov.lat)))) <= ?`,
                      [userLat, userLon, userLat, radius]
                    );
                  });
                }

                // Sorting
                switch (sort) {
                    case 'date-desc':
                        qb.orderBy('dogodek.cas', 'DESC');
                        break;
                    case 'az':
                        qb.orderBy('dogodek.naziv', 'ASC');
                        break;
                    case 'za':
                        qb.orderBy('dogodek.naziv', 'DESC');
                        break;
                    case 'price-asc':
                          qb.orderByRaw('COALESCE(cenik.cena, 999999) ASC');
                          break;
                    case 'price-desc':
                          qb.orderByRaw('COALESCE(cenik.cena, -1) DESC');
                          break;
                    default: // date ascending
                        qb.orderBy('dogodek.cas', 'ASC');
                }

              // Pagination
              const page = parseInt(req.query.page) || 1;
              const limit = parseInt(req.query.limit) || 12;
              qb.limit(limit).offset((page - 1) * limit);
            })
            .fetchAll({
                require: false,
                withRelated: ['naslov', 'tipDogodka', 'organizator', {
                  'cenik': qb => {
                      qb.where(query => {
                          query.where('datum_do', '>=', currentDate)
                               .orWhereNull('datum_do');
                      })
                      .andWhere('datum_od', '<=', currentDate)
                  }
              }]
            });

        const dogodki = dogodkiQuery.toJSON();

        // total is only fetched when pagination is needed(dogodki.html)
        if (req.query.page)
        {
          // Get total count separately to avoid pagination limits
          const countQuery = Dogodek.query(qb => {
            // Copy all the filter conditions from the main query
            // Join related tables
            qb.join('naslov', 'dogodek.TK_naslov', 'naslov.idNaslov')
              .join('tip_dogodka', 'dogodek.TK_tip_dogodka', 'tip_dogodka.idTip_dogodka');

            qb.join('cenik', function() {
                this.on('dogodek.idDogodek', '=', 'cenik.TK_dogodek')
                  .andOn('cenik.datum_od', '<=', knex.raw('?', [currentDate]))
                  .andOn(knex.raw('cenik.datum_do IS NULL'));
            });
            
            // Add je_promoviran filter
            if (req.query.je_promoviran !== undefined) {
                qb.where('dogodek.je_promoviran', '=', req.query.je_promoviran);
            }

            if (naziv) {
                qb.where('dogodek.naziv', 'LIKE', `%${naziv}%`);
            }

            if (lokacija) {
                qb.where(function() {
                    this.where('naslov.obcina', 'LIKE', `%${lokacija}%`)
                      .orWhere('naslov.ulica', 'LIKE', `%${lokacija}%`)
                      .orWhere('naslov.hisna_stevilka', 'LIKE', `%${lokacija}%`)
                      .orWhere('naslov.postna_stevilka', 'LIKE', `%${lokacija}%`);
                });
            }

            if (tip) {
                qb.where('tip_dogodka.naziv', '=', tip);
            }

            if (zacetek) {
                qb.where('dogodek.cas', '>=', new Date(zacetek));
            }
            if (konec) {
                qb.where('dogodek.cas', '<=', new Date(konec));
            }

            if (cena) {
              switch(cena) {
                  case 'Brezplačno':
                      qb.where('cenik.cena', 0);
                      break;
                  case '10':
                      qb.where('cenik.cena', '<=', 10);
                      break;
                  case '10-25':
                      qb.whereBetween('cenik.cena', [10, 25]);
                      break;
                  case '25-50':
                      qb.whereBetween('cenik.cena', [25, 50]);
                      break;
                  case '50':
                      qb.where('cenik.cena', '>', 50);
                      break;
              }
            }

            if (priljubljeniDogodki === 'true') {
                qb.join('najljubsi_dogodki', 'dogodek.idDogodek', 'najljubsi_dogodki.TK_dogodek')
                  .where('najljubsi_dogodki.TK_uporabnik', '=', user.id);
            }

            if (priljubljeniOrganizatorji === 'true') {
                qb.join('najljubsi_organizator', 'dogodek.TK_uporabnik', 'najljubsi_organizator.TK_uporabnik_organizator')
                  .where('najljubsi_organizator.TK_uporabnik', '=', user.id); 
            }
            
            // Just count, don't include any pagination
            qb.count('* as total');
          });
          const countResult = await countQuery.fetch();
          const total = countResult ? parseInt(countResult.get('total')) : 0;
  
          res.json({dogodki, total});
        }
        else
        {
          res.json(dogodki);
        }
        
    } catch (error) {
      res.status(500).json({ error: 'Napaka pri pridobivanju dogodkov' });
    }
});

// GET weather data za dogodek
router.get('/:id/vreme', async (req, res) => {
  try {
      const dogodekId = req.params.id;

      const dogodek = await Dogodek
          .where({ idDogodek: dogodekId })
          .fetch({ 
              require: false, 
              withRelated: ['naslov'] 
          });

      if (!dogodek) {
          return res.status(404).json({ error: 'Dogodek ni bil najden' });
      }

      const eventData = dogodek.toJSON();
      const eventDate = new Date(eventData.cas);
      const today = new Date();
      
      // Preveri če je dogodek v naslednjih 7 dneh
      const timeDiff = eventDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      if (daysDiff < 0 || daysDiff > 7 || !eventData.naslov?.lat) {
          return res.json({ message: null });
      }

      // Pridobi vremensko napoved
      const apiKey = process.env.WEATHER_API_KEY;
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${eventData.naslov.lat}&lon=${eventData.naslov.lon}&appid=${apiKey}&units=metric&lang=sl`;
      
      const weatherResponse = await fetch(url);
      const weatherData = await weatherResponse.json();
    
      // Pripravi časovne podatke
      const eventTime = eventDate.getTime();

      // Filtriraj vse napovedi za dan dogodka
      const dateString = eventDate.toDateString();
      const dailyForecasts = weatherData.list.filter(item => {
          const forecastDate = new Date(item.dt * 1000);
          return forecastDate.toDateString() === dateString;
      });

      if (dailyForecasts.length === 0) {
          return res.json({ message: null });
      }

      // Poišči najbližjo napoved glede na čas dogodka
      let closestForecast = dailyForecasts[0];
      let smallestDiff = Math.abs(new Date(closestForecast.dt * 1000) - eventTime);

      dailyForecasts.forEach(forecast => {
          const forecastTime = new Date(forecast.dt * 1000).getTime();
          const timeDiff = Math.abs(forecastTime - eventTime);
          
          if (timeDiff < smallestDiff) {
              smallestDiff = timeDiff;
              closestForecast = forecast;
          }
      });

      // Preveri največjo dovoljeno razliko (3 ure)
      if (smallestDiff > 3 * 60 * 60 * 1000) {
          return res.json({ message: null });
      }

      // Oblikuj sporočilo
      const temp = closestForecast.main.temp;
      const weather = closestForecast.weather[0];
      let message = '';

      if (weather.main.toLowerCase().includes('rain')) {
          message = `🌧️ Na dan dogodka je napovedan dež (${weather.description}). Priporočamo dežnik!`;
      } else if (temp < 10) {
          message = `❄️ Pričakovana temperatura ${Math.round(temp)}°C. Topla oblačila priporočena!`;
      } else if (temp > 25) {
          message = `☀️ Pričakovana temperatura ${Math.round(temp)}°C. Ne pozabite na zaščito pred soncem!`;
      } else {
          message = `⛅ Vreme na dan dogodka: ${weather.description}`;
      }

      res.json({ message });
  } catch (error) {
      console.error('Napaka pri pridobivanju vremena:', error);
      res.json({ message: null });
  }
});

// GET events created by the authenticated organizer
router.get('/moji', isOrganizator, async (req, res) => {
  try {
    // Organizer ID
    const organizatorId = typeof req.user.get === 'function' ? req.user.get('idUporabnik') : req.user.idUporabnik;
    const currentTimestamp = new Date().toISOString();
    // Fetch organizer's events with active price
    const events = await Dogodek.query(qb => {
      qb.where('dogodek.TK_uporabnik', organizatorId)
        .join('naslov', 'dogodek.TK_naslov', 'naslov.idNaslov')
        .join('tip_dogodka', 'dogodek.TK_tip_dogodka', 'tip_dogodka.idTip_dogodka')
        .join('cenik', function() {
          this.on('dogodek.idDogodek', '=', 'cenik.TK_dogodek')
              .andOn('cenik.datum_od', '<=', knex.raw('?', [currentTimestamp]))
              .andOn(knex.raw('cenik.datum_do IS NULL')); 
        });
    }).fetchAll({ require: false, withRelated: ['naslov', 'tipDogodka', 'organizator', 'cenik'] });
    res.json(events.toJSON());
  } catch (error) {
    console.error('Napaka pri pridobivanju mojih dogodkov:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju mojih dogodkov' });
  }
});

// GET dogodek by id
router.get('/:id', async (req, res) => {
  try {
      const dogodekId = req.params.id;
      // Use full ISO timestamp for price filtering
      const currentTimestamp = new Date().toISOString();

      // Check if user is authenticated to get favorite status
      let user = null;
      // Check if user is authenticated for favorite events and organizers
      try
      {
        const token = req.headers.authorization?.split(' ')[1];

        if (token) {
          user = await getUserFromToken(token);
        }
      }
      catch (error)
      {
        console.log("token expired")
      }

      // Find dogodek by id
      const dogodek = await Dogodek
          .where({ idDogodek: dogodekId }) 
          .fetch({ require: false, withRelated: ['naslov', 'tipDogodka', 'organizator', {
              'cenik': qb => {
                  qb.where('datum_od', '<=', currentTimestamp)
                  .andWhere(qb2 => {
                      qb2.where('datum_do', '>=', currentTimestamp)
                          .orWhereNull('datum_do')
                  });
              }
          }] });

      if (!dogodek) {
          return res.json(null);
      }

      // Convert to JSON for manipulation
      const dogodekData = dogodek.toJSON();
      
      // Default favorite status
      dogodekData.jePriljubljen = false;
      dogodekData.organizatorJePriljubljen = false;
      
      // If user is authenticated, check favorite status
      if (user) {
          const userId = user.get('idUporabnik');
          const organizatorId = dogodekData.TK_uporabnik;
          
          // Check if event is in user's favorites
          const favoriteEvent = await NajljubsiDogodki
              .where({
                  TK_dogodek: dogodekId,
                  TK_uporabnik: userId
              })
              .fetch({ require: false });
          
          // Check if organizer is in user's favorites
          const favoriteOrganizer = await NajljubsiOrganizatorji
              .where({
                  TK_uporabnik_organizator: organizatorId,
                  TK_uporabnik: userId
              })
              .fetch({ require: false });

          // Update favorite status in response
          dogodekData.jePriljubljen = !!favoriteEvent;
          dogodekData.organizatorJePriljubljen = !!favoriteOrganizer;
      }
              
      // Return JSON object for the event including related models and favorite status
      res.json(dogodekData);
  } catch (error) {
      console.error('Error fetching event details:', error);
      res.status(500).json({ error: 'Napaka pri pridobivanju dogodka' });
  }
});


// POST new dogodek
router.post('/', isOrganizator, upload.single('slika'), async (req, res) => {
  const { id, naslov_dogodka, cas, opis, naslov, tip_dogodka, cena, eventim_url } = req.body;
  // Normalize promotion flag to 0 or 1
  const je_promoviran = ['1','true',1,true].includes(req.body.je_promoviran) ? 1 : 0;
  // Parse naslov JSON string into object
  let naslovData;
  try {
    naslovData = JSON.parse(naslov);
  } catch (err) {
    return res.status(400).json({ error: 'Neveljaven format naslova' });
  }
  const organizatorId = req.user.id;
  const isUpdate = !!id;
  const currentTime = new Date();
  // Use date-only string for price validity filters
  const currentDateStr = currentTime.toISOString().slice(0,10);

  // Get image path if uploaded, otherwise null
  let slikaPath = null;
  if (req.file) {
    slikaPath = `${req.file.path}`;
  }

  if (!naslov_dogodka || !cas || !opis || !naslov || !tip_dogodka || !cena) {
    // Delete the uploaded file if it exists
    if (req.file) {
      deleteFromCloudinary(req.file.filename);
    }
    return res.status(400).json({ error: 'Manjkajo obvezni podatki!' });
  }

  try {
      // Check if naslov already exists
    const existingNaslov = await Naslov
      .where({
        ulica: naslovData.ulica,
        hisna_stevilka: naslovData.hisna_stevilka,
        postna_stevilka: naslovData.postna_stevilka,
        obcina: naslovData.obcina
      })
      .fetch({ require: false });

    let naslovRecord = existingNaslov;
    if (!naslovRecord) {
      // Pridobi lan in lot
      const coordinates = await geocodeAddress(naslovData);
      if (coordinates) {
        naslovData.lat = coordinates.lat;
        naslovData.lon = coordinates.lon;
      }
      naslovRecord = await Naslov.forge(naslovData).save();
    } else if (!naslovRecord.get('lat') || !naslovRecord.get('lon')) {

      const coordinates = await geocodeAddress(naslovData);
      if (coordinates) {
        await naslovRecord.save({
          lat: coordinates.lat,
          lon: coordinates.lon
        });
      }
    }

    // Fetch event type by ID
    const tipDogodka = await TipDogodka
      .where({ idTip_dogodka: parseInt(tip_dogodka, 10) })
      .fetch({ require: false });

    let dogodekId;
    
    if (id) {
      const existingDogodek = await Dogodek.where({ idDogodek: id }).fetch({ require: false });

      if (!existingDogodek) {
        if (req.file) {
          deleteFromCloudinary(req.file.filename);
        }
        return res.status(404).json({ error: 'Dogodek ni bil najden' });
      }

      // Only the event owner or admin can update
      const ownerId = existingDogodek.get('TK_uporabnik');
      if (ownerId !== organizatorId && req.user.get('tip_uporabnika') !== 'Administrator') {
        return res.status(403).json({ error: 'Nimate pravice urejati tega dogodka' });
      }

      // Delete old image from Cloudinary if a new one is uploaded
      if (slikaPath !== null && existingDogodek.get('slika_id') !== null) {
        deleteFromCloudinary(existingDogodek.get('slika_id'));
      }

      await existingDogodek.save({
        naziv: naslov_dogodka,
        cas,
        opis,
        je_promoviran,
        slika: slikaPath || existingDogodek.get('slika'),
        slika_id: req.file ? req.file.filename : existingDogodek.get('slika_id'), 
        TK_naslov: naslovRecord.get('idNaslov'),
        TK_tip_dogodka: tipDogodka.get('idTip_dogodka'),
        eventim_url: eventim_url || existingDogodek.get('eventim_url')
      });
      
      dogodekId = id;
      

      const currentPrice = await Cenik
        .where({ TK_dogodek: dogodekId, datum_do: null })
        .fetch({ require: false });
        
      if (currentPrice && parseFloat(currentPrice.get('cena')) !== parseFloat(cena)) {
        await currentPrice.save({
          datum_do: currentTime
        });
        
        await Cenik.forge({
          datum_od: currentDateStr,
          datum_do: null,
          cena: parseFloat(cena),
          TK_dogodek: dogodekId
        }).save();
      } else if (!currentPrice) {
        await Cenik.forge({
          datum_od: currentDateStr,
          datum_do: null,
          cena: parseFloat(cena),
          TK_dogodek: dogodekId
        }).save();
      }
      
      res.json({ message: 'Dogodek uspešno posodobljen' });
    }
    else
    {
      const newDogodek = await Dogodek.forge({
        naziv: naslov_dogodka,
        cas,
        opis,
        je_promoviran,
        slika: slikaPath || null,
        slika_id: req.file ? req.file.filename : null,
        TK_naslov: naslovRecord.get('idNaslov'),
        TK_tip_dogodka: tipDogodka.get('idTip_dogodka'),
        TK_uporabnik: organizatorId,
        eventim_url: eventim_url || null
      }).save();
      
      dogodekId = newDogodek.get('idDogodek');
      
      await Cenik.forge({
        datum_od: currentDateStr,
        datum_do: null,
        cena: parseFloat(cena),
        TK_dogodek: dogodekId
      }).save();
      
      res.json({ message: 'Dogodek uspešno dodan' });
    }

  } catch (error) {
      console.error('Error:', error);
      if (req.file) {
        deleteFromCloudinary(req.file.filename);
      }
      res.status(500).json({ error: 'Napaka pri dodajanju dogodka' });
  }
});

router.delete('/:id', isOrganizator, async (req, res) => {
    try { 
        // Find dogodek by id
        const dogodekId = req.params.id;
        const dogodek = await Dogodek.where({ idDogodek: dogodekId }).fetch({ require: false });

        if (!dogodek) {
          return res.status(404).json({ error: 'Dogodek ni bil najden' });
        }

        // Check if this dogodek was created by the user, or the user is an admin
        if (dogodek.get('TK_uporabnik') !== req.user.get('idUporabnik') && req.user.get('tip_uporabnika') !== 'Administrator') {
            return res.status(403).json({ error: 'Nimate pravic za brisanje tega dogodka' });
        }

        // delete the image if it exists
        if (dogodek.get('slika_id')) {
          deleteFromCloudinary(dogodek.get('slika_id'));
        }
        await dogodek.destroy();

    res.json({ message: 'Dogodek uspešno izbrisan' });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Napaka pri brisanju dogodka' });
    }
});

router.post('/favorite/:id', isAuthenticated, async (req, res) => {
  try {
    const dogodekId = req.params.id;
    let userId = null;
    if (req.user)
    {
      userId = req.user.idUporabnik;
    }
    // Verify that the dogodek exists
    const dogodek = await Dogodek.where({ idDogodek: dogodekId }).fetch({ require: false });
    
    if (!dogodek) {
      return res.status(404).json({ error: 'Dogodek ni bil najden' });
    }
    
    // Check if the dogodek is already in user's favorites
    const existingFavorite = await NajljubsiDogodki
      .where({
        TK_dogodek: dogodekId,
        TK_uporabnik: userId
      })
      .fetch({ require: false });
    
    if (existingFavorite) {
      return res.status(400).json({ error: 'Dogodek je že med priljubljenimi' });
    }
    
    // Add dogodek to user's favorites
    await NajljubsiDogodki.forge({
      TK_dogodek: dogodekId,
      TK_uporabnik: userId
    }).save();
    
    res.status(201).json({ 
      message: 'Dogodek uspešno dodan med priljubljene'
    });
    
  } catch (error) {
    console.error('Error adding favorite event:', error);
    res.status(500).json({ error: 'Napaka pri dodajanju priljubljenega dogodka' });
  }
});

router.delete('/favorite/:id', isAuthenticated, async (req, res) => {
  try {
    const dogodekId = req.params.id;
    let userId = null;
    if (req.user)
    {
      userId = req.user.idUporabnik;
    }
     
    // Find the najljubsi_dogodek entry
    const favoriteEntry = await NajljubsiDogodki
      .where({
        TK_dogodek: dogodekId,
        TK_uporabnik: userId
      })
      .fetch({ require: false });
    
    if (!favoriteEntry) {
      return res.status(404).json({ error: 'Dogodek ni med vašimi priljubljenimi' });
    }
    
    // Remove the favorite entry
    await favoriteEntry.destroy();
    
    res.json({ 
      message: 'Dogodek uspešno odstranjen iz priljubljenih'
    });
    
  } catch (error) {
    console.error('Error removing favorite event:', error);
    res.status(500).json({ error: 'Napaka pri odstranjevanju priljubljenega dogodka' });
  }
});

// GET favorite events for the currently authenticated user
router.get('/favorites/user', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.idUporabnik;
    if (!userId) {
      return res.status(401).json({ error: 'Uporabnik ni prijavljen' });
    }

    const favoriteEvents = await NajljubsiDogodki.where({ TK_uporabnik: userId })
      .fetchAll({
        withRelated: ['dogodek', 'dogodek.naslov', 'dogodek.tipDogodka'] // Include related event details
      });

    const eventsDetails = favoriteEvents.map(fav => {
      if (fav.related('dogodek')) {
        const dogodekData = fav.related('dogodek').toJSON();
        // You can further customize what event data is returned here if needed
        return dogodekData;
      }
      return null;
    }).filter(event => event !== null);

    res.json(eventsDetails);
  } catch (error) {
    console.error('Error fetching user favorite events:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju priljubljenih dogodkov uporabnika' });
  }
});

// GET public favorite events for a specific user by ID
router.get('/public/favorites/events/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Neveljaven ID uporabnika' });
    }

    // Optional: Check if user exists
    const userExists = await Uporabnik.where({ idUporabnik: userId }).fetch({ require: false });
    if (!userExists) {
      return res.status(404).json({ error: 'Uporabnik ni najden' });
    }

    const favoriteEvents = await NajljubsiDogodki.where({ TK_uporabnik: userId })
      .fetchAll({
        withRelated: ['dogodek', 'dogodek.naslov', 'dogodek.tipDogodka']
      });

    const eventsDetails = favoriteEvents.map(fav => {
      if (fav.related('dogodek')) {
        return fav.related('dogodek').toJSON();
      }
      return null;
    }).filter(event => event !== null);

    res.json(eventsDetails);
  } catch (error) {
    console.error('Error fetching public favorite events:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju javnih priljubljenih dogodkov' });
  }
});

// New endpoint for geocoding locations
router.get('/geocode/:location', async (req, res) => {
  try {
    const location = req.params.location;
    
    if (!location || location.trim().length === 0) {
      return res.status(400).json({ error: 'Location parameter is required' });
    }

    // Format the address to include Slovenia for better results
    const formattedAddress = `${location}, Slovenia`;
    
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Geocoding API key is not configured' });
    }
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formattedAddress)}&key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Geocoding API request failed',
        details: response.statusText 
      });
    }
    
    console.log(response)
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const formattedAddress = data.results[0].formatted_address;
      
      return res.json({
        lat: location.lat,
        lon: location.lng,
        formattedAddress: formattedAddress,
        original: location
      });
    } else {
      return res.status(404).json({ 
        error: 'Location not found',
        status: data.status,
        message: data.error_message || 'No results found'
      });
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Server error during geocoding request' });
  }
});

module.exports = router;
