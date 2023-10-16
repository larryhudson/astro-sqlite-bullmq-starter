import { getUserIdFromSessionKey } from "./utils/auth";
import { findRecord } from "./utils/db";

// This function checks if a given URL matches a pattern.
function matchesPattern(url, pattern) {
  const regex = new RegExp(
    "^" + pattern.replace(/:[a-zA-Z0-9_]+/g, "([a-zA-Z0-9_-]+)") + "$",
  );
  return regex.test(url);
}

function urlIsPublic(url) {
  const publicUrls = ["/", "/auth/login/"];
  return publicUrls.includes(url);
}

function urlIsAdmin(url) {
  const adminUrls = ["/admin/"];
  return adminUrls.includes(url);
}

export async function onRequest(context, next) {
  const currentUrl = context.url.pathname;
  const isPublicUrl = urlIsPublic(currentUrl);

  if (isPublicUrl) {
    return next();
  }

  const sessionKey = context.cookies.get(
    "astro-sqlite-tts-feed-session",
  )?.value;
  const userId = await getUserIdFromSessionKey(sessionKey);

  const isLoggedIn = userId !== null;

  console.log();

  if (!isLoggedIn) {
    return context.redirect("/auth/login/");
  }

  const user = await findRecord({ table: "users", condition: { id: userId } });

  // check if approved_at is not null
  const userIsApproved = user?.approved_at !== null;

  if (!userIsApproved) {
    return context.redirect("/auth/waiting-room/");
  }

  const isAdminUrl = urlIsAdmin(currentUrl);
  const userIsAdmin = user?.is_admin === 1;

  if (isAdminUrl && !userIsAdmin) {
    return new Response(null, { status: 403, statusText: "Forbidden" });
  }

  // if we got here, the user is logged in and approved

  context.locals.userId = userId;

  // return a Response or the result of calling `next()`
  return next();
}
