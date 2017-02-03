var configuration = {

  "server": {
    "port": 3001
  },

  "database": {
    "connectionString": "postgres://postgres:<YOUR_DATABSE_PASSWORD>@127.0.0.1:5432/<DATABASE_NAME>",
    "salt": {
      "prefix": "<PASSWORD_SALT_PREFIX>",
      "sufix" : "<PASSWORD_SALT_SUFIX>"
    }
  }

};

module.exports = configuration;