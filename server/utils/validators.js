exports.validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
exports.validateUsername = (username) => /^[a-zA-Z0-9_]{3,20}$/.test(username);
exports.validatePassword = (password) => password.length >= 6;
