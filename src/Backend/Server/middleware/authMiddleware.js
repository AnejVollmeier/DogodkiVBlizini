const jwt = require('jsonwebtoken');
const { Uporabnik } = require('../models'); 
require('dotenv').config();

async function getUserFromToken(token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = null;
    if (decoded) {
        if (decoded.idUporabnik) {
            user = await Uporabnik
            .where({ idUporabnik: decoded.idUporabnik })
            .fetch({ require: false });
        }
    }
    return user;
}

const isAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Dostop zavrnjen' });
        }
        const user = await getUserFromToken(token);

        const userType = user.get('tip_uporabnika');

        if (userType !== 'Administrator') {
            return res.status(403).json({ error: 'Zahtevane so administratorske pravice' });
        }

        req.user = user.toJSON();
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Neveljaven žeton' });
    }
};

const isOrganizator = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Dostop zavrnjen' });

        const user = await getUserFromToken(token);
        
        if (!user) {
            return res.status(404).json({ error: 'Uporabnik ni najden' });
        }
          
        const userType = user.get('tip_uporabnika');
          
        if (userType !== 'Organizator' && userType !== 'Administrator') {
            return res.status(403).json({ error: 'Zahtevane so organizatorske pravice' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Neveljaven žeton' });
    }
};

const isAuthenticated = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Dostop zavrnjen' });
        }

        const user = await getUserFromToken(token);

        if (!user) {
            return res.status(401).json({ error: 'Uporabnik ne obstaja' });
        }

        req.user = user.toJSON();
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Neveljaven žeton' });
    }
};


module.exports = {
    isAdmin,
    isOrganizator,
    isAuthenticated,
    getUserFromToken
};