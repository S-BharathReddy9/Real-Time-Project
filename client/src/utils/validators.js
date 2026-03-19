export const validateEmail    = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const validatePassword = (p) => p.length >= 6;
export const validateUsername = (u) => /^[a-zA-Z0-9_]{3,20}$/.test(u);
