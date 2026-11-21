// src/js/auth.js
import { Validators } from "./validators.js";

const USERS_KEY = "restro_users_v1";
const CURRENT_USER_KEY = "restro_current_user_v1";
const ADMIN_AUTH_KEY = "restro_admin_auth_v1";
const CODE_KEY = "restro_otp_codes_v1";

// Paste your real EmailJS credentials here
const EMAILJS_CONFIG = {
  publicKey: "YOUR_EMAILJS_PUBLIC_KEY",
  serviceId: "YOUR_EMAILJS_SERVICE_ID",
  templateId: "YOUR_EMAILJS_TEMPLATE_ID",
};

const DEFAULT_ADMIN = {
  email: "danishfarooq.cs@gmail.com",
  password: "zaiqateamemerson@786",
};

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCodes() {
  return JSON.parse(localStorage.getItem(CODE_KEY) || "{}");
}

function saveCodes(codes) {
  localStorage.setItem(CODE_KEY, JSON.stringify(codes));
}

export const Auth = {
  getAdminAccount() {
    const saved = JSON.parse(
      localStorage.getItem("restro_admin_account_v1") || "null",
    );
    return saved || { ...DEFAULT_ADMIN };
  },

  loginAdmin(email, password) {
    const admin = this.getAdminAccount();
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();
    if (
      cleanEmail === admin.email.toLowerCase() &&
      password === admin.password
    ) {
      sessionStorage.setItem(ADMIN_AUTH_KEY, "true");
      return { ok: true };
    }
    return { ok: false, msg: "Invalid admin email or password." };
  },

  isAdminLoggedIn() {
    return sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";
  },

  logoutAdmin() {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
  },

  async sendVerificationCode(targetEmail, purpose = "reset") {
    const check = Validators.validateEmail(targetEmail);
    if (!check.ok) return { ok: false, msg: check.msg };

    if (
      !EMAILJS_CONFIG.publicKey ||
      EMAILJS_CONFIG.publicKey.startsWith("YOUR_")
    ) {
      return {
        ok: false,
        msg: "EmailJS keys not configured in src/js/auth.js yet.",
      };
    }

    // For admin reset, verify email matches admin email before sending
    if (purpose === "admin-reset") {
      const admin = this.getAdminAccount();
      if (check.value !== admin.email.toLowerCase()) {
        return {
          ok: false,
          msg: "Email does not match the registered Admin account.",
        };
      }
    }

    // For user reset, verify user exists before sending
    if (purpose === "user-reset") {
      const exists = getUsers().some((u) => u.email === check.value);
      if (!exists) {
        return { ok: false, msg: "No customer account found with this email." };
      }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));

    try {
      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: EMAILJS_CONFIG.serviceId,
          template_id: EMAILJS_CONFIG.templateId,
          user_id: EMAILJS_CONFIG.publicKey,
          template_params: {
            to_email: check.value,
            otp_code: code,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to send email");
      }

      const codes = getCodes();
      codes[`${purpose}:${check.value}`] = {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000,
      };
      saveCodes(codes);

      return {
        ok: true,
        msg: `Verification code sent to ${check.value}. Check your inbox/spam.`,
      };
    } catch (err) {
      return {
        ok: false,
        msg: `Could not send email (${err.message}). Verify your EmailJS Service ID, Template ID, and Public Key.`,
      };
    }
  },

  verifyCode(targetEmail, code, purpose = "reset") {
    const cleanEmail = String(targetEmail || "")
      .trim()
      .toLowerCase();
    const codes = getCodes();
    const entry = codes[`${purpose}:${cleanEmail}`];
    if (!entry)
      return {
        ok: false,
        msg: 'No code requested for this email. Click "Send Code" first.',
      };
    if (Date.now() > entry.expiresAt)
      return { ok: false, msg: "Code expired. Request a new one." };
    if (entry.code !== String(code || "").trim())
      return { ok: false, msg: "Incorrect verification code." };
    return { ok: true };
  },

  clearCode(targetEmail, purpose = "reset") {
    const cleanEmail = String(targetEmail || "")
      .trim()
      .toLowerCase();
    const codes = getCodes();
    delete codes[`${purpose}:${cleanEmail}`];
    saveCodes(codes);
  },

  resetAdminPassword(email, code, newPassword) {
    const admin = this.getAdminAccount();
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();
    if (cleanEmail !== admin.email.toLowerCase()) {
      return { ok: false, msg: "Email does not match Admin account." };
    }
    const pwCheck = Validators.validatePassword(newPassword);
    if (!pwCheck.ok) return pwCheck;

    const codeCheck = this.verifyCode(cleanEmail, code, "admin-reset");
    if (!codeCheck.ok) return codeCheck;

    localStorage.setItem(
      "restro_admin_account_v1",
      JSON.stringify({ email: admin.email, password: pwCheck.value }),
    );
    this.clearCode(cleanEmail, "admin-reset");
    return { ok: true, msg: "Admin password updated! Please log in." };
  },

  // --- USER AUTH ---
  signupUser({ name, email, phone, address, password }) {
    const nameCheck = Validators.validateName(name);
    if (!nameCheck.ok) return nameCheck;

    const emailCheck = Validators.validateEmail(email);
    if (!emailCheck.ok) return emailCheck;

    const phoneCheck = Validators.validatePhone(phone);
    if (!phoneCheck.ok) return phoneCheck;

    const addrCheck = Validators.validateAddress(address);
    if (!addrCheck.ok) return addrCheck;

    const pwCheck = Validators.validatePassword(password);
    if (!pwCheck.ok) return pwCheck;

    const users = getUsers();
    if (users.some((u) => u.email === emailCheck.value)) {
      return {
        ok: false,
        msg: "This email is already registered. Please log in instead.",
      };
    }

    const newUser = {
      id: "usr_" + Date.now(),
      name: nameCheck.value,
      email: emailCheck.value,
      phone: phoneCheck.value,
      address: addrCheck.value,
      password: pwCheck.value,
    };

    users.push(newUser);
    saveUsers(users);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    return { ok: true, user: newUser };
  },

  loginUser(email, password) {
    const emailCheck = Validators.validateEmail(email);
    if (!emailCheck.ok) return emailCheck;

    const user = getUsers().find((u) => u.email === emailCheck.value);
    if (!user)
      return {
        ok: false,
        msg: "No account found with this email. Please sign up.",
      };
    if (user.password !== password)
      return { ok: false, msg: "Incorrect password." };

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return { ok: true, user };
  },

  resetUserPassword(email, code, newPassword) {
    const emailCheck = Validators.validateEmail(email);
    if (!emailCheck.ok) return emailCheck;

    const pwCheck = Validators.validatePassword(newPassword);
    if (!pwCheck.ok) return pwCheck;

    const users = getUsers();
    const idx = users.findIndex((u) => u.email === emailCheck.value);
    if (idx === -1)
      return { ok: false, msg: "No user account found with that email." };

    const codeCheck = this.verifyCode(emailCheck.value, code, "user-reset");
    if (!codeCheck.ok) return codeCheck;

    users[idx].password = pwCheck.value;
    saveUsers(users);
    this.clearCode(emailCheck.value, "user-reset");
    return {
      ok: true,
      msg: "Password reset! Please log in with your new password.",
    };
  },

  getCurrentUser() {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
  },

  logoutUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
  },
};
