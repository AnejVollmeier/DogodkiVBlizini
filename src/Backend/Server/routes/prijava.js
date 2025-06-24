const express = require('express');
const router = express.Router();
const { Uporabnik, Dogodek, Prijava } = require('../models');
const { isAuthenticated } = require('../middleware/authMiddleware');

// POST /prijava - Create a new prijava for a dogodek
router.post('/', isAuthenticated, async function(req, res, next) {
    const { dogodekId } = req.body;
    const userId = req.user.idUporabnik;
  
    // Validation
    if (!dogodekId) {
      return res.status(400).json({ error: 'ID dogodka je obvezen' });
    }
  
    try {
      // Check if the event exists
      const dogodek = await Dogodek.where({ idDogodek: dogodekId }).fetch({ require: false });
      if (!dogodek) {
        return res.status(404).json({ error: 'Dogodek ni najden' });
      }
  
      // Check if the user is already registered for this event
      const existingPrijava = await Prijava.where({
        TK_dogodek: dogodekId,
        TK_uporabnik: userId
      }).fetch({ require: false });
  
      if (existingPrijava) {
        return res.status(400).json({ error: 'Uporabnik je že prijavljen na ta dogodek' });
      }
  
      // Check if user is banned
      const user = await Uporabnik.where({ idUporabnik: userId }).fetch({ require: false });
      if (user && user.get('is_banned')) {
        return res.status(403).json({ error: 'Vaš račun je blokiran. Prijava na dogodek ni mogoča.' });
      }
  
      // Create new prijava
      await Prijava.forge({
        TK_dogodek: dogodekId,
        TK_uporabnik: userId
      }).save();
  
      res.status(201).json({
        message: 'Prijava na dogodek uspešna'
      });
  
    } catch (error) {
      console.error("Napaka pri prijavi na dogodek:", error);
      next(error);
    }
  });
  
  // GET /prijava/user - Get all dogodki a user is registered for
  router.get('/user', isAuthenticated, async function(req, res, next) {
    const userId = req.user.idUporabnik;
  
    try {
      const prijave = await Prijava.where({ TK_uporabnik: userId })
        .fetchAll({ 
          withRelated: [
            'dogodek',
            'dogodek.naslov',
            'dogodek.tipDogodka'
          ] 
        });
      
      res.json(prijave);
    } catch (error) {
      console.error("Napaka pri pridobivanju prijav uporabnika:", error);
      next(error);
    }
  });

// DELETE /prijava/:dogodekId - Delete a prijava for a dogodek
router.delete('/:dogodekId', isAuthenticated, async function(req, res, next) {
    const dogodekId = req.params.dogodekId;
    const userId = req.user.idUporabnik;
  
    try {
      const prijava = await Prijava.where({
        TK_dogodek: dogodekId,
        TK_uporabnik: userId
      }).fetch({ require: false });
  
      if (!prijava) {
        return res.status(404).json({ error: 'Prijava ni najdena' });
      }
  
      await prijava.destroy();
      res.json({ message: 'Prijava je bila uspešno preklicana' });
  
    } catch (error) {
      console.error("Napaka pri preklicu prijave:", error);
      next(error);
    }
  });

  module.exports = router;
