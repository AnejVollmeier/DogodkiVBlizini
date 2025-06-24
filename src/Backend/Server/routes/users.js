const express = require('express');
const router = express.Router();
const { Uporabnik, NajljubsiOrganizatorji } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const knex = require('../knex');
const { isAdmin, isAuthenticated } = require('../middleware/authMiddleware');
const {upload, deleteFromCloudinary} = require('../middleware/fileUploadMiddleware');

router.post('/login', async function(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
      return res.status(400).json({ error: 'E-pošta in geslo sta obvezna' });
  }

  try {
    // Check if user exists
      const user = await Uporabnik.where({ email }).fetch({ require: false });
      
      if (!user) {
          return res.status(401).json({ error: 'Napačen e-poštni naslov ali geslo' });
      }

      // Check password
      const userData = user.attributes;
      const passwordMatch = await bcrypt.compare(password, userData.geslo);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Napačen e-poštni naslov ali geslo' });
      }

      // Create JWT token
      const token = jwt.sign(
        {
          idUporabnik: userData.idUporabnik,
          tip_uporabnika: userData.tip_uporabnika,
        },
        process.env.JWT_SECRET
      );

      // Return JTW token and user type
      res.json({
        message: 'Prijava uspešna',
        token,
        tipUporabnika: userData.tip_uporabnika,
      });

  } catch (error) {
    res.status(500).json({ error: 'Napaka pri prijavi uporabnika!"' });
  }
});

router.post('/register', upload.single('slika'), async function(req, res, next) {
  const { ime, priimek, email, geslo, datumRojstva, tip_uporabnika } = req.body;
  // Handle uploaded image
  const slikaFile = req.file;
  const slika = slikaFile ? slikaFile.path : null;
  const slika_id = slikaFile ? slikaFile.filename : null;

  // Validation
  if (!email || !datumRojstva || !ime || !priimek || !geslo) {
      return res.status(400).json({ error: 'Vsa obvezna polja morajo biti izpolnjena' });
  }

  try {
    // Check if user already exists
      const exists = await Uporabnik.where({ email }).fetch({ require: false });
      if (exists) {
        return res.status(400).json({ error: 'E-pošta že obstaja' });
      }

      // Hash password and create new user
      const hashedPassword = await bcrypt.hash(geslo, 12);
      const newUser = await Uporabnik.forge({
        ime,
        priimek,
        email,
        geslo: hashedPassword,
        datum_rojstva: datumRojstva,
        tip_uporabnika: tip_uporabnika || 'Obiskovalec',
        slika,
        slika_id,
        is_banned: false
      }).save();

      // Create JWT token
      const token = jwt.sign(
        {
          idUporabnik: newUser.get('idUporabnik'),
          tip_uporabnika: newUser.get('tip_uporabnika')
        },
        process.env.JWT_SECRET
      );
      

      // Return JWT token
      res.status(201).json({
        message: 'Registracija uspešna',
        token,
        tipUporabnika: newUser.tip_uporabnika,
      });

  } catch (error) {
    res.status(500).json({ error: 'Napaka pri registraciji!"' });
  }
});


// GET /profile - dobi podatke o trenutno prijavljenem uporabniku (potreben isAuthenticated)
router.get('/profile', isAuthenticated, async function(req, res, next) {
  try {
    // ID uporabnika dobimo iz JWT žetona, ki je dekodiran v middleware-u isAuthenticated
    const userId = req.user.idUporabnik;

    if (!userId)
    {
      return res.status(401).json({ error: 'Uporabnik ni prijavljen' });
    }
   
    // Pridobimo podatke uporabnika iz baze
    const user = await Uporabnik.where({ idUporabnik: userId }).fetch({ 
      require: false 
    });
    
    if (!user) {
      
      return res.status(404).json({ error: 'Uporabnik ni najden' });
    }
    
    // Vrnemo podatke uporabnika
    const userData = user.toJSON();
    
    // Ne pošiljamo gesla nazaj klientu
    delete userData.geslo;
    
    res.json(userData);
  } catch (error) {
    console.error("Napaka pri pridobivanju profila:", error);
    res.status(500).json({ error: 'Napaka pri pridobivanju uporabnika!"' });
  }
});

router.put('/:id', isAuthenticated, upload.single('slika'), async function(req, res, next) {
  const {
    ime,
    priimek,
    email,
    geslo,
    datumRojstva,
    tip_uporabnika
  } = req.body;

  const id = req.params.id;
  let userId = null;
  if (req.user) {
    userId = req.user.idUporabnik;
  }
  else
  {
    if (req.file) {
      deleteFromCloudinary(req.file.filename);
    }
    return res.status(403).json({ error: 'Nimate dovoljenja za posodobitev tega uporabnika' });
  }


  // Get image path if uploaded, otherwise null
  let slikaPath = null;
  if (req.file) {
    // Store the relative path to the image
    slikaPath = `${req.file.path}`;
  }

  if (!ime && !priimek && !email && !geslo && !datumRojstva && !tip_uporabnika && !req.file) {
    if (req.file) {
      deleteFromCloudinary(req.file.filename);
    }
    return res.status(400).json({ error: 'Mankajo polja' });
  }

  if (!id) {
    if (req.file) {
      deleteFromCloudinary(req.file.filename);
    }
    return res.status(400).json({ error: 'Manjka ID uporabnika' });
  }  if (parseInt(userId, 10) !== parseInt(id, 10) && req.user.tip_uporabnika !== 'Administrator') {
    if (req.file) {
      deleteFromCloudinary(req.file.filename);
    }
    return res.status(403).json({ error: 'Nimate dovoljenja za posodobitev tega uporabnika' });
  }
  // Check if email already exists (only if email is provided and has actually changed)
  if (email) {
    const currentUser = await Uporabnik.where({ idUporabnik: id }).fetch({ require: false });
    if (currentUser && currentUser.get('email') !== email) {
      const exists = await Uporabnik.where({ email }).andWhere('idUporabnik', '!=', id).fetch({ require: false });
      if (exists) {
        if (req.file) {
          deleteFromCloudinary(req.file.filename);
        }
        return res.status(400).json({ error: 'E-pošta že obstaja' });
      }
    }
  }

  try {
    const user = await Uporabnik.where({ idUporabnik: id }).fetch({ require: false });

    if (!user) {
      if (req.file) {
        deleteFromCloudinary(req.file.filename);
      }
      return res.status(404).json({ error: 'Uporabnik ni bil najden' });
    }

    const updatedFields = {};

    // Delete old image from Cloudinary if a new one is uploaded
    if (slikaPath !== null && user.get('slika_id') !== null) {
      deleteFromCloudinary(user.get('slika_id'));
    }
    
    if (ime) updatedFields.ime = ime;
    if (priimek) updatedFields.priimek = priimek;
    if (email) updatedFields.email = email;
    if (datumRojstva) updatedFields.datum_rojstva = datumRojstva;
    if (tip_uporabnika) updatedFields.tip_uporabnika = tip_uporabnika;
    if (slikaPath !== null) updatedFields.slika = slikaPath;
    if (req.file) updatedFields.slika_id = req.file.filename;

    // Only hash and update geslo if provided
    if (geslo) {
      const hashedPassword = await bcrypt.hash(geslo, 12);
      updatedFields.geslo = hashedPassword;
    }

    await user.save(updatedFields);

    res.status(200).json({ message: 'Uporabnik uspešno posodobljen' });

  } catch (error) {
 
    if (req.file) {
      deleteFromCloudinary(req.file.filename);
    }
    res.status(500).json({ error: 'Napaka pri posodabljanju uporabnika!' });
  }
});

// New endpoint for updating users via form-data
router.post('/edit/:id', isAuthenticated, upload.single('slika'), async function(req, res) {
  const id = req.params.id;
  const userId = req.user.idUporabnik;
  // Only allow self-update or admin
  if (parseInt(userId, 10) !== parseInt(id, 10) && req.user.tip_uporabnika !== 'Administrator') {
    if (req.file) deleteFromCloudinary(req.file.filename);
    return res.status(403).json({ error: 'Nimate dovoljenja za posodobitev tega uporabnika' });
  }
  // Extract fields
  const { ime, priimek, email, datumRojstva, tip_uporabnika, geslo } = req.body;
  const slikaFile = req.file;
  const slika = slikaFile ? slikaFile.path : null;
  const slika_id = slikaFile ? slikaFile.filename : null;
  try {
    const user = await Uporabnik.where({ idUporabnik: id }).fetch({ require: false });    if (!user) {
      if (req.file) deleteFromCloudinary(req.file.filename);
      return res.status(404).json({ error: 'Uporabnik ni bil najden' });
    }
    
    // Check if email already exists (only if email is provided and has actually changed)
    if (email && user.get('email') !== email) {
      const exists = await Uporabnik.where({ email }).andWhere('idUporabnik', '!=', id).fetch({ require: false });
      if (exists) {
        if (req.file) {
          deleteFromCloudinary(req.file.filename);
        }
        return res.status(400).json({ error: 'E-pošta že obstaja' });
      }
    }

    const updatedFields = {};
    if (ime) updatedFields.ime = ime;
    if (priimek) updatedFields.priimek = priimek;
    if (email) updatedFields.email = email;
    if (datumRojstva) updatedFields.datum_rojstva = datumRojstva;
    if (tip_uporabnika) updatedFields.tip_uporabnika = tip_uporabnika;
    if (geslo) {
      const hashed = await bcrypt.hash(geslo, 12);
      updatedFields.geslo = hashed;
    }
    if (slika) {
      if (user.get('slika_id')) await deleteFromCloudinary(user.get('slika_id'));
      updatedFields.slika = slika;
      updatedFields.slika_id = slika_id;
    }
    await user.save(updatedFields, { patch: true });
    res.json({ message: 'Uporabnik uspešno posodobljen' });
  } catch (error) {
    if (req.file) deleteFromCloudinary(req.file.filename);
    res.status(500).json({ error: 'Napaka pri posodobitvi uporabnika' });
  }
});

// DELETE /:id/profile-picture - delete user's profile picture
router.delete('/:id/profile-picture', isAuthenticated, async function(req, res, next) {
  const id = req.params.id;
  const userId = req.user.idUporabnik;
  
  // Only allow self-update or admin
  if (parseInt(userId, 10) !== parseInt(id, 10) && req.user.tip_uporabnika !== 'Administrator') {
    return res.status(403).json({ error: 'Nimate dovoljenja za odstranjevanje profilne slike tega uporabnika' });
  }

  try {
    const user = await Uporabnik.where({ idUporabnik: id }).fetch({ require: false });
    
    if (!user) {
      return res.status(404).json({ error: 'Uporabnik ni bil najden' });
    }
    
    // Delete existing image from Cloudinary if exists
    if (user.get('slika_id')) {
      await deleteFromCloudinary(user.get('slika_id'));
    }
    
    // Update user record to remove image references
    await user.save({
      slika: null,
      slika_id: null
    }, { patch: true });
    
    res.status(200).json({ message: 'Profilna slika je bila uspešno odstranjena' });
    
  } catch (error) {
    console.error('Error removing profile picture:', error);
    res.status(500).json({ error: 'Napaka pri odstranjevanju profilne slike' });
  }
});

// Public profile endpoint
router.get('/:id/public', async (req, res) => {
  try {
    const user = await Uporabnik.where({ idUporabnik: req.params.id }).fetch({
      require: false
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.toJSON());
  } catch (error) {
    res.status(500).json({ error: 'Napaka pri pridobivanju uporabnika!"' });
  }
});

// GET / - dobi vse uporabnike (samo admin)
router.get('/', isAdmin, async function(req, res, next) {
  try {
    const {
      search,
      tip_uporabnika,
      page = 1,
      limit = 12
    } = req.query;

    // Build base query
    let baseQuery = knex('uporabnik');

    // Apply filters
    if (search) {
      baseQuery = baseQuery.where(function() {
        this.where('ime', 'LIKE', `%${search}%`)
            .orWhere('priimek', 'LIKE', `%${search}%`);
      });
    }

    if (tip_uporabnika) {
      baseQuery = baseQuery.where('tip_uporabnika', tip_uporabnika);
    }

    // Get total count
    const [countResult] = await baseQuery.clone().count('* as total');
    const total = parseInt(countResult.total);

    // Get paginated results using Bookshelf
    const users = await Uporabnik.query(qb => {
      if (search) {
        qb.where(function() {
          this.where('ime', 'LIKE', `%${search}%`)
              .orWhere('priimek', 'LIKE', `%${search}%`);
        });
      }
      if (tip_uporabnika) {
        qb.where('tip_uporabnika', '=', tip_uporabnika);
      }
      // Apply ordering and pagination directly to the Knex query builder
      qb.orderBy('idUporabnik', 'DESC');
      qb.offset((page - 1) * limit);
      qb.limit(limit);
    }).fetchAll();

    res.json({
      users: users.toJSON(),
      total
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju vseh uporabnikov!' });
  }
});

// DELETE /:id/ban - admin lahko "bena" uporabnika
router.put('/ban/:id', isAdmin, async function(req, res, next) {
  try {
    const userId = req.params.id;
    const user = await Uporabnik.where({ idUporabnik: userId }).fetch({ require: false });
    if (!user) {
      return res.status(404).json({ error: 'Uporabnik ni najden' });
    }
    if (user.get('tip_uporabnika') === 'Administrator') {
      return res.status(403).json({ error: 'Administratorja ni mogoče blokirati ali odblokirati.' });
    }
    // Če je že blokiran, ga odblokiraj, sicer blokiraj
    const trenutnoBlokiran = user.get('is_banned');
    await user.save({ is_banned: !trenutnoBlokiran }, { patch: true });
    if (trenutnoBlokiran) {
      res.json({ message: 'Uporabnik je bil odblokiran.' });
    } else {
      res.json({ message: 'Uporabnik je bil blokiran.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Napaka pri bananju uporabnika!"' });
  }
});

// DELETE /:id - admin lahko izbriše uporabnika
router.delete('/:id', isAdmin, async function(req, res, next) {
  try {
    const userId = req.params.id;
    const user = await Uporabnik.where({ idUporabnik: userId }).fetch({ require: false });
    if (!user) {
      return res.status(404).json({ error: 'Uporabnik ni najden' });
    }
    if (user.get('tip_uporabnika') === 'Organizator') {
      // Preveri, če ima organizator dogodke
      const userWithDogodki = await Uporabnik.where({ idUporabnik: userId }).fetch({ withRelated: ['dogodki'], require: false });
      const dogodki = userWithDogodki.related('dogodki').toJSON();
      if (dogodki && dogodki.length > 0) {
        return res.status(403).json({ error: 'Organizatorja ni mogoče izbrisati, ker ima še vedno dogodke. Najprej izbrišite vse dogodke tega organizatorja.' });
      }
    }else if (user.get('tip_uporabnika') === 'Administrator') {
      return res.status(403).json({ error: 'Administratorja ni mogoče izbrisati.' });
    }
    // delete the image if it exists
    if (user.get('slika_id')) {
      deleteFromCloudinary(user.get('slika_id'));
    }
    await user.destroy();
    res.json({ message: 'Uporabnik je bil izbrisan.' });
  } catch (error) {
    res.status(500).json({ error: 'Napaka pri brisanju uporabnika!"' });
  }
});

router.post('/favorite_organizator/:id', isAuthenticated, async (req, res) => {
  try {
    const organizatorId = req.params.id;
    let userId = null;
    if (req.user)
    {
      userId = req.user.idUporabnik;
    }
    // Verify that the organizator exists
    const organizator = await Uporabnik.where({ idUporabnik: organizatorId }).fetch({ require: false });
    
    if (!organizator) {
      return res.status(404).json({ error: 'Organizator ni bil najden' });
    }

    // Verify if the organizator is actually an organizator or administrator
    if (organizator.get('tip_uporabnika') !== 'Organizator' && organizator.get('tip_uporabnika') !== 'Administrator') {
      return res.status(400).json({ error: 'Uporabnik ni organizator' });
    }
    
    // Check if the organizator is already in user's favorites
    const existingFavorite = await NajljubsiOrganizatorji
      .where({
        TK_uporabnik_organizator: organizatorId,
        TK_uporabnik: userId
      })
      .fetch({ require: false });
    
    if (existingFavorite) {
      return res.status(400).json({ error: 'Organizator je že med priljubljenimi' });
    }
    
    // Add organizator to user's favorites
    await NajljubsiOrganizatorji.forge({
      TK_uporabnik_organizator: organizatorId,
      TK_uporabnik: userId
    }).save();
    
    res.status(201).json({ 
      message: 'Organizator uspešno dodan med priljubljene'
    });
    
  } catch (error) {
    console.error('Error adding favorite organizer:', error);
    res.status(500).json({ error: 'Napaka pri dodajanju priljubljenega organizatorja' });
  }
});

router.delete('/favorite_organizator/:id', isAuthenticated, async (req, res) => {
  try {
    const organizatorId = req.params.id;
    let userId = null;
    if (req.user)
    {
      userId = req.user.idUporabnik;
    }
     
    // Find the najljubsi_organizator entry
    const favoriteEntry = await NajljubsiOrganizatorji
      .where({
        TK_uporabnik_organizator: organizatorId,
        TK_uporabnik: userId
      })
      .fetch({ require: false });
    
    if (!favoriteEntry) {
      return res.status(404).json({ error: 'Organizator ni med vašimi priljubljenimi' });
    }
    
    // Remove the favorite entry
    await favoriteEntry.destroy();
    
    res.json({ 
      message: 'Organizator uspešno odstranjen iz priljubljenih'
    });
    
  } catch (error) {
    console.error('Error removing favorite organizer:', error);
    res.status(500).json({ error: 'Napaka pri odstranjevanju priljubljenega organizatorja' });
  }
});

// Get favorite organizers for the logged-in user
router.get('/favorites/organizers', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.idUporabnik;
    const favoriteOrganizers = await NajljubsiOrganizatorji.where({ TK_uporabnik: userId })
      .fetchAll({
        withRelated: ['organizator'] // Assuming 'organizator' is the relation name in NajljubsiOrganizatorji model
      });
    
    // Extract organizer details from the fetched data
    const organizersDetails = favoriteOrganizers.map(fav => {
      if (fav.related('organizator')) {
        const orgData = fav.related('organizator').toJSON();
        // Ensure we don't send sensitive data like password
        delete orgData.geslo;
        return orgData;
      }
      return null;
    }).filter(org => org !== null);

    res.json(organizersDetails);
  } catch (error) {
    console.error('Error fetching favorite organizers:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju priljubljenih organizatorjev' });
  }
});

router.get('/statistics/:id', async function(req, res, next) {
  try {
    const userId = parseInt(req.params.id, 10);

    const user = await Uporabnik.where({ idUporabnik: userId }).fetch({ require: false });
    if (!user) {
      return res.status(404).json({ error: 'Uporabnik ni najden' });
    }

    // 1. Število prijavljenih dogodkov
    const attendedCount = await knex('prijava')
      .where('TK_uporabnik', userId)
      .count('* as count')
      .first();

    // 2. Število komentarjev
    const commentCount = await knex('komentar')
      .where('TK_uporabnik', userId)
      .count('* as count')
      .first();

    // 3. Število ocenjenih dogodkov
    const ratingCount = await knex('ocena')
      .where('TK_uporabnik', userId)
      .count('* as count')
      .first();

    // 4. Prijavljeni dogodki po kategorijah
    const eventsByCategory = await knex('prijava')
      .select('tip_dogodka.naziv as category')
      .count('* as count')
      .join('dogodek', 'prijava.TK_dogodek', 'dogodek.idDogodek')
      .join('tip_dogodka', 'dogodek.TK_tip_dogodka', 'tip_dogodka.idTip_dogodka')
      .where('prijava.TK_uporabnik', userId)
      .groupBy('tip_dogodka.naziv');

    // 5. Zadnjih 5 aktivnosti
    const recentActivity = await knex('prijava')
      .select(
        'dogodek.naziv as eventName',
        'naslov.obcina as city',
        'naslov.ulica as street',
        'dogodek.cas as date'
      )
      .join('dogodek', 'prijava.TK_dogodek', 'dogodek.idDogodek')
      .join('naslov', 'dogodek.TK_naslov', 'naslov.idNaslov')
      .where('prijava.TK_uporabnik', userId)
      .orderBy('dogodek.cas', 'desc')
      .limit(5);

    // Formatiranje datumov
    recentActivity.forEach(activity => {
      const eventDate = new Date(activity.date);
      const today = new Date();
      const diffTime = today - eventDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      activity.daysAgo = diffDays;
    });

    // Priprava podatkov po kategorijah
    const totalEvents = parseInt(attendedCount.count, 10);
    const categoryData = eventsByCategory.map(category => ({
      name: category.category,
      count: category.count,
      percentage: Math.round((category.count / totalEvents) * 100) || 0
    }));

    const statistics = {
      attended: totalEvents || 0,
      comments: parseInt(commentCount.count, 10) || 0,
      ratings: parseInt(ratingCount.count, 10) || 0,
      categories: categoryData,
      recentActivity: recentActivity
    };

    res.json(statistics);

  } catch (error) {
    console.error("Napaka pri pridobivanju statistike:", error);
    next(error);
  }
});

// Get public favorite organizers for a specific user by ID
router.get('/:userId/public/favorites/organizers', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Neveljaven ID uporabnika' });
    }

    // Optional: Check if user exists, though fetching favorites for a non-existent user will just return empty
    const userExists = await Uporabnik.where({ idUporabnik: userId }).fetch({ require: false });
    if (!userExists) {
      return res.status(404).json({ error: 'Uporabnik ni najden' });
    }

    const favoriteOrganizers = await NajljubsiOrganizatorji.where({ TK_uporabnik: userId })
      .fetchAll({
        withRelated: ['organizator'] 
      });
    
    const organizersDetails = favoriteOrganizers.map(fav => {
      if (fav.related('organizator')) {
        const orgData = fav.related('organizator').toJSON();
        delete orgData.geslo;
        return orgData;
      }
      return null;
    }).filter(org => org !== null);

    res.json(organizersDetails);
  } catch (error) {
    console.error('Error fetching public favorite organizers:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju javnih priljubljenih organizatorjev' });
  }
});

// GET /:userId/events - Get all events for a specific user (organizator)
router.get('/:userId/events', isAuthenticated, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Neveljaven ID uporabnika' });
    }

    // Ensure the requesting user is an admin or the user themselves (if they are an organizer)
    // This is a basic authorization, adjust as per your needs
    if (req.user.tip_uporabnika !== 'Administrator' && req.user.idUporabnik !== userId) {
        return res.status(403).json({ error: 'Nimate dovoljenja za dostop do teh dogodkov.' });
    }

    const user = await Uporabnik.where({ idUporabnik: userId }).fetch({ require: false });
    if (!user) {
      return res.status(404).json({ error: 'Uporabnik ni najden' });
    }

    // Only fetch events if the user is an Organizator or Administrator
    if (user.get('tip_uporabnika') !== 'Organizator' && user.get('tip_uporabnika') !== 'Administrator') {
      return res.json([]); // Return empty array if user is not an organizer/admin
    }

    const { Dogodek } = require('../models'); // Make sure Dogodek model is imported
    const events = await Dogodek.where({ TK_uporabnik: userId })
                                .fetchAll({ withRelated: ['naslov', 'tipDogodka'] }); // Include related data you need

    res.json(events.toJSON());
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju dogodkov uporabnika' });
  }
});

module.exports = router;
