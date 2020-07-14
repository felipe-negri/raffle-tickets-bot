const { MongoClient, ObjectID } = require('mongodb');
  
  module.exports = {
    async abrirConexaoMongo(config) {
      console.log('Abrindo Conexão com o Mongo')
      return MongoClient.connect(config.mongo.dbUri, {useNewUrlParser : true,  useUnifiedTopology: true });
    },
    async  fecharConexaoMongo(mongoClient) {
      console.log('Fechando Conexão Com o Banco de Dados...');
      return  await mongoClient.close();
    },
    async inicializarTemp(doc, stage, db) {
      const temp = db.collection('temp');
      console.log(doc)
      return temp.findOneAndUpdate({'ids': [doc.message_id]}, { $set: {ids: [doc.message_id], stage: stage}}, {upsert:true});
    },
    async obterTemporario(id, db) {
      const temp = db.collection('temp');
      return temp.findOne({ids: { $all: [id]}});
    },
    async atualizarTemp(doc, db) {
      const temp = db.collection('temp');
      return temp.replaceOne({_id: ObjectID(doc._id)}, doc);
    },
    async delTemp(db, temporario) {
      const temp = db.collection('temp');
      await temp.deleteOne({_id: ObjectID(temporario._id)});
    },
    async delFinished(db){
      const raffles = db.collection('raffles');
      await raffles.deleteMany({winner:{$exists: true}})
    }
  }
  