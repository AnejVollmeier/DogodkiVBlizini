const express = require('express');
const router = express.Router();
const { Ocena, Uporabnik } = require('../models');
const { isAuthenticated } = require('../middleware/authMiddleware');

// GET /?id_dogodka=ID - vrne vse ocene za dogodek
router.get('/', async (req, res) => {
    const { id_dogodka } = req.query;
    if (!id_dogodka) {
        return res.status(400).json({ error: 'Manjka id_dogodka' });
    }
    try {
        const ocene = await Ocena.query(qb => {
            qb.where('TK_dogodek', id_dogodka);
        }).fetchAll({ require: false });
        res.json(ocene);
    } catch (err) {
        res.status(500).json({ error: 'Napaka pri pridobivanju ocen' });
    }
});

// POST / - doda oceno (potreben token, samo prijavljeni)
router.post('/', isAuthenticated, async (req, res) => {
    const { ocena, id_dogodka } = req.body;
    if (!ocena || !id_dogodka) {
        return res.status(400).json({ error: 'Manjkajo podatki' });
    }   

    if (!req.user) {
        return res.status(403).json({ error: 'Uporabnik ni prijavljen' });
    }

    // Check if user is banned
    const user = await Uporabnik.where({ idUporabnik: req.user.idUporabnik }).fetch({ require: false });
    if (user && user.get('is_banned')) {
        return res.status(403).json({ error: 'Vaš račun je blokiran. Ocenjevanje dogodka ni mogoče.' });
    }

    try {
        // Preveri, če uporabnik že ima oceno za ta dogodek
        const obstojecaOcena = await Ocena.query(qb => {
            qb.where({
                'TK_dogodek': id_dogodka,
                'TK_uporabnik': req.user.idUporabnik
            });
        }).fetch({ require: false });
        
        if (obstojecaOcena) {
            return res.status(400).json({ error: 'Uporabnik je že ocenil ta dogodek' });
        }
        
        await Ocena.forge({
            ocena: ocena,
            TK_dogodek: id_dogodka,
            TK_uporabnik: req.user.idUporabnik
        }).save();
        res.status(201).json({ message: 'Ocena uspešno dodana' });
    } catch (err) {
        console.error('Napaka pri dodajanju ocene:', err);
        res.status(500).json({ error: 'Napaka pri dodajanju ocene' });
    }
});

// PUT /:id - posodobi oceno (potreben token, samo lastnik ocene)
router.put('/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { ocena } = req.body;
    
    if (!ocena) {
        return res.status(400).json({ error: 'Manjkajo podatki' });
    }
    
    if (!req.user) {
        return res.status(403).json({ error: 'Uporabnik ni prijavljen' });
    }
    
    try {
        // Pridobi obstoječo oceno
        const obstojecaOcena = await Ocena.where({ idOcena: id }).fetch({ require: false });
        
        if (!obstojecaOcena) {
            return res.status(404).json({ error: 'Ocena ne obstaja' });
        }
        
        // Preveri, če je uporabnik lastnik ocene
        if (obstojecaOcena.get('TK_uporabnik') !== req.user.idUporabnik) {
            return res.status(403).json({ error: 'Nimate dovoljenja za posodobitev te ocene' });
        }

        // Check if user is banned
        const user = await Uporabnik.where({ idUporabnik: req.user.idUporabnik }).fetch({ require: false });
        if (user && user.get('is_banned')) {
            return res.status(403).json({ error: 'Vaš račun je blokiran. Ocenjevanje dogodka ni mogoče.' });
        }
        
        // Posodobi oceno
        await obstojecaOcena.save({ ocena }, { method: 'update' });
        
        res.json({ message: 'Ocena uspešno posodobljena' });
    } catch (err) {
        console.error('Napaka pri posodabljanju ocene:', err);
        res.status(500).json({ error: 'Napaka pri posodabljanju ocene' });
    }
});

// DELETE /:id - izbriše oceno (potreben token, samo lastnik ocene)
router.delete('/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    
    if (!req.user) {
        return res.status(403).json({ error: 'Uporabnik ni prijavljen' });
    }
    
    try {
        // Pridobi obstoječo oceno
        const obstojecaOcena = await Ocena.where({ idOcena: id }).fetch({ require: false });
        
        if (!obstojecaOcena) {
            return res.status(404).json({ error: 'Ocena ne obstaja' });
        }
        
        // Preveri, če je uporabnik lastnik ocene
        if (obstojecaOcena.get('TK_uporabnik') !== req.user.idUporabnik) {
            return res.status(403).json({ error: 'Nimate dovoljenja za izbris te ocene' });
        }
  
        // Check if user is banned
        const user = await Uporabnik.where({ idUporabnik: req.user.idUporabnik }).fetch({ require: false });
        if (user && user.get('is_banned')) {
            return res.status(403).json({ error: 'Vaš račun je blokiran. Brisanje komentarjev ni mogoče.' });
        }

        // Izbriši oceno
        await obstojecaOcena.destroy();
        
        res.json({ message: 'Ocena uspešno izbrisana' });
    } catch (err) {
        console.error('Napaka pri brisanju ocene:', err);
        res.status(500).json({ error: 'Napaka pri brisanju ocene' });
    }
});

module.exports = router;
