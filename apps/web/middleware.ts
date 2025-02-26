import {
  ApiMiddleware,
  AppMiddleware,
  LinkMiddleware,
  RootMiddleware,
} from "#/lib/middleware";
import { parse } from "#/lib/middleware/utils";
import {
  ADMIN_HOSTNAMES,
  API_HOSTNAMES,
  APP_HOSTNAMES,
  DEFAULT_REDIRECTS,
} from "@dub/utils";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import AdminMiddleware from "./lib/middleware/admin";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api/ routes
     * 2. /_next/ (Next.js internals)
     * 3. /_proxy/ (special page for OG tags proxying)
     * 4. /_static (inside /public)
     * 5. /_vercel (Vercel internals)
     * 6. /favicon.ico, /sitemap.xml, /robots.txt (static files)
     */
    "/((?!api/|_next/|_proxy/|_static|_vercel|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { domain, path, key } = parse(req);

  // for App
  if (APP_HOSTNAMES.has(domain)) {
    return AppMiddleware(req);
  }

  // for API
  if (API_HOSTNAMES.has(domain)) {
    return ApiMiddleware(req);
  }

  // for public stats pages (e.g. vercel.fyi/stats/roomGPT)
  if (key === "stats") {
    return NextResponse.rewrite(new URL(`/${domain}${path}`, req.url));
  }

  if (domain === "dub.sh" && DEFAULT_REDIRECTS[key]) {
    return NextResponse.redirect(DEFAULT_REDIRECTS[key]);
  }

  // for Admin
  if (ADMIN_HOSTNAMES.has(domain)) {
    return AdminMiddleware(req);
  }

  // for root pages (e.g. dub.co, vercel.fyi, etc.)
  if (key.length === 0) {
    return RootMiddleware(req, ev);
  }

  return LinkMiddleware(req, ev);
}
