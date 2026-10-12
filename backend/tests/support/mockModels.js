// Swap the Mongoose models for in-memory fakes in every test file.
jest.mock('../../src/models/User', () => require('./fakeModels').User);
jest.mock('../../src/models/Gig', () => require('./fakeModels').Gig);
jest.mock('../../src/models/Booking', () => require('./fakeModels').Booking);
jest.mock('../../src/models/Transaction', () => require('./fakeModels').Transaction);

beforeEach(() => {
  Object.values(require('./fakeModels')).forEach((model) => model.__reset());
});
