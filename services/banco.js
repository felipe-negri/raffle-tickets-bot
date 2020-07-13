const { MongoClient, ObjectID } = require('mongodb');
  
  module.exports = {
    async abrirConexaoMongo(config) {
      console.log('Abrindo Conexão com o Mongo')
      return MongoClient.connect(config.mongo.dbUri, {useNewUrlParser : true,  useUnifiedTopology: true });
    },
    async atualizarComic(id, messageId, MongoClient) {
      const comics = MongoClient.db('e621').collection('comics');
      return comics.findOneAndUpdate({ id: id },{ $set: { published: true, telegram: { messageId: messageId, likes: 0}, 'oneDrive.actualFolder': 'published' }}).then(r => r.value);
    },
    async  fecharConexaoMongo(mongoClient) {
      console.log('Fechando Conexão Com o Banco de Dados...');
      return  await mongoClient.close();
    },
    async pegarTops(db) {
      const comics = db.collection('comics');
      return comics.find({ 'e621v2': true, 'ranking.rank': { $gte: 20 }, 'category': 'series',  'published': { $exists: false }, 'top': { $exists: false }, 'oneDrive.actualFolder' : { $exists: false } }).limit(50).sort({'ranking.rank': -1}).toArray();
    },
    async atualizarTop(id, db){
      const comics = db.collection('comics');
      return comics.findOneAndUpdate({'oneDrive.folderId': id}, { $set: {top: true}}).then(r => r.value);
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
    async dropTemp(db) {
      const temp = db.collection('temp');
      if(temp) {
        return db.collection('temp').drop();
      }
    },
    async verificaIdDisponivel(id, db) {
      const comics = db.collection('comics');
      const comic = await comics.findOne({id: id});
      if(!comic){
        return false;
      }
      return true;
    },
    async salvaComic(comic,db) {
      const comics = db.collection('comics');
      return comics.insertOne(comic);
    },
    async obterLog(log, db) {
      const logs = db.collection('logs');
      return logs.findOne({username: log.username, messageId: log.messageId})
    },
    async atualizarContador(messageId, count, db){
      const comics = db.collection('comics');
      return comics.findOneAndUpdate({'telegram.messageId': messageId}, {$set: {'telegram.likes': count}});
    },
    async deletarComic(comicId, db) {
      const comics = db.collection('comics');
      return comics.findOneAndUpdate({'id': comicId}, {$set: {'oneDrive.deleted': true, 'oneDrive.actualFolder': 'deleted'}});
    },
    async salvarLog(log, db) {
      const logs = db.collection('logs');
      return logs.insertOne(log);
    },
    async deletarLog(log, db) {
      const logs = db.collection('logs');
      return logs.deleteOne({_id: ObjectID(log._id)});
    },
    async getComicsquery(query, db) {
      const collection = db.collection('comics');
      return await collection.find(query).project({'id': 1}).toArray();
    },
    async  salvarComic(comic, db) {
      return new Promise(async (resolve, reject) => {
        try {
          
          const comics = db.collection('comics');
          //REFATORAR USANDO UPDATE COM UPSERT
          let comicExistente = await new Promise(async (resolve, reject) => {
              comics.findOne({
              'id': comic.id
            }, (err, item) => {
              if (err) reject(err);
    
              if (!item) {
                resolve();
              } else {
                resolve(item);
              }
            });
          });
    
          if (!comicExistente) {
            comics.insert(comic, undefined, (err, doc) => {
              if (err) {
                reject(err);
              }
              resolve(doc);
            });
          } else {
              comics.replaceOne({
              id: comic.id
            }, comic , (err, doc) => {
              if (err) {
                reject(err);
              }
              resolve(doc);
            });
          }
        } catch (error) {
          reject(error);
        }
      });
    },
    async  pegarComic(comic, db) {
      return new Promise(async (resolve, reject) => {
        try {
          const comics = db.collection('comics');
  
          comics.findOne({
            'id': comic.id
          }, (err, item) => {
            if (err) reject(err);
    
            if (!item) {
              resolve();
            } else {
              resolve(item);
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    },
  }
  