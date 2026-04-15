const bcrypt = {
  compare: jest.fn().mockImplementation((password, _hash) => {
    if (password === 'password123' || password === 'adminpassword') {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }),
};

export default bcrypt;
export const hash = jest.fn().mockResolvedValue('$2b$12$hashedpassword');
export const compare = bcrypt.compare;
