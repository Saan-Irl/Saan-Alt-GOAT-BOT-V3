const axios = require("axios");

const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/**
 * Check whether a Facebook session cookie is still valid (logged in).
 *
 * Facebook retired the legacy `mbasic.facebook.com` endpoints that the old
 * implementation relied on, so it now probes the modern `facebook.com/settings`
 * page instead: an authenticated session is served the real settings page,
 * while an expired/invalid session is redirected to the login form.
 *
 * @param {string} cookie Cookie string as `c_user=123;xs=123;datr=123;` format
 * @param {string} userAgent User agent string
 * @returns {Promise<Boolean>} True if cookie is valid, false if not
 */
module.exports = async function (cookie, userAgent) {
	if (!cookie || !/c_user=/.test(cookie) || !/xs=/.test(cookie))
		return false;
	try {
		const response = await axios({
			url: "https://www.facebook.com/settings",
			method: "GET",
			headers: {
				cookie,
				"user-agent": userAgent || DEFAULT_UA,
				"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"accept-language": "en-US,en;q=0.9",
				"sec-fetch-dest": "document",
				"sec-fetch-mode": "navigate",
				"sec-fetch-site": "none",
				"upgrade-insecure-requests": "1"
			},
			maxRedirects: 5,
			validateStatus: () => true,
			timeout: 30000
		});

		const finalUrl = response.request?.res?.responseUrl || "";
		const html = typeof response.data === "string" ? response.data : "";

		// Redirected to login / checkpoint => session is no longer valid.
		if (/\/login|checkpoint|save-password-interstitial/i.test(finalUrl))
			return false;

		// Authenticated pages are large and expose account/settings actions.
		const looksLoggedIn =
			html.length > 20000 &&
			/\/logout|logout\.php|"logout"/i.test(html) &&
			!/name="email"\s|\/login\/\?/i.test(html);

		return looksLoggedIn;
	}
	catch (e) {
		return false;
	}
};
