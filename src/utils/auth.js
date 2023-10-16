import crypto from "crypto";
import Redis from "ioredis";
import { findRecord, createRecord } from "./db.js";

const redisClient = new Redis();

/*
 the password flow:
 when someone signs up, they enter their password twice. we check that the passwords match.
 then we hash their password using our secret key. we save the hashed password in the db.

 when someone logs in, we check the password hash against the password hash stored in the db for the user's email
if it matches, we create a new session key and store it in redis, with the user id as the value. we set it to expire after 24 hours.
we set a cookie header with that session key so the browser will continue to use that cookie

on each request, we read the session key from the user's cookie
we look it up in redis and get the user id
if we don't get a user id, we redirect to login page
*/
export async function handleLogin(Astro, email, password) {
  console.log("email", email);
  const existingUser = findRecord({
    table: "users",
    condition: { email },
  });

  if (!existingUser) {
    throw new Error("User with that email does not exist");
  }

  const isCorrectPassword = checkPassword(password, existingUser.password);

  if (isCorrectPassword) {
    const sessionKey = createSession(existingUser.id);
    setSessionCookie(Astro, sessionKey);
    return true;
  } else {
    throw new Error("Incorrect password");
  }
}

export async function handleLogout(Astro) {
  await deleteSession(Astro);
  deleteSessionCookie(Astro);
  return true;
}

export function createAdminUser(name, email, password) {
  if (!name) throw new Error("Admin name not set");
  if (!email) throw new Error("Admin email not set");
  if (!password) throw new Error("Admin password not set");
  // check if user exists with email
  const existingUser = findRecord({
    table: "users",
    condition: { email },
  });

  if (existingUser) {
    throw new Error("User with that email already exists");
  }

  const passwordHash = hashPassword(password);
  const newUser = createRecord("users", {
    name,
    email,
    password: passwordHash,
    is_admin: 1,
  });
  return newUser;
}

export function handleSignup(Astro, email, password, confirmPassword) {
  const passwordsMatch = password === confirmPassword;
  if (!passwordsMatch) {
    throw new Error("Passwords do not match");
  }

  // check if user exists with email
  const existingUser = findRecord({
    table: "users",
    condition: { email },
  });

  if (existingUser) {
    throw new Error("User with that email already exists");
  }

  // create user
  const passwordHash = hashPassword(password);
  const newUser = createRecord("users", {
    email,
    password: passwordHash,
    is_admin: 0,
  });

  // create session
  const sessionKey = createSession(newUser.id);
  setSessionCookie(Astro, sessionKey);

  return true;
}

export function hashPassword(password) {
  if (!password) {
    throw new Error("Password not set");
  }

  const secret =
    process.env.APP_HASHING_SECRET || import.meta.env.APP_HASHING_SECRET;

  if (!secret) {
    throw new Error("Hashing secret not set. Please set it in .env");
  }

  const passwordHash = crypto
    .createHmac("sha256", secret)
    .update(password)
    .digest("hex");

  return passwordHash;
}

function generateSessionKey() {
  return crypto.randomBytes(16).toString("hex");
}

export async function createSession(userId) {
  const sessionKey = generateSessionKey();
  await redisClient.set(sessionKey, userId, "EX", SEVEN_DAYS); // Set the session to expire in 24 hours
  return sessionKey;
}

export async function deleteSession(Astro) {
  const sessionKey = getSessionKeyFromAstro(Astro);
  await redisClient.del(sessionKey);
}

export async function getUserIdFromSessionKey(sessionKey) {
  if (!sessionKey) return null;
  return await redisClient.get(sessionKey);
}

export function checkPassword(suppliedPassword, passwordHash) {
  const suppliedHash = hashPassword(suppliedPassword);
  console.log("suppliedHash", suppliedHash);
  console.log("passwordHash", passwordHash);
  return suppliedHash === passwordHash;
}

const ONE_DAY_SECONDS = 60 * 60 * 24;
const SEVEN_DAYS = 7 * ONE_DAY_SECONDS;

export function deleteSessionCookie(Astro) {
  Astro.cookies.delete("astro-sqlite-tts-feed-session", {
    path: "/",
  });
}

export function setSessionCookie(Astro, sessionKey) {
  Astro.cookies.set("astro-sqlite-tts-feed-session", sessionKey, {
    maxAge: SEVEN_DAYS,
    path: "/",
    sameSite: "lax",
    secure: true,
    httpOnly: true,
  });
}
