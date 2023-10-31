const DEBUG = false;

const REMOVE_ADS = true;
const REMOVE_CONSENT = true;
const REMOVE_TAGS = true;
const REMOVE_PUSH_NOTIFICATIONS = true;
const HIDE_INSTEAD_OF_REMOVE = true;

const CHECK_DELAY = 1000;

const CONTAINER_KEYWORDS = [
	"container",
	"content",
	"wrap",
	"wrapper",
	"unit",
	"popup",
	"slot",
	"item",
	"zone",
	"page",
	"module",
	"sidebar",
	"aside",
	"above",
	"below",
	"banner",
	"billboard",
	"hero",
	"styles",
	"bar",
	"widget",
	"iframe",
	"rail",
	"remote",
];

const AD_KEYWORDS = ["ad", "ads", "sponsored", "promo", "related", "trending"];
const AD_COMPANIES = ["google", "facebook", "taboola", "gpt", "cxense"];
const AD_REGEXS = [
	...generateCombos(AD_KEYWORDS, AD_COMPANIES, CONTAINER_KEYWORDS),
	/(fs-sidewall|fs-sticky)/i,
];

const CONSENT_KEYWORDS = [
	"consent",
	"cookie",
	"banner",
	"slidedown",
	"dialog",
	"newsletter",
	"campaign",
	"notice",
];
const CONSENT_COMPANIES = ["onetrust", "onesignal", "bx", "gdpr"];
const CONSENT_REGEXS = [
	...generateCombos(CONSENT_KEYWORDS, CONSENT_COMPANIES, CONTAINER_KEYWORDS),
	/(cconsent-bar|pmc-pp-tou--notice)/i,
];

const REMOVE_REASON = {
	TAG: "tag",
	AD: "ad",
	CONSENT: "consent",
};

let observer = null;
let timeout = 0;

//TODO: Google.com
//aria-label="Ads"

function generateCombos(primaryWords, ...secondaryWords) {
	const combos = [];
	const primaryLen = primaryWords.length;
	const secondary = secondaryWords.flat();
	const secondaryLen = secondary.length;
	for (let i = 0; i < primaryLen; i++) {
		const word1 = primaryWords[i];
		for (let j = 0; j < secondaryLen; j++) {
			const word2 = secondary[j];
			combos.push(
				//https://regex101.com/r/XT5ejX/2
				new RegExp(
					`(\\b|[-_]+)\\d?(${word1}[_-]*${word2}|${word2}[_-]*${word1})\\d?(\\b|[-_]+)`,
					"i"
				)
			);
		}
	}
	if (DEBUG) {
		console.log("generateCombos", combos);
	}
	return combos;
}

//Recursively traverse DOM
function traverseRemove(element) {
	const children = Array.from(element.children);
	const childrenLen = children.length;
	for (let i = 0; i < childrenLen; i++) {
		const child = children[i];
		const id = child.getAttribute("id");
		const classList = child.getAttribute("class");
		const searchString = `${id} ${classList}`;

		let shouldRemove = false;
		let reason = null;
		if (!shouldRemove) {
			if (REMOVE_TAGS && isBadTag(child.tagName)) {
				shouldRemove = true;
				reason = REMOVE_REASON.TAG;
			}
		}
		if (!shouldRemove) {
			if (REMOVE_ADS && isAd(searchString)) {
				shouldRemove = true;
				reason = REMOVE_REASON.AD;
			}
		}
		if (!shouldRemove) {
			if (REMOVE_CONSENT && isConsent(searchString)) {
				shouldRemove = true;
				reason = REMOVE_REASON.CONSENT;
			}
		}

		if (shouldRemove) {
			if (DEBUG) {
				console.log("traverseRemove - REMOVE", child);
			}
			if (HIDE_INSTEAD_OF_REMOVE && reason !== REMOVE_REASON.TAG) {
				if (child.getAttribute("data-removed") !== "true") {
					child.setAttribute("data-removed", "true");
					child.setAttribute("style", "display:none !important;");
				}
			} else {
				child.remove();
			}
		} else {
			traverseRemove(child);
		}
	}
}

function isBadTag(tagName) {
	return /(iframe|object|ins|applet|embed)/i.test(tagName);
}

function isAd(classList) {
	const adRegexsLen = AD_REGEXS.length;
	for (let i = 0; i < adRegexsLen; i++) {
		if (AD_REGEXS[i].test(classList)) {
			return true;
		}
	}
	return false;
}

function isConsent(classList) {
	const consentRegexsLen = CONSENT_REGEXS.length;
	for (let i = 0; i < consentRegexsLen; i++) {
		if (CONSENT_REGEXS[i].test(classList)) {
			return true;
		}
	}
	return false;
}

function handler_dom_change(mutations) {
	if (DEBUG) {
		console.log("handler_dom_change");
	}
	observer.disconnect();
	timeout = setTimeout(handler_timeout, CHECK_DELAY);
}

function handler_timeout() {
	if (DEBUG) {
		console.log("handler_timeout");
	}
	traverseRemove(document.body);

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});
}

function init() {
	if (REMOVE_PUSH_NOTIFICATIONS) {
		Notification.requestPermission = function () {
			console.warn("Notification.requestPermission is disabled");
		};
	}

	traverseRemove(document.body);

	observer = new MutationObserver(handler_dom_change);
	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});
}

function destroy() {
	observer.disconnect();
	observer = null;

	clearTimeout(timeout);
	timeout = 0;
}

init();
