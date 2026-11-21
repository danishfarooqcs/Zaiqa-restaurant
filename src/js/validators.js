// src/js/validators.js

export const Validators = {
  // At least 2 words or 3+ letters, only letters, spaces, dots, hyphens
  validateName(name) {
    const clean = String(name || '').trim();
    if (clean.length < 3) {
      return { ok: false, msg: 'Please enter your full name (at least 3 characters).' };
    }
    if (!/^[a-zA-Z\s.'-]+$/.test(clean)) {
      return { ok: false, msg: 'Name can only contain letters and spaces.' };
    }
    return { ok: true, value: clean };
  },

  // Supports Pakistani mobile numbers (03XXXXXXXXX or +923XXXXXXXXX) and 10-15 digit numbers
  validatePhone(phone) {
    const compact = String(phone || '').replace(/[\s()-]/g, '');
    const pkMobile = /^(?:\+92|0092|0)?3\d{9}$/;
    const intlPhone = /^\+?\d{10,15}$/;

    if (!pkMobile.test(compact) && !intlPhone.test(compact)) {
      return {
        ok: false,
        msg: 'Enter a valid phone number (e.g. 03001234567 or +923001234567).',
      };
    }
    return { ok: true, value: compact };
  },

  // Requires meaningful length and at least one letter + one number or space (avoids "aaa" or "123")
  validateAddress(address) {
    const clean = String(address || '').trim();
    if (clean.length < 10) {
      return {
        ok: false,
        msg: 'Please enter a complete delivery address (house/street/area, at least 10 characters).',
      };
    }
    if (!/[a-zA-Z]{2,}/.test(clean) || !/\s/.test(clean)) {
      return {
        ok: false,
        msg: 'Include street, area, or city details in your delivery address.',
      };
    }
    return { ok: true, value: clean };
  },

  validateEmail(email) {
    const clean = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
      return { ok: false, msg: 'Please enter a valid email address.' };
    }
    return { ok: true, value: clean };
  },

  validatePassword(password) {
    const pw = String(password || '');
    if (pw.length < 6) {
      return { ok: false, msg: 'Password must be at least 6 characters long.' };
    }
    return { ok: true, value: pw };
  },
};