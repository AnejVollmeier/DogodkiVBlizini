const knex = require('./knex');
const bookshelf = require('bookshelf')(knex);

const Uporabnik = bookshelf.model('Uporabnik', {
  tableName: 'uporabnik',
  idAttribute: 'idUporabnik',
  hidden: ['geslo'],
  dogodki() {
    return this.hasMany('Dogodek', 'TK_uporabnik');
  }
});

const Dogodek = bookshelf.model('Dogodek', {
  tableName: 'dogodek',
  naslov() {
    return this.belongsTo('Naslov', 'TK_naslov');
  },
  tipDogodka() {
    return this.belongsTo('TipDogodka', 'TK_tip_dogodka');
  },
  organizator() {
    return this.belongsTo('Uporabnik', 'TK_uporabnik');
  },
  cenik() {
    return this.hasMany('Cenik', 'TK_dogodek');
  },
    idAttribute: 'idDogodek'
});

const Naslov = bookshelf.model('Naslov', {
    tableName: 'naslov',
    idAttribute: 'idNaslov',
});

const TipDogodka = bookshelf.model('TipDogodka', {
    tableName: 'tip_dogodka',
    idAttribute: 'idTip_dogodka',
    dogodki() {
      return this.hasMany('Dogodek', 'TK_tip_dogodka');
    }
  });

const Komentar = bookshelf.model('Komentar', {
  tableName: 'komentar',
  idAttribute: 'idKomentar',
  uporabnik() {
    return this.belongsTo('Uporabnik', 'TK_uporabnik');
  },
  dogodek() {
    return this.belongsTo('Dogodek', 'TK_dogodek');
  }
});

const Ocena = bookshelf.model('Ocena', {
  tableName: 'ocena',
  idAttribute: 'idOcena',
  uporabnik() {
    return this.belongsTo('Uporabnik', 'TK_uporabnik');
  },
  dogodek() {
    return this.belongsTo('Dogodek', 'TK_dogodek');
  }
});

const Cenik = bookshelf.model('Cenik', {
  tableName: 'cenik',
  idAttribute: 'idCenik',
  dogodek() {
    return this.belongsTo('Dogodek', 'TK_dogodek');
  }
});

const Prijava = bookshelf.model('Prijava', {
  tableName: 'prijava',
  idAttribute: 'idPrijava',
  dogodek() {
    return this.belongsTo('Dogodek', 'TK_dogodek');
  },
  uporabnik() {
    return this.belongsTo('Uporabnik', 'TK_uporabnik');
  }
});

const NajljubsiDogodki = bookshelf.model('NajljubsiDogodki', {
    tableName: 'najljubsi_dogodki',
    idAttribute: 'idNajljubsiDogodek',
    dogodek() {
      return this.belongsTo('Dogodek', 'TK_dogodek');
    },
    uporabnik() {
      return this.belongsTo('Uporabnik', 'TK_uporabnik');
    }
  });

const NajljubsiOrganizatorji = bookshelf.model('NajljubsiOrganizatorji', {
    tableName: 'najljubsi_organizator',
    idAttribute: 'idNajljubsiOrganizator',
    organizator() {
      return this.belongsTo('Uporabnik', 'TK_uporabnik_organizator');
    },
    uporabnik() {
      return this.belongsTo('Uporabnik', 'TK_uporabnik');
    }
});

module.exports = { Uporabnik, Dogodek, Naslov, TipDogodka, Komentar, Ocena, Cenik, Prijava, NajljubsiDogodki, NajljubsiOrganizatorji};

