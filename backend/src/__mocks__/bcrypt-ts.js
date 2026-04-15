const bcrypt = {
  compare: jest.fn().mockImplementation((password, _hash) => {
    if (password === 'password123' || password === 'adminpassword') {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }),
};

module.exports = bcrypt;
module.exports.hash = jest.fn().mockResolvedValue('$2b$12$hashedpassword');
module.exports.compare = bcrypt.compare;
