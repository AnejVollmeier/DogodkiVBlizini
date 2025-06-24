const knex = require('../knex');
const bookshelf = require('bookshelf')(knex);

// Enable plugins
bookshelf.plugin('registry');
bookshelf.plugin('visibility');
bookshelf.plugin('pagination');

// Define models
const Uporabnik = bookshelf.model('Uporabnik', {
    tableName: 'uporabnik',
    idAttribute: 'idUporabnik',
    
    dogodki: function() {
        return this.hasMany('Dogodek', 'TK_uporabnik');
    },
    
    prijave: function() {
        return this.hasMany('Prijava', 'TK_uporabnik');
    }
});

const Dogodek = bookshelf.model('Dogodek', {
    tableName: 'dogodek',
    idAttribute: 'idDogodek',
    
    organizator: function() {
        return this.belongsTo('Uporabnik', 'TK_uporabnik');
    },
    
    naslov: function() {
        return this.belongsTo('Naslov', 'TK_naslov');
    },
    
    tipDogodka: function() {
        return this.belongsTo('TipDogodka', 'TK_tip_dogodka');
    },
    
    prijave: function() {
        return this.hasMany('Prijava', 'TK_dogodek');
    },
    
    cenik: function() {
        return this.hasMany('Cenik', 'TK_dogodek');
    }
});

const Naslov = bookshelf.model('Naslov', {
    tableName: 'naslov',
    idAttribute: 'idNaslov',
    
    dogodki: function() {
        return this.hasMany('Dogodek', 'TK_naslov');
    }
});

const TipDogodka = bookshelf.model('TipDogodka', {
    tableName: 'tip_dogodka',
    idAttribute: 'idTip_dogodka',
    
    dogodki: function() {
        return this.hasMany('Dogodek', 'TK_tip_dogodka');
    }
});

const Prijava = bookshelf.model('Prijava', {
    tableName: 'prijava',
    
    dogodek: function() {
        return this.belongsTo('Dogodek', 'TK_dogodek');
    },
    
    uporabnik: function() {
        return this.belongsTo('Uporabnik', 'TK_uporabnik');
    }
});

const Cenik = bookshelf.model('Cenik', {
    tableName: 'cenik',
    idAttribute: 'idCenik',
    
    dogodek: function() {
        return this.belongsTo('Dogodek', 'TK_dogodek');
    }
});

const NajljubsiDogodki = bookshelf.model('NajljubsiDogodki', {
    tableName: 'najljubsi_dogodki',
    
    dogodek: function() {
        return this.belongsTo('Dogodek', 'TK_dogodek');
    },
    
    uporabnik: function() {
        return this.belongsTo('Uporabnik', 'TK_uporabnik');
    }
});

const NajljubsiOrganizatorji = bookshelf.model('NajljubsiOrganizatorji', {
    tableName: 'najljubsi_organizator',
    idAttribute: 'idNajljubsiOrganizator',
    
    uporabnik: function() {
        return this.belongsTo('Uporabnik', 'TK_uporabnik');
    },
    
    organizator: function() {
        return this.belongsTo('Uporabnik', 'TK_uporabnik_organizator');
    }
});

module.exports = {
    Uporabnik,
    Dogodek,
    Naslov,
    TipDogodka,
    Prijava,
    Cenik,
    NajljubsiDogodki,
    NajljubsiOrganizatorji
};
