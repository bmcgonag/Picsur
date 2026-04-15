const ParseBool = (value, fallback) => {
  if (value === true || value === 'true' || value === '1' || value === 'yes')
    return true;
  if (value === false || value === 'false' || value === '0' || value === 'no')
    return false;
  return fallback === undefined ? null : fallback;
};

const ParseBoolZ = (value) => ParseBool(value, null);

const ParseInt = (value, fallback) => {
  if (typeof value === 'number') return Math.round(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!isNaN(parsed)) return Math.round(parsed);
  }
  return fallback === undefined
    ? null
    : fallback === null
    ? fallback
    : Math.round(fallback);
};

const ParseIntZ = (value) => ParseInt(value, null);

const ParseString = (value, fallback) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return value.toString();
  return fallback === undefined ? null : fallback;
};

const ParseStringZ = (value) => ParseString(value, null);

module.exports = {
  ParseBool,
  ParseBoolZ,
  ParseInt,
  ParseIntZ,
  ParseString,
  ParseStringZ,
};
