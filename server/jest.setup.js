// backend/jest.setup.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri()
  await mongoose.connect(mongoUri);
// console.log(In-memory MongoDB connected at ${mongoUri});
});

    // Clear all test data after every test.
    afterEach(async () => {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
    });

    afterAll(async () => {
      await mongoose.disconnect();
      await mongoServer.stop();
      // console.log('In-memory MongoDB disconnected and stopped.');
    });