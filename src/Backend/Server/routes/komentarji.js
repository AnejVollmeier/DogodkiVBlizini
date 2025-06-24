const express = require('express');
const router = express.Router();
const { Komentar, Uporabnik} = require('../models');
const { isAuthenticated, isOrganizator, isAdmin} = require('../middleware/authMiddleware');

// GET /id_dogodka=ID - vrne vse komentarje za dogodek
router.get('/', async (req, res) => {
    const { id_dogodka } = req.query;
    if (!id_dogodka) {
        return res.status(400).json({ error: 'Manjka id_dogodka' });
    }
    try {
        const komentarji = await Komentar.query(qb => {
            qb.where('TK_dogodek', id_dogodka);
        }).fetchAll({
            withRelated: ['uporabnik'],
            require: false
        });
        
        res.json(komentarji);
    } catch (err) {
        console.error('Error fetching comments:', err);
        res.status(500).json({ error: 'Napaka pri pridobivanju komentarjev' });
    }
});

// POST / - doda komentar (potreben token)
router.post('/', isAuthenticated, async (req, res) => {
    const { komentar, id_dogodka} = req.body;

    if (!komentar || !id_dogodka) {
        return res.status(400).json({ error: 'Manjkajo podatki' });
    }

    if (!req.user) {
        return res.status(403).json({ error: 'Uporabnik ni prijavljen' });
    }

    // Check if user is banned
    const user = await Uporabnik.where({ idUporabnik: req.user.idUporabnik }).fetch({ require: false });
    if (user && user.get('is_banned')) {
        return res.status(403).json({ error: 'Vaš račun je blokiran. Komentiranje dogodka ni mogoče.' });
    }

    try {
        // Create new komentar
        await Komentar.forge({
            text_uporabnika: komentar,
            TK_dogodek: id_dogodka,
            TK_uporabnik: req.user.idUporabnik
        }).save();
        res.status(201).json({ message: 'Komentar uspešno dodan' });
    } catch (err) {
        res.status(500).json({ error: 'Napaka pri dodajanju komentarja' });
    }
});

// DELETE /user/:id - omogoča uporabnikom brisanje lastnih komentarjev
router.delete('/user/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        // Find komentar by id
        const komentar = await Komentar.where({ idKomentar: id }).fetch({ require: false });

        if (!komentar) {
          return res.status(404).json({ error: 'Komentar ni bil najden' });
        }

        
        if (komentar.get('TK_uporabnik') !== req.user.idUporabnik) {
            return res.status(403).json({ error: 'Lahko izbrišete samo lastne komentarje' });
        }
          // Check if user is banned
        const user = await Uporabnik.where({ idUporabnik: req.user.idUporabnik }).fetch({ require: false });
        if (user && user.get('is_banned')) {
            return res.status(403).json({ error: 'Vaš račun je blokiran. Komentiranje dogodka ni mogoče.' });
        }

        await komentar.destroy();        
        res.json({ success: true, message: 'Komentar uspešno izbrisan' });
    } catch (err) {
        res.status(500).json({ error: 'Napaka pri brisanju komentarja' });
    }
});

// DELETE /:id - izbriše komentar po id-ju (organizatorji in administratorji)
router.delete('/:id', isAuthenticated, async (req, res) => {
    
    if (req.user.tip_uporabnika !== 'Organizator' && req.user.tip_uporabnika !== 'Administrator') {
        return res.status(403).json({ error: 'Nimate pravic za brisanje tega komentarja' });
    }
    const { id } = req.params;
    try {
   
        const komentar = await Komentar.where({ idKomentar: id }).fetch({ require: false });

        if (!komentar) {
          return res.status(404).json({ error: 'Komentar ni bil najden' });
        }

        await komentar.destroy();

        res.json({ success: true, message: 'Komentar uspešno izbrisan' });
    } catch (err) {
        console.error('Error deleting comment:', err);
        res.status(500).json({ error: 'Napaka pri brisanju komentarja' });
    }
});


// PUT /user/:id - omogoča uporabnikom urejanje lastnih komentarjev
router.put('/user/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { komentar } = req.body;

    if (!komentar) {
        return res.status(400).json({ error: 'Manjka besedilo komentarja' });
    }

    try {
        
        const komentarObj = await Komentar.where({ idKomentar: id }).fetch({ require: false });

        if (!komentarObj) {
          return res.status(404).json({ error: 'Komentar ni bil najden' });
        }

        
        if (komentarObj.get('TK_uporabnik') !== req.user.idUporabnik) {
            return res.status(403).json({ error: 'Lahko urejate samo lastne komentarje' });
        }
          // Check if user is banned
        const user = await Uporabnik.where({ idUporabnik: req.user.idUporabnik }).fetch({ require: false });
        if (user && user.get('is_banned')) {
            return res.status(403).json({ error: 'Vaš račun je blokiran. Komentiranje dogodka ni mogoče.' });
        }

        
        await komentarObj.save({ text_uporabnika: komentar }, { method: 'update' });

        res.json({ success: true, message: 'Komentar uspešno posodobljen' });    
    } catch (err) {
        res.status(500).json({ error: 'Napaka pri urejanju komentarja' });
    }
});

// PUT /:id - omogoča organizatorjem in administratorjem urejanje kateregakoli komentarja
router.put('/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { komentar } = req.body;

    
    if (req.user.tip_uporabnika !== 'Organizator' && req.user.tip_uporabnika !== 'Administrator') {
        return res.status(403).json({ error: 'Nimate pravic za urejanje tega komentarja' });
    }

    if (!komentar) {
        return res.status(400).json({ error: 'Manjka besedilo komentarja' });
    }

    try {
        
        const komentarObj = await Komentar.where({ idKomentar: id }).fetch({ require: false });

        if (!komentarObj) {
          return res.status(404).json({ error: 'Komentar ni bil najden' });
        }

        
        await komentarObj.save({ text_uporabnika: komentar }, { method: 'update' });

        res.json({ success: true, message: 'Komentar uspešno posodobljen' });
    } catch (err) {
        res.status(500).json({ error: 'Napaka pri urejanju komentarja' });
    }
});

module.exports = router;