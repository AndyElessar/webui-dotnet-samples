//#region node_modules/@microsoft/webui-framework/dist/template.js
function getTemplate(name) {
	return window.__webui?.templates?.[name];
}
//#endregion
//#region node_modules/@microsoft/webui-framework/dist/lifecycle.js
/**
* Hydration lifecycle tracker.
*
* Tracks aggregate hydration timing via the Performance API and fires a
* global `webui:hydration-complete` event on `window` once every registered
* component has finished hydrating.
*
* ## Performance marks
*
* Global:
* - `webui:hydrate:total:start`  — first component begins hydrating
* - `webui:hydrate:total:end`    — last component finishes
* - measure `webui:hydrate:total`
*
* ## Window event
*
* `webui:hydration-complete` — dispatched once on `window` when all
* components are hydrated.
*/
/** How many components are still waiting to hydrate. */
let pendingCount = 0;
/** Whether the global start mark has been placed. */
let started = false;
/** Whether the global complete event has already fired. */
let completed = false;
/**
* Call before a component begins hydration.
* Increments the pending counter and (once) places the global start mark.
*/
function hydrationStart() {
	if (!started) {
		performance.mark("webui:hydrate:total:start");
		started = true;
	}
	pendingCount++;
}
/**
* Call after a component has finished hydration.
* When the last component finishes, fires the global event + measure.
*/
function hydrationEnd() {
	pendingCount--;
	if (pendingCount <= 0 && !completed) {
		completed = true;
		performance.mark("webui:hydrate:total:end");
		performance.measure("webui:hydrate:total", "webui:hydrate:total:start", "webui:hydrate:total:end");
		window.dispatchEvent(new Event("webui:hydration-complete"));
	}
}
Object.assign(Object.create(null), {
	accessKey: "accesskey",
	autoCapitalize: "autocapitalize",
	contentEditable: "contenteditable",
	crossOrigin: "crossorigin",
	dirName: "dirname",
	fetchPriority: "fetchpriority",
	formAction: "formaction",
	formEnctype: "formenctype",
	formMethod: "formmethod",
	formNoValidate: "formnovalidate",
	formTarget: "formtarget",
	inputMode: "inputmode",
	isMap: "ismap",
	maxLength: "maxlength",
	minLength: "minlength",
	noModule: "nomodule",
	noValidate: "novalidate",
	readOnly: "readonly",
	referrerPolicy: "referrerpolicy",
	tabIndex: "tabindex",
	useMap: "usemap"
});
/**
* Shared logic for installing a reactive getter/setter on a class prototype.
* The backing value is stored in a private `_prop` field on the instance.
*/
function createReactiveProperty(proto, name) {
	const backingKey = `_${name}`;
	const changedKey = `${name}Changed`;
	Object.defineProperty(proto, name, {
		get() {
			return this[backingKey];
		},
		set(newValue) {
			const oldValue = this[backingKey];
			if (oldValue === newValue) return;
			this[backingKey] = newValue;
			const cb = this[changedKey];
			if (typeof cb === "function") cb.call(this, oldValue, newValue);
			if (this.isConnected) {
				const upd = this["$update"];
				if (upd) upd.call(this, name);
			}
		},
		enumerable: true,
		configurable: true
	});
}
/** Per-class registry of @observable property names. */
const observableRegistry = /* @__PURE__ */ new WeakMap();
/**
* Get the set of @observable property names registered for a class.
*/
const EMPTY_SET = Object.freeze(/* @__PURE__ */ new Set());
function getObservableNames(ctor) {
	return observableRegistry.get(ctor) ?? EMPTY_SET;
}
/**
* Marks a property as observable. When the value changes the decorator will:
* 1. Call `this.<prop>Changed(oldValue, newValue)` if defined.
* 2. Call `this.$update(name)` if the element is connected, targeting
*    only bindings that reference this property.
*/
function observable(target, name) {
	const ctor = target.constructor;
	if (!observableRegistry.has(ctor)) observableRegistry.set(ctor, /* @__PURE__ */ new Set());
	observableRegistry.get(ctor).add(name);
	createReactiveProperty(target, name);
}
//#endregion
//#region node_modules/@microsoft/webui-framework/dist/element/diff.js
function asParent(node) {
	if (!node) return null;
	return "childNodes" in node ? node : null;
}
/** Resolve a dotted path from a start offset without allocating. */
function dotWalk(cursor, path, from) {
	let start = from;
	for (let i = from; i <= path.length; i++) if (i === path.length || path.charCodeAt(i) === 46) {
		if (cursor == null || typeof cursor !== "object") return void 0;
		cursor = cursor[path.slice(start, i)];
		start = i + 1;
	}
	return cursor;
}
/** Compute a key for an item using the cached key path, or null. */
function itemKey(item, keyPath) {
	if (keyPath === void 0 || keyPath === "") return null;
	const v = dotWalk(item, keyPath, 0);
	return v != null ? String(v) : "";
}
/** Build a scope frame for a repeat item. */
function itemScope(rep, item) {
	return {
		name: rep.itemVar,
		value: item,
		parent: rep.scope
	};
}
/**
* Reconcile a repeat binding against its current collection value.
*
* Called by `$updateInstance` on every reactive update.  Resolves the
* collection path, diffs old vs. new items by key, and patches the DOM.
*/
function syncRepeat(host, rep) {
	const resolved = host.$resolveValue(rep.collection, rep.scope);
	const items = Array.isArray(resolved) ? resolved : [];
	let container = rep.container ?? (rep.start ? asParent(rep.start.parentNode) : null) ?? (rep.owner.nodes[0] ? asParent(rep.owner.nodes[0].parentNode) : null);
	if (!container) return;
	rep.container = container;
	if (!rep.synced && items.length === 0 && rep.instances.length > 0) return;
	rep.synced = true;
	if (items.length === 0) {
		for (let i = 0; i < rep.instances.length; i += 1) host.$removeInstance(rep.instances[i].instance);
		rep.instances = [];
		return;
	}
	const keyPath = Object.values(rep.attrMap)[0];
	const hasKeys = keyPath !== void 0 && keyPath !== "";
	const oldInstances = rep.instances;
	if (!hasKeys) {
		const next = [];
		const reuseCount = Math.min(oldInstances.length, items.length);
		for (let i = 0; i < reuseCount; i += 1) {
			const entry = oldInstances[i];
			entry.value = items[i];
			if (entry.instance.scope) entry.instance.scope.value = items[i];
			next.push(entry);
		}
		for (let i = reuseCount; i < items.length; i += 1) {
			const scope = itemScope(rep, items[i]);
			const instance = host.$createBlockInstance(rep.blockIndex, scope);
			if (instance) next.push({
				key: null,
				value: items[i],
				instance
			});
		}
		for (let i = reuseCount; i < oldInstances.length; i += 1) host.$removeInstance(oldInstances[i].instance);
		rep.instances = next;
		let cursor = rep.start;
		for (let i = 0; i < next.length; i += 1) cursor = host.$insertInstanceAfter(cursor, container, next[i].instance);
		for (let i = 0; i < next.length; i += 1) host.$updateInstance(next[i].instance);
		return;
	}
	const oldByKey = /* @__PURE__ */ new Map();
	for (let i = 0; i < oldInstances.length; i += 1) {
		const entry = oldInstances[i];
		const k = entry.key;
		if (k != null) oldByKey.set(k, entry);
	}
	const next = [];
	for (let i = 0; i < items.length; i += 1) {
		const item = items[i];
		const key = itemKey(item, keyPath);
		const existing = key != null ? oldByKey.get(key) : void 0;
		if (existing) {
			oldByKey.delete(key);
			existing.value = item;
			existing.key = key;
			if (existing.instance.scope) existing.instance.scope.value = item;
			next.push(existing);
		} else {
			const scope = itemScope(rep, item);
			const instance = host.$createBlockInstance(rep.blockIndex, scope);
			if (instance) next.push({
				key: key ?? null,
				value: item,
				instance
			});
		}
	}
	for (const leftover of oldByKey.values()) host.$removeInstance(leftover.instance);
	rep.instances = next;
	let cursor = rep.start;
	for (let i = 0; i < next.length; i += 1) cursor = host.$insertInstanceAfter(cursor, container, next[i].instance);
	for (let i = 0; i < next.length; i += 1) host.$updateInstance(next[i].instance);
}
const MARKER_REPEAT_ITEM = "wi";
/**
* Collect the item markers (<!--wi-->) within a repeat range.
*
* Walks siblings from the repeat start marker to the repeat end marker.
* Returns an array of <!--wi--> comment nodes that delineate items.
*/
function collectItemMarkers(repeatStart) {
	const items = [];
	let end = null;
	let node = repeatStart.nextSibling;
	while (node) {
		if (node.nodeType === 8) {
			const data = node.data;
			if (data === "/wr") {
				end = node;
				break;
			}
			if (data === MARKER_REPEAT_ITEM) items.push(node);
		}
		node = node.nextSibling;
	}
	return {
		items,
		end
	};
}
/**
* Get the next element sibling after a marker comment, skipping
* whitespace text nodes and other comments.
*/
function nextElement(marker) {
	let node = marker.nextSibling;
	while (node) {
		if (node.nodeType === 1) return node;
		if (node.nodeType === 8) {
			const data = node.data;
			if (data === "/wr" || data === MARKER_REPEAT_ITEM) return null;
		}
		node = node.nextSibling;
	}
	return null;
}
/**
* Find the Nth child of a given nodeType, skipping structural block ranges.
*
* The compiled template static HTML (`meta.h`) does not contain conditional
* or repeat block content — those are stored as separate block metadata.
* But the SSR DOM has this content rendered inline between marker pairs
* (`<!--wc-->...<!--/wc-->` and `<!--wr-->...<!--/wr-->`).
*
* This function walks `parent.firstChild` → siblings, counting only
* children of the requested `nodeType` that are NOT inside a structural
* block range.  Nested blocks of the same type are handled via depth
* tracking.  Returns the child at the given `ordinal`, or null.
*
* Used by `$resolveSSR` (element ordinals) and `$findSSRText` (text
* ordinals) to keep SSR DOM ordinals aligned with template metadata.
*
* **Requires closing markers to still be in the DOM** — caller must
* not remove `<!--/wc-->` or `<!--/wr-->` before all resolution is done.
*/
function findByOrdinal(parent, nodeType, ordinal) {
	let count = 0;
	let child = parent.firstChild;
	while (child) {
		if (child.nodeType === 8) {
			const data = child.data;
			if (data === "wc" || data === "wr") {
				const endTag = data === "wc" ? "/wc" : "/wr";
				let depth = 1;
				child = child.nextSibling;
				while (child && depth > 0) {
					if (child.nodeType === 8) {
						const d = child.data;
						if (d === data) depth++;
						else if (d === endTag) depth--;
					}
					if (depth > 0) child = child.nextSibling;
				}
				if (child) child = child.nextSibling;
				continue;
			}
		}
		if (child.nodeType === nodeType) {
			if (count === ordinal) return child;
			count++;
		}
		child = child.nextSibling;
	}
	return null;
}
//#endregion
//#region node_modules/@microsoft/webui-framework/dist/element/styles.js
/**
* Stylesheet management for WebUI components.
*
* Three CSS strategies are supported:
*
* - **Link**: `<link rel="stylesheet">` tags in each component's shadow template.
*   The browser deduplicates fetches by URL. No JS-side style management needed.
*
* - **Style**: Inline `<style>` tags inside each shadow template.
*
* - **Module**: Uses the Declarative CSS Module Scripts proposal. During SSR,
*   `<style type="module" specifier="...">` definitions are emitted inline in
*   each rendered component's light DOM. The browser registers these globally
*   and automatically adopts them via `shadowrootadoptedstylesheets` on
*   declarative shadow roots.
*
*   During SPA navigation, the router appends new `<style type="module">`
*   definitions to `<head>` via `templateStyles[]`. The framework uses
*   `import(specifier, { with: { type: "css" } })` to retrieve the browser's
*   registered CSSStyleSheet and adopts it onto the shadow root. This is a
*   direct hash-map lookup in the browser's module registry — no DOM queries,
*   no manual CSSStyleSheet construction.
*
* For light DOM components (no shadow root), Module mode injects a `<style>`
* element in `<head>`, deduplicated by `headInjected`.
*/
/**
* Specifiers already injected into `<head>` via the light DOM path.
* Prevents duplicate `<style>` elements for non-shadow components.
*/
const headInjected = /* @__PURE__ */ new Set();
/**
* Adopt a CSS module stylesheet onto a shadow root, or inject into `<head>`
* for light DOM components.
*
* For shadow DOM: uses `import(specifier, { with: { type: "css" } })` to
* retrieve the browser-registered CSSStyleSheet from the module registry.
* The browser caches the sheet internally — no application-level cache needed.
*
* For light DOM: appends a `<style>` element to `<head>` (once per specifier).
*/
function injectModuleStyle(specifier, shadowRoot) {
	if (shadowRoot) {
		if (shadowRoot.adoptedStyleSheets.length > 0) return;
		import(specifier, { with: { type: "css" } }).then((mod) => {
			shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, mod.default];
		}, () => {});
	} else if (!headInjected.has(specifier)) {
		headInjected.add(specifier);
		import(specifier, { with: { type: "css" } }).then((mod) => {
			const style = document.createElement("style");
			const rules = mod.default.cssRules;
			let cssText = "";
			for (let i = 0; i < rules.length; i++) cssText += rules[i].cssText;
			style.textContent = cssText;
			document.head.appendChild(style);
		}, () => {});
	}
}
//#endregion
//#region node_modules/@microsoft/webui-framework/dist/element.js
/**
* WebUIElement — lightweight Web Component base class.
*
* Supports Shadow DOM or light DOM, SSR hydration, reactive updates, and compiled
* SSR content is reused by matching existing DOM nodes through compiled
* template path mapping.  Client-created components use exact childNode
* indices from the compiled template HTML.
*
* ## SSR hydration markers
*
* The server-side handler plugin emits lightweight HTML comment markers
* around structural boundaries so the client can hydrate in-place:
*
*   - `<!--wr-->` / `<!--/wr-->` — repeat (for-loop) block boundaries
*   - `<!--wi-->` — repeat item boundary (one per item)
*   - `<!--wc-->` / `<!--/wc-->` — conditional (if) block boundaries
*
* During hydration these markers are consumed: `<!--wi-->`, `<!--/wr-->`,
* and `<!--/wc-->` are removed from the DOM.  The `<!--wr-->` start
* marker is kept as the runtime repeat anchor, and `<!--wc-->` is kept
* as the runtime condition anchor.
*
* **Marker removal is deferred** until after all path-based resolution
* (`$resolveSSR`, `$findSSRText`, `$finalize`) is complete.  This is
* critical because `$resolveSSR` uses marker pairs to skip structural
* block content when counting element/text ordinals — removing a closing
* marker mid-hydration would break later resolution calls.
*
* ## Comment anchors (client-created)
*
* For client-created components (no SSR), the framework inserts empty
* comment nodes (`document.createComment('')`) as stable DOM anchors
* for conditional and repeat blocks.  When SSR markers are absent,
* the same fallback anchors are used.
*
* These comments are invisible to the user, weigh ~0 bytes, and are the
* minimum DOM structure needed for the framework to operate.
*/
/** Parsed template cache — cloneNode(true) is faster than re-parsing. */
const templateCache = /* @__PURE__ */ new WeakMap();
/** Parsed template DOM for SSR path mapping, keyed by TemplateBlockMeta. */
const templateDOMCache = /* @__PURE__ */ new WeakMap();
/** Cached root tag name extracted from meta.h before it's released. */
const rootTagCache = /* @__PURE__ */ new WeakMap();
/** Pre-computed ordinals for template nodes: childIndex → [nodeType, ordinal].
*  Avoids re-counting element/text siblings on every $resolveSSR call. */
const tplOrdinalCache = /* @__PURE__ */ new WeakMap();
function getTplOrdinals(tplNode) {
	let map = tplOrdinalCache.get(tplNode);
	if (map) return map;
	map = /* @__PURE__ */ new Map();
	let elemOrd = 0;
	let textOrd = 0;
	const children = tplNode.childNodes;
	for (let k = 0; k < children.length; k++) {
		const type = children[k].nodeType;
		if (type === 1) {
			map.set(k, [1, elemOrd]);
			elemOrd++;
		} else if (type === 3) {
			map.set(k, [3, textOrd]);
			textOrd++;
		}
	}
	tplOrdinalCache.set(tplNode, map);
	return map;
}
const EMPTY_ARR = [];
function childNodesArray(parent) {
	const children = parent.childNodes;
	const len = children.length;
	const result = new Array(len);
	for (let i = 0; i < len; i++) result[i] = children[i];
	return result;
}
function getTemplateDom(meta) {
	let cached = templateDOMCache.get(meta);
	if (cached) return cached;
	const div = document.createElement("div");
	div.innerHTML = meta.h;
	templateDOMCache.set(meta, div);
	return div;
}
var WebUIElement = class extends HTMLElement {
	constructor() {
		super(...arguments);
		this.$root = null;
		this.$ready = false;
		this.$hydrated = false;
		this.$dirtyPaths = null;
		this.$pendingFlush = false;
		/** Cached condition resolver — avoids allocating a closure per evaluation. */
		this.$resolver = (p, s) => this.$resolveValue(p, s);
	}
	static define(tagName) {
		customElements.define(tagName, this);
	}
	connectedCallback() {
		const tag = this.tagName.toLowerCase();
		if (this.$hydrated && this.$root) {
			hydrationStart();
			this.$ready = true;
			this.$update();
			hydrationEnd();
			return;
		}
		const meta = getTemplate(tag);
		if (!meta) {
			console.warn(`[WebUI] Template metadata for <${tag}> not found. Ensure the component is included in the SSR output or registered via __webui.templates.`);
			return;
		}
		this.$meta = meta;
		if (document.readyState === "loading") {
			const handler = () => {
				document.removeEventListener("DOMContentLoaded", handler);
				this.$mount(meta);
			};
			document.addEventListener("DOMContentLoaded", handler);
		} else this.$mount(meta);
	}
	/** Mount the component after children are available. */
	$mount(meta) {
		if (this.$hydrated) return;
		hydrationStart();
		const hasShadow = !!this.shadowRoot;
		const wantShadow = hasShadow || !!meta.sd;
		let root;
		let isSSR;
		if (hasShadow) {
			root = this.shadowRoot;
			isSSR = true;
		} else if (this.childNodes.length > 0 && !meta.sd) {
			root = this;
			isSSR = true;
		} else if (wantShadow) {
			root = this.attachShadow({ mode: "open" });
			const fragment = this.$parseTemplate(meta);
			root.appendChild(fragment);
			isSSR = false;
		} else {
			const fragment = this.$parseTemplate(meta);
			this.appendChild(fragment);
			root = this;
			isSSR = false;
		}
		if (meta.sa) injectModuleStyle(meta.sa, this.shadowRoot);
		if (isSSR) {
			this.$applySSRState();
			this.$root = this.$hydrate(root, meta, getTemplateDom(meta));
		} else this.$root = this.$wire(root, meta);
		this.$meta = meta;
		this.$hydrated = true;
		this.$ready = true;
		if (!isSSR) this.$updateInstance(this.$root);
		hydrationEnd();
	}
	disconnectedCallback() {
		if (this.$root) queueMicrotask(() => {
			if (!this.isConnected) this.$destroy();
		});
	}
	/**
	* Permanently destroy this component's own bindings and DOM references.
	* Each component is responsible for its own cleanup — child WebUI
	* elements handle theirs via their own `disconnectedCallback`.
	*/
	$destroy() {
		if (!this.$root) return;
		this.$teardown(this.$root);
		this.$root = null;
		this.$pathIndex = void 0;
		this.$wildcardBindings = void 0;
		this.$dirtyPaths = null;
		this.$pendingFlush = false;
		this.$ready = false;
	}
	/** Break all DOM references held by a binding instance and its nested blocks. */
	$teardown(instance) {
		for (const c of instance.conds) {
			if (c.instance) this.$teardown(c.instance);
			c.instance = null;
		}
		for (const r of instance.repeats) {
			for (const item of r.instances) this.$teardown(item.instance);
			r.instances.length = 0;
			r.container = null;
			r.start = null;
			r.end = null;
		}
		instance.nodes.length = 0;
		instance.texts.length = 0;
		instance.attrs.length = 0;
		instance.conds.length = 0;
		instance.repeats.length = 0;
	}
	/** Dispatch a bubbling custom event. Uses composed:true when in shadow DOM. */
	$emit(name, detail) {
		return this.dispatchEvent(new CustomEvent(name, {
			bubbles: true,
			cancelable: true,
			composed: !!this.shadowRoot,
			detail
		}));
	}
	/** Populate @observable properties from server or router state.
	*
	* Each property is set through its reactive setter, which coalesces
	* updates into a single pending microtask. We then synchronously
	* flush those pending path updates so the DOM is current before any
	* view-transition snapshot captures it.
	*/
	setState(state) {
		const names = getObservableNames(this.constructor);
		const keys = Object.keys(state);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			if (names.has(key)) this[key] = state[key];
		}
		this.$flushUpdates();
	}
	/**
	* Apply SSR state from `window.__webui.state`.
	*
	* The handler emits all SSR metadata in a single consolidated
	* `window.__webui` script block. State lives at `.state` — the same
	* props passed to the server render so observables match the DOM.
	* Only observable properties are set — unknown keys are ignored.
	*
	* Writes directly to the backing field (`_prop`) to avoid triggering
	* reactive updates before bindings are wired.
	*/
	$applySSRState() {
		const state = window.__webui?.state;
		if (!state || typeof state !== "object") return;
		const names = getObservableNames(this.constructor);
		for (const key of Object.keys(state)) if (names.has(key)) this[`_${key}`] = state[key];
	}
	/** Reactive update — called by @observable/@attr setters. */
	$update(path) {
		if (!this.$ready || !this.$root) return;
		if (!this.$pathIndex) this.$buildPathIndex();
		if (path && this.$pathIndex) {
			if (this.$pathIndex.get(path)) {
				if (!this.$dirtyPaths) this.$dirtyPaths = /* @__PURE__ */ new Set();
				this.$dirtyPaths.add(path);
				if (!this.$pendingFlush) {
					this.$pendingFlush = true;
					queueMicrotask(() => this.$flush());
				}
				return;
			}
		}
		this.$dirtyPaths = null;
		this.$updateInstance(this.$root);
	}
	/** Synchronously flush all queued path updates. Call this when you need
	*  the DOM to reflect pending property changes immediately. */
	$flushUpdates() {
		if (this.$pendingFlush) this.$flush();
	}
	/** Flush all queued path updates. Handles re-entrant setter calls. */
	$flush() {
		if (!this.$ready || !this.$root || !this.$pathIndex) {
			this.$dirtyPaths = null;
			this.$pendingFlush = false;
			return;
		}
		while (this.$dirtyPaths && this.$dirtyPaths.size > 0) {
			const dirty = this.$dirtyPaths;
			this.$dirtyPaths = null;
			for (const path of dirty) {
				const entry = this.$pathIndex.get(path);
				if (entry) this.$updateBindings(entry.texts, entry.attrs, entry.conds, entry.repeats);
			}
			if (this.$wildcardBindings) {
				const wc = this.$wildcardBindings;
				this.$updateBindings(wc.texts, wc.attrs, wc.conds, wc.repeats);
			}
		}
		this.$pendingFlush = false;
	}
	$resolve(root, path, pathStart = 0) {
		let cur = root;
		for (let i = 0; i < pathStart; i++) {
			const child = cur.childNodes[path[i]];
			if (!child) return null;
			cur = child;
		}
		for (let i = pathStart; i < path.length; i++) {
			const child = cur.childNodes[path[i]];
			if (!child) return null;
			cur = child;
		}
		return cur;
	}
	$resolveSSR(ssrRoot, tplRoot, path, pathStart = 0) {
		let ssr = ssrRoot;
		let tpl = tplRoot;
		for (let i = 0; i < pathStart; i++) {
			const tplChild = tpl.childNodes[path[i]];
			if (!tplChild) return null;
			tpl = tplChild;
		}
		for (let i = pathStart; i < path.length; i++) {
			const idx = path[i];
			const tplChild = tpl.childNodes[idx];
			if (!tplChild) return null;
			const entry = getTplOrdinals(tpl).get(idx);
			if (!entry) return null;
			const [nodeType, ordinal] = entry;
			const child = findByOrdinal(ssr, nodeType, ordinal);
			if (!child) return null;
			ssr = child;
			tpl = tplChild;
		}
		return ssr;
	}
	$parseTemplate(meta) {
		let cached = templateCache.get(meta);
		if (cached) return cached.cloneNode(true);
		const tpl = document.createElement("template");
		tpl.innerHTML = meta.h;
		templateCache.set(meta, tpl.content);
		return tpl.content.cloneNode(true);
	}
	$wire(root, meta, scope) {
		const instance = {
			scope,
			nodes: childNodesArray(root),
			texts: [],
			attrs: [],
			conds: [],
			repeats: []
		};
		const textRefs = [];
		if (meta.tx) for (let i = 0; i < meta.tx.length; i++) {
			const entry = meta.tx[i];
			const [slot, parts] = entry;
			const raw = entry[2] === 1;
			const [parentPath, beforeIndex] = slot;
			const parent = parentPath.length > 0 ? this.$resolve(root, parentPath) : root;
			if (!parent || parent.nodeType !== 1 && parent.nodeType !== 11) continue;
			textRefs.push({
				parent,
				ref: parent.childNodes[beforeIndex] || null,
				parts,
				raw
			});
		}
		const condRefs = [];
		if (meta.c) for (let i = 0; i < meta.c.length; i++) {
			const [condition, blockIndex, slotMeta] = meta.c[i];
			const [parentPath, beforeIndex] = slotMeta;
			const parent = parentPath.length > 0 ? this.$resolve(root, parentPath) : root;
			if (!parent || parent.nodeType !== 1 && parent.nodeType !== 11) continue;
			condRefs.push({
				parent,
				ref: parent.childNodes[beforeIndex] || null,
				condition,
				blockIndex
			});
		}
		const repRefs = [];
		if (meta.r) for (let i = 0; i < meta.r.length; i++) {
			const [collection, itemVar, blockIndex, slotMeta] = meta.r[i];
			const [parentPath, beforeIndex] = slotMeta;
			const parent = parentPath.length > 0 ? this.$resolve(root, parentPath) : root;
			if (!parent || parent.nodeType !== 1 && parent.nodeType !== 11) continue;
			repRefs.push({
				parent,
				ref: parent.childNodes[beforeIndex] || null,
				collection,
				itemVar,
				blockIndex
			});
		}
		this.$wireAttrs(instance, meta, scope, (p) => this.$resolve(root, p));
		this.$finalize(root, meta, (r, p) => this.$resolve(r, p));
		for (const t of textRefs) {
			const anchor = document.createComment("");
			t.parent.insertBefore(anchor, t.ref);
			if (t.raw) {
				const container = document.createElement("span");
				t.parent.insertBefore(container, anchor);
				const textNode = document.createTextNode("");
				instance.texts.push({
					node: textNode,
					parts: t.parts,
					scope,
					raw: true,
					rawParent: container
				});
			} else {
				const textNode = document.createTextNode("");
				t.parent.insertBefore(textNode, anchor);
				instance.texts.push({
					node: textNode,
					parts: t.parts,
					scope
				});
			}
		}
		for (const c of condRefs) {
			const anchor = document.createComment("");
			c.parent.insertBefore(anchor, c.ref);
			instance.conds.push({
				condition: c.condition,
				blockIndex: c.blockIndex,
				anchor,
				scope,
				instance: null
			});
		}
		for (let i = 0; i < repRefs.length; i++) {
			const r = repRefs[i];
			const anchor = document.createComment("");
			r.parent.insertBefore(anchor, r.ref);
			const { attrMap, rootBindings } = this.$repeatMaps(r.blockIndex, r.itemVar);
			instance.repeats.push({
				markerId: i,
				collection: r.collection,
				itemVar: r.itemVar,
				blockIndex: r.blockIndex,
				container: r.parent,
				start: anchor,
				end: null,
				scope,
				owner: instance,
				instances: [],
				rootTag: null,
				attrMap,
				rootBindings
			});
		}
		for (let i = 0; i < instance.conds.length; i++) this.$toggleCond(instance.conds[i]);
		return instance;
	}
	/**
	* Hydrate SSR-rendered DOM against compiled template metadata.
	*
	* When pathStart=0 (default): ssrRoot is a container with children
	* (top-level component hydration).
	*
	* When pathStart=1: ssrRoot is a block element itself (repeat item
	* in-place hydration). The leading [0] wrapper segment is skipped
	* so compiled paths resolve directly against the element.
	*/
	$hydrate(ssrRoot, meta, tplDom, scope, pathStart = 0) {
		const instance = {
			scope,
			nodes: pathStart > 0 ? [ssrRoot] : childNodesArray(ssrRoot),
			texts: [],
			attrs: [],
			conds: [],
			repeats: []
		};
		const staleMarkers = [];
		if (meta.tx) for (let i = 0; i < meta.tx.length; i++) {
			const entry = meta.tx[i];
			const [slot, parts] = entry;
			const raw = entry[2] === 1;
			const [parentPath, beforeIndex] = slot;
			const ssrParent = this.$resolveSSR(ssrRoot, tplDom, parentPath, pathStart);
			if (!ssrParent) continue;
			const tplParent = this.$resolve(tplDom, parentPath, pathStart);
			if (!tplParent) continue;
			if (raw) {
				const rawParent = ssrParent;
				const textNode = document.createTextNode("");
				instance.texts.push({
					node: textNode,
					parts,
					scope,
					raw: true,
					rawParent
				});
			} else {
				const textNode = this.$findSSRText(ssrParent, tplParent, beforeIndex);
				if (textNode) instance.texts.push({
					node: textNode,
					parts,
					scope
				});
			}
		}
		this.$wireAttrs(instance, meta, scope, (p) => this.$resolveSSR(ssrRoot, tplDom, p, pathStart));
		if (meta.c) {
			let lastCondMarker = null;
			let lastCondParent = null;
			for (let i = 0; i < meta.c.length; i++) {
				const [condition, blockIndex, slotMeta] = meta.c[i];
				const [parentPath] = slotMeta;
				const ssrParent = this.$resolveSSR(ssrRoot, tplDom, parentPath, pathStart) ?? ssrRoot;
				const blockMeta = this.$block(blockIndex);
				const shown = condition[0](this.$resolver, scope);
				let condInstance = null;
				if (ssrParent !== lastCondParent) {
					lastCondMarker = null;
					lastCondParent = ssrParent;
				}
				const marker = this.$findMarker(ssrParent, "wc", lastCondMarker);
				let condAnchor;
				if (marker) condAnchor = marker;
				else {
					condAnchor = document.createComment("");
					const [, beforeIndex] = slotMeta;
					const insertRef = ssrParent.childNodes[beforeIndex ?? ssrParent.childNodes.length] ?? null;
					ssrParent.insertBefore(condAnchor, insertRef);
				}
				if (marker) lastCondMarker = marker;
				if (shown && blockMeta && marker) condInstance = this.$hydrateCondContent(condAnchor, blockMeta, scope);
				if (marker) {
					const endMarker = (condInstance ? condInstance.nodes[condInstance.nodes.length - 1] : condAnchor)?.nextSibling;
					if (endMarker && endMarker.nodeType === 8 && endMarker.data === "/wc") staleMarkers.push(endMarker);
				}
				instance.conds.push({
					condition,
					blockIndex,
					anchor: condAnchor,
					scope,
					instance: condInstance
				});
			}
		}
		if (meta.r) {
			let lastRepMarker = null;
			let lastRepParent = null;
			for (let i = 0; i < meta.r.length; i++) {
				const [collection, itemVar, blockIndex, slotMeta] = meta.r[i];
				const [parentPath] = slotMeta;
				const ssrParent = this.$resolveSSR(ssrRoot, tplDom, parentPath, pathStart) ?? ssrRoot;
				if (ssrParent !== lastRepParent) {
					lastRepMarker = null;
					lastRepParent = ssrParent;
				}
				const blockMeta = this.$block(blockIndex);
				const { attrMap, rootBindings } = this.$repeatMaps(blockIndex, itemVar);
				const rootTag = blockMeta ? this.$rootTag(blockMeta) : null;
				const marker = this.$findMarker(ssrParent, "wr", lastRepMarker);
				let anchor;
				if (marker) anchor = marker;
				else {
					anchor = document.createComment("");
					const [, beforeIndex] = slotMeta;
					const tplParent = this.$resolve(tplDom, parentPath, pathStart);
					const staticCount = tplParent ? tplParent.childNodes.length : 0;
					const insertRef = ssrParent.childNodes[Math.min(beforeIndex ?? staticCount, ssrParent.childNodes.length)] ?? null;
					ssrParent.insertBefore(anchor, insertRef);
				}
				lastRepMarker = anchor;
				const repeatInsts = [];
				const itemsArr = this.$resolveValue(collection, scope);
				const items = Array.isArray(itemsArr) ? itemsArr : [];
				const { items: itemMarkers, end: endMarker } = marker ? collectItemMarkers(anchor) : {
					items: [],
					end: null
				};
				if (blockMeta && items.length > 0 && anchor.parentNode && itemMarkers.length > 0) {
					if (itemMarkers.length !== items.length) console.warn(`[webui] hydration: repeat marker count (${itemMarkers.length}) ≠ data length (${items.length}) for "${collection}"`);
					const firstKey = Object.keys(attrMap)[0];
					const blockTplDom = getTemplateDom(blockMeta);
					const limit = Math.min(itemMarkers.length, items.length);
					for (let j = 0; j < limit; j++) {
						const itemValue = items[j];
						const itemScope = {
							name: itemVar,
							value: itemValue,
							parent: scope
						};
						if (rootTag) {
							const itemEl = nextElement(itemMarkers[j]);
							if (itemEl) {
								const key = firstKey !== void 0 ? itemEl.getAttribute(firstKey) : String(j);
								const childInstance = this.$hydrate(itemEl, blockMeta, blockTplDom, itemScope, 1);
								repeatInsts.push({
									key,
									value: itemValue,
									instance: childInstance
								});
							}
						} else {
							const inst = {
								scope: itemScope,
								nodes: [],
								texts: EMPTY_ARR,
								attrs: EMPTY_ARR,
								conds: [],
								repeats: EMPTY_ARR
							};
							if (blockMeta.c) {
								let cursor = itemMarkers[j].nextSibling;
								const nextBound = j + 1 < itemMarkers.length ? itemMarkers[j + 1] : endMarker;
								const itemParent = itemMarkers[j].parentNode;
								for (let ci = 0; ci < blockMeta.c.length; ci++) {
									const [condCond, condBlockIndex] = blockMeta.c[ci];
									let condAnchor = null;
									while (cursor && cursor !== nextBound) {
										if (cursor.nodeType === 8 && cursor.data === "wc") {
											condAnchor = cursor;
											cursor = cursor.nextSibling;
											break;
										}
										cursor = cursor.nextSibling;
									}
									if (!condAnchor) {
										condAnchor = document.createComment("");
										if (itemParent) itemParent.insertBefore(condAnchor, cursor ?? null);
									}
									const condMet = condCond[0](this.$resolver, itemScope);
									let condInstance = null;
									if (condMet) {
										const condBlockMeta = this.$block(condBlockIndex);
										if (condBlockMeta) condInstance = this.$hydrateCondContent(condAnchor, condBlockMeta, itemScope);
									}
									const lastNode = condInstance ? condInstance.nodes[condInstance.nodes.length - 1] : condAnchor;
									const endM = lastNode?.nextSibling;
									if (endM && endM.nodeType === 8 && endM.data === "/wc") {
										cursor = endM.nextSibling;
										endM.parentNode?.removeChild(endM);
									} else cursor = lastNode?.nextSibling ?? null;
									inst.conds.push({
										condition: condCond,
										blockIndex: condBlockIndex,
										anchor: condAnchor,
										scope: itemScope,
										instance: condInstance
									});
								}
							}
							repeatInsts.push({
								key: String(j),
								value: itemValue,
								instance: inst
							});
						}
					}
					for (let m = 0; m < itemMarkers.length; m++) staleMarkers.push(itemMarkers[m]);
				}
				if (endMarker) staleMarkers.push(endMarker);
				instance.repeats.push({
					markerId: i,
					collection,
					itemVar,
					blockIndex,
					container: anchor.parentNode ?? ssrRoot,
					start: anchor,
					end: null,
					scope,
					owner: instance,
					instances: repeatInsts,
					rootTag,
					attrMap,
					rootBindings,
					synced: true
				});
			}
		}
		this.$finalize(ssrRoot, meta, (r, p) => this.$resolveSSR(r, tplDom, p, pathStart));
		for (let i = 0; i < staleMarkers.length; i++) staleMarkers[i].parentNode?.removeChild(staleMarkers[i]);
		return instance;
	}
	/** Collect sibling nodes between a start marker and an end marker comment. */
	$collectBetween(start, endData) {
		const nodes = [];
		let node = start.nextSibling;
		while (node) {
			if (node.nodeType === 8 && node.data === endData) break;
			nodes.push(node);
			node = node.nextSibling;
		}
		return nodes;
	}
	/**
	* Hydrate a conditional block's content — shared by top-level and
	* repeat-item conditional hydration paths.
	*/
	$hydrateCondContent(condAnchor, blockMeta, scope) {
		const rootTag = this.$rootTag(blockMeta);
		const tplDom = getTemplateDom(blockMeta);
		if (rootTag && tplDom.children.length === 1) {
			const el = nextElement(condAnchor);
			if (el) {
				const inst = this.$hydrate(el, blockMeta, tplDom, scope, 1);
				this.$updateInstance(inst);
				return inst;
			}
			return null;
		}
		const condNodes = this.$collectBetween(condAnchor, "/wc");
		if (condNodes.length === 0) return null;
		const wrapper = document.createElement("div");
		for (let cn = 0; cn < condNodes.length; cn++) wrapper.appendChild(condNodes[cn]);
		const inst = this.$hydrate(wrapper, blockMeta, tplDom, scope);
		inst.nodes = childNodesArray(wrapper);
		let afterNode = condAnchor;
		for (let cn = 0; cn < inst.nodes.length; cn++) {
			condAnchor.parentNode?.insertBefore(inst.nodes[cn], afterNode.nextSibling);
			afterNode = inst.nodes[cn];
		}
		this.$updateInstance(inst);
		return inst;
	}
	/**
	* Find the next marker comment with the given data among a parent's children.
	* Starts searching from `after` (exclusive) if provided, or from firstChild.
	*/
	$findMarker(parent, data, after) {
		let child = after ? after.nextSibling : parent.firstChild;
		while (child) {
			if (child.nodeType === 8 && child.data === data) return child;
			child = child.nextSibling;
		}
		return null;
	}
	/**
	* Find existing SSR text node by mapping template text-node ordinal.
	*
	* Similar to `$resolveSSR`, the SSR DOM may contain extra text nodes
	* inside structural blocks (`<if>`/`<for>`) that are not in the
	* compiled template.  We skip `<!--wc-->...<!--/wc-->` and
	* `<!--wr-->...<!--/wr-->` ranges to keep text ordinals aligned.
	*/
	$findSSRText(ssrParent, tplParent, beforeIndex) {
		const ordinals = getTplOrdinals(tplParent);
		let textOrd = 0;
		for (let k = 0; k < beforeIndex; k++) {
			const entry = ordinals.get(k);
			if (entry && entry[0] === 3) textOrd++;
		}
		const found = findByOrdinal(ssrParent, 3, textOrd);
		if (found) return found;
		let child = ssrParent.firstChild;
		while (child) {
			if (child.nodeType === 3 && child.data && child.data.trim()) return child;
			child = child.nextSibling;
		}
		return null;
	}
	/** Extract root tag name from block metadata. */
	$rootTag(meta) {
		let cached = rootTagCache.get(meta);
		if (cached !== void 0) return cached;
		const h = meta.h;
		if (!h || h.charCodeAt(0) !== 60) {
			rootTagCache.set(meta, null);
			return null;
		}
		let end = 1;
		while (end < h.length) {
			const c = h.charCodeAt(end);
			if (c === 32 || c === 62 || c === 47) break;
			end++;
		}
		const tag = h.slice(1, end).toLowerCase();
		rootTagCache.set(meta, tag);
		return tag;
	}
	/** Wire attribute bindings using a resolver (shared by $wire and $hydrate). */
	$wireAttrs(instance, meta, scope, resolve) {
		if (!meta.a || !meta.ag) return;
		for (let g = 0; g < meta.ag.length; g++) {
			const [targetPath, start, count] = meta.ag[g];
			const el = resolve(targetPath);
			if (!el || el.nodeType !== 1) continue;
			for (let j = 0; j < count; j++) {
				const entry = meta.a[start + j];
				if (entry) instance.attrs.push(this.$makeAttr(el, entry, scope));
			}
		}
	}
	/** Wire events + root events + refs (shared by $wire and $hydrate). */
	$finalize(root, meta, resolver) {
		this.$wireEvents(root, meta, resolver);
		if (meta.re) this.$wireRoot(meta.re);
		this.$wireRefs(root);
	}
	/** Wire events using a resolver function (works for both client and SSR). */
	$wireEvents(root, meta, resolver) {
		if (!meta.e) return;
		for (let i = 0; i < meta.e.length; i++) {
			const [eventName, handlerName, needsEvent, target] = meta.e[i];
			const el = resolver(root, target);
			if (!el || el.nodeType !== 1) continue;
			this.$addEvent(el, eventName, handlerName, needsEvent);
		}
	}
	/** Wire root-level events on the host element (or shadow root when present). */
	$wireRoot(re) {
		const target = this.shadowRoot ?? this;
		for (let i = 0; i < re.length; i++) this.$addEvent(target, re[i][0], re[i][1], re[i][2]);
	}
	/** Attach a single event listener. */
	$addEvent(target, eventName, handlerName, _needsEvent) {
		const method = this[handlerName];
		if (typeof method !== "function") return;
		target.addEventListener(eventName, method.bind(this));
	}
	/** Find w-ref attributes and assign to component properties. */
	$wireRefs(root) {
		if (root.nodeType !== 1 && root.nodeType !== 11) return;
		const refs = root.querySelectorAll("[w-ref]");
		for (let i = 0; i < refs.length; i++) {
			const raw = refs[i].getAttribute("w-ref");
			if (!raw || raw.charCodeAt(0) !== 123) continue;
			const name = raw.slice(1, -1);
			if (name) this[name] = refs[i];
		}
	}
	/** Create an AttrBinding from compiled metadata. */
	$makeAttr(el, entry, scope) {
		const name = entry[0];
		const kind = entry[1];
		if (kind === 2) return {
			element: el,
			name,
			kind,
			condition: entry[2],
			scope
		};
		if (kind === 3) return {
			element: el,
			name,
			kind,
			parts: entry[2],
			scope
		};
		return {
			element: el,
			name,
			kind,
			path: entry[2] || "",
			scope
		};
	}
	/** Build attrMap and rootBindings for a repeat block. */
	$repeatMaps(blockIndex, itemVar) {
		const attrMap = {};
		const rootBindings = [];
		const bm = this.$block(blockIndex);
		if (bm?.a && bm.ag) for (let g = 0; g < bm.ag.length; g++) {
			const [tp, s, c] = bm.ag[g];
			if (tp.length === 0 || tp.length === 1 && tp[0] === 0) for (let j = 0; j < c; j++) {
				const entry = bm.a[s + j];
				if (entry) {
					rootBindings.push(entry);
					if (entry[1] === 0 || entry[1] === 3) {
						const dp = this.$singleDynamic(entry[1] === 3 ? entry[2] : [[entry[2]]]);
						if (dp && dp.path.startsWith(itemVar + ".")) attrMap[entry[0]] = dp.path.slice(itemVar.length + 1);
					}
				}
			}
		}
		return {
			attrMap,
			rootBindings
		};
	}
	$buildPathIndex() {
		if (!this.$root) return;
		const observableNames = getObservableNames(this.constructor);
		const index = /* @__PURE__ */ new Map();
		const ensure = (key) => {
			let e = index.get(key);
			if (!e) {
				e = {
					texts: [],
					attrs: [],
					conds: [],
					repeats: []
				};
				index.set(key, e);
			}
			return e;
		};
		const keyFor = (path) => {
			const dot = path.indexOf(".");
			const root = dot > -1 ? path.slice(0, dot) : path;
			return observableNames.has(root) ? root : "*";
		};
		const r = this.$root;
		for (const t of r.texts) if (t.parts) {
			for (const p of t.parts) if (typeof p !== "string") ensure(keyFor(p[0])).texts.push(t);
		}
		for (const a of r.attrs) {
			if (a.path) ensure(keyFor(a.path)).attrs.push(a);
			if (a.parts) {
				for (const p of a.parts) if (typeof p !== "string") ensure(keyFor(p[0])).attrs.push(a);
			}
			if (a.condition) for (const p of a.condition[1]) ensure(keyFor(p)).attrs.push(a);
		}
		for (const c of r.conds) for (const p of c.condition[1]) ensure(keyFor(p)).conds.push(c);
		for (const rep of r.repeats) ensure(keyFor(rep.collection)).repeats.push(rep);
		const wc = index.get("*");
		if (wc) {
			index.delete("*");
			this.$wildcardBindings = wc;
		} else this.$wildcardBindings = null;
		this.$pathIndex = index;
	}
	$updateBindings(texts, attrs, conds, repeats) {
		for (let i = 0; i < texts.length; i++) this.$patchText(texts[i]);
		for (let i = 0; i < attrs.length; i++) this.$patchAttr(attrs[i]);
		for (let i = 0; i < conds.length; i++) this.$toggleCond(conds[i]);
		for (let i = 0; i < repeats.length; i++) syncRepeat(this, repeats[i]);
	}
	$updateInstance(instance) {
		this.$updateBindings(instance.texts, instance.attrs, instance.conds, instance.repeats);
	}
	$patchText(b) {
		let val;
		if (b.parts) val = this.$resolveParts(b.parts, b.scope);
		else if (b.path) {
			const raw = this.$resolveValue(b.path, b.scope);
			val = raw == null ? "" : String(raw);
		} else return;
		if (b.raw && b.rawParent) {
			if (b.rawParent.innerHTML !== val) b.rawParent.innerHTML = val;
		} else if (b.node.data !== val) b.node.data = val;
	}
	$patchAttr(b) {
		const el = b.element;
		switch (b.kind) {
			case 1: {
				const v = this.$resolveValue(b.path, b.scope);
				el[b.name] = v;
				const flush = el["$flushUpdates"];
				if (typeof flush === "function") flush.call(el);
				break;
			}
			case 2: {
				const show = b.condition[0](this.$resolver, b.scope);
				if (show) el.setAttribute(b.name, "");
				else el.removeAttribute(b.name);
				if (b.name === "checked" || b.name === "selected" || b.name === "disabled") el[b.name] = show;
				break;
			}
			case 3: {
				const v = this.$resolveParts(b.parts, b.scope);
				if (el.getAttribute(b.name) !== v) el.setAttribute(b.name, v);
				break;
			}
			default: {
				const v = this.$resolveValue(b.path, b.scope);
				const s = v == null ? "" : String(v);
				if (b.name === "checked" || b.name === "selected") el[b.name] = !!v && v !== "false" && v !== "0";
				else if (b.name === "value") {
					if (el.value !== s) el.value = s;
				} else if (el.getAttribute(b.name) !== s) el.setAttribute(b.name, s);
				break;
			}
		}
	}
	$toggleCond(c) {
		if (c.condition[0](this.$resolver, c.scope)) {
			if (!c.instance) {
				c.instance = this.$createBlockInstance(c.blockIndex, c.scope);
				if (c.instance) {
					const frag = document.createDocumentFragment();
					for (const n of c.instance.nodes) frag.appendChild(n);
					c.anchor.parentNode?.insertBefore(frag, c.anchor.nextSibling);
				}
			}
			if (c.instance) this.$updateInstance(c.instance);
		} else if (c.instance) {
			this.$removeInstance(c.instance);
			c.instance = null;
		}
	}
	$resolveValue(path, scope) {
		let frame = scope;
		while (frame) {
			if (path === frame.name) return frame.value;
			if (path.length > frame.name.length && path.charCodeAt(frame.name.length) === 46 && path.startsWith(frame.name)) return dotWalk(frame.value, path, frame.name.length + 1);
			frame = frame.parent;
		}
		const dot = path.indexOf(".");
		if (dot === -1) return this[path];
		return dotWalk(this[path.substring(0, dot)], path, dot + 1);
	}
	$resolveParts(parts, scope) {
		let result = "";
		for (let i = 0; i < parts.length; i++) {
			const p = parts[i];
			if (typeof p === "string") {
				result += p;
				continue;
			}
			const v = this.$resolveValue(p[0], scope);
			result += v == null ? "" : String(v);
		}
		return result;
	}
	$block(blockIndex) {
		return this.$meta?.b?.[blockIndex];
	}
	$createBlockInstance(blockIndex, scope) {
		const bm = this.$block(blockIndex);
		if (!bm) return null;
		const frag = this.$parseTemplate(bm);
		const wrapper = document.createElement("div");
		wrapper.appendChild(frag);
		const inst = this.$wire(wrapper, bm, scope);
		inst.nodes = childNodesArray(wrapper);
		return inst;
	}
	$removeInstance(instance) {
		for (const n of instance.nodes) n.parentNode?.removeChild(n);
		for (const c of instance.conds) if (c.instance) this.$removeInstance(c.instance);
		for (const r of instance.repeats) for (const item of r.instances) this.$removeInstance(item.instance);
	}
	$insertInstanceAfter(cursor, container, instance) {
		const nodes = instance.nodes;
		if (nodes.length === 0) return cursor;
		const ref = cursor ? cursor.nextSibling : container.firstChild;
		if (nodes[0] === ref) return nodes[nodes.length - 1];
		const frag = document.createDocumentFragment();
		for (let i = 0; i < nodes.length; i++) frag.appendChild(nodes[i]);
		container.insertBefore(frag, ref);
		return nodes[nodes.length - 1];
	}
	/** Extract the single dynamic path from a compiled attr parts array. */
	$singleDynamic(parts) {
		let path = "";
		let prefix = "";
		let suffix = "";
		let seen = false;
		for (const p of parts) {
			if (typeof p === "string") {
				if (seen) suffix += p;
				else prefix += p;
				continue;
			}
			if (seen) return null;
			path = p[0];
			seen = true;
		}
		return seen ? {
			path,
			prefix,
			suffix
		} : null;
	}
};
//#endregion
//#region \0@oxc-project+runtime@0.129.0/helpers/decorate.js
function __decorate(decorators, target, key, desc) {
	var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
	if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
	else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
	return c > 3 && r && Object.defineProperty(target, key, r), r;
}
//#endregion
//#region src/editorial-hero/editorial-hero.ts
var EditorialHero = class extends WebUIElement {
	constructor(..._args) {
		super(..._args);
		this.count = 0;
	}
	increment() {
		this.count += 1;
	}
};
__decorate([observable], EditorialHero.prototype, "count", void 0);
EditorialHero.define("editorial-hero");
//#endregion

//# sourceMappingURL=index.js.map