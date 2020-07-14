const cron = require('node-cron');
const config = require('./services/config').mountConfig();
console.log('CRONS ATIVADOS');

const banco = require('./services/banco');

cron.schedule(config.cron.deleteCron, async () => {
    const mongoDb = await banco.abrirConexaoMongo(config);
    const db = await mongoDb.db(config.mongo.dbName);
    await banco.delFinished(db);
    await banco.fecharConexaoMongo(mongoDb);
}, {
  scheduled: true,
  timezone: "America/Sao_Paulo"
});
