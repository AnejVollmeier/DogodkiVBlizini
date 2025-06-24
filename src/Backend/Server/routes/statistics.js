const express = require('express');
const router = express.Router();
const { Uporabnik, Dogodek, Naslov } = require('../models');

router.get('/', async (req, res) => {
    try {
        // Get current date and date 1 year ago
        const currentDate = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(currentDate.getFullYear() - 1);
        
        // Count all users
        const totalUsers = await Uporabnik.query(qb => {
            qb.count('* as count');
        }).fetch();
        
        // Count organizers
        const organizersCount = await Uporabnik.query(qb => {
            qb.where('tip_uporabnika', 'Organizator')
              .count('* as count');
        }).fetch();
        
        // Count events in the last year
        const eventsLastYear = await Dogodek.query(qb => {
            qb.where('cas', '>=', oneYearAgo)
              .count('* as count');
        }).fetch();
        
        // Count unique cities
        const cities = await Naslov.query(qb => {
            qb.countDistinct('obcina as count');
        }).fetch();
        
        // Return the statistics
        res.json({
            totalUsers: parseInt(totalUsers.get('count'), 10) || 0,
            organizersCount: parseInt(organizersCount.get('count'), 10) || 0,
            eventsLastYear: parseInt(eventsLastYear.get('count'), 10) || 0,
            cities: parseInt(cities.get('count'), 10) || 0
        });
        
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju statistik' });
    }
});

module.exports = router;
