require('dotenv').config();

// DEV
module.exports = {
  client: 'mysql2',
  connection: {
    host: 'localhost',
    user: 'root',
    password: "anej", 
    database: 'dogodkivmojiblizini',
    port: 3306,
    charset: "utf8mb4_unicode_ci"
  },
  migrations: {
    tableName: 'knex_migrations',
  },
};

//PRODUCTION
// module.exports = {
//   client: 'mysql2',
//   connection: {
//     host: 'nuepp3ddzwtnggom.chr7pe7iynqr.eu-west-1.rds.amazonaws.com',
//     user: 'm5onru2a257fq1fq',
//     password: process.env.MYSQL_PASS_PROD, 
//     database: 'o1q0o1h21d65u8ns',
//     port: 3306,
//     charset: 'utf8',
//   },
//   migrations: {
//     tableName: 'knex_migrations',
//   },
// };

