module.exports = {
  mountConfig
}

function mountConfig() {
  require('dotenv').config({
    path: `./config/.env`
  });

  return {
    mongo : {
      "dbUri": process.env.dbUri,
      "dbName": process.env.dbName  
    },
    bot:{
      id: process.env.botId
    },
    cron: {
      "deleteCron": process.env.deleteCron
    }
  }

}