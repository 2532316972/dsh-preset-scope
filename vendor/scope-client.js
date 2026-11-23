window.__ModuleLoader__.load({
	id: "dsh-workspace-scope",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		//#region src/client/modal-state.tsx
		let modalOpen = false;
		const listeners = /* @__PURE__ */ new Set();
		function subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
		function setModalOpen(open) {
			if (open === modalOpen) return;
			modalOpen = open;
			for (const listener of [...listeners]) listener();
		}
		function useModalOpen() {
			return (0, react.useSyncExternalStore)(subscribe, () => modalOpen);
		}
		//#endregion
		//#region \0workspace-scope-css-module
		const css = ".wsc-chip{display:inline-flex;align-items:center;gap:4px;min-width:0;max-width:220px;height:28px;padding:0 4px 0 8px;border:none;border-radius:24px;outline:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;font-weight:500;font-family:inherit;cursor:pointer}\r\n.wsc-chip:hover{background:var(--dsw-alias-interactive-bg-hover)}\r\n.wsc-chip:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}\r\n.wsc-seat-icon{flex:none;color:var(--dsw-alias-label-primary)}\r\n.wsc-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;pointer-events:none}\r\n.wsc-mask{position:absolute;inset:0;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);pointer-events:auto}\r\n.wsc-panel{position:relative;z-index:1;display:flex;flex-direction:column;width:min(880px,calc(100vw - 32px));height:min(860px,calc(100vh - 32px));max-width:calc(100vw - 32px);border-radius:24px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-shadow-lv3);pointer-events:auto;color:var(--dsw-alias-label-primary)}\r\n.wsc-panel-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;height:54px;padding:8px 14px 8px 24px;box-sizing:border-box}\r\n.wsc-panel-title{font-size:16px;line-height:24px;font-weight:500;color:var(--dsw-alias-label-primary)}\r\n.wsc-head-actions{display:flex;align-items:center;gap:2px}\r\n.wsc-close{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:none;border-radius:28px;background:transparent;cursor:pointer;color:var(--dsw-alias-label-primary)}\r\n.wsc-close:hover{background:var(--dsw-alias-interactive-bg-hover)}\r\n.wsc-close[aria-expanded='true']{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-business-primary)}\r\n.wsc-panel-body{flex:1;min-height:0;padding:2px 24px 20px;overflow-y:auto;font-size:13px}\r\n.wsc-body{display:flex;flex-direction:column;gap:10px;width:100%;max-width:880px;height:100%;color:var(--dsw-alias-label-primary)}\r\n/* Collapsible help: the layer interaction explanation lives behind the\r\n   header info toggle instead of a permanently visible paragraph pair. */\r\n.wsc-help{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}\r\n/* Toolbar row: tabs and search share one line to save vertical space. */\r\n.wsc-toolbar{display:flex;gap:10px;align-items:center}\r\n.wsc-toolbar .wsc-tabs{flex:none;width:430px}\r\n.wsc-toolbar .wsc-search{flex:1;min-width:0}\r\n.wsc-tabs{display:flex;gap:6px}\r\n.wsc-tab{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:1;min-width:0;overflow:hidden;padding:6px 8px;white-space:nowrap;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;line-height:20px;font-weight:500;cursor:pointer;transition:border-color 0.15s var(--ds-ease-in-out),color 0.15s var(--ds-ease-in-out),background 0.15s var(--ds-ease-in-out)}\r\n.wsc-tab:hover{background:var(--dsw-alias-interactive-bg-hover)}\r\n.wsc-tab:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}\r\n.wsc-tab[data-active='true']{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}\r\n.wsc-tab-badge{display:inline-flex;align-items:center;min-width:0;overflow:hidden;text-overflow:ellipsis;min-height:16px;padding:0 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:14px;white-space:nowrap}\r\n.wsc-tab[data-active='true'] .wsc-tab-badge{background:var(--dsw-alias-bg-layer-1)}\r\n.wsc-tab-badge[data-custom='true']{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent);color:var(--dsw-alias-state-business-primary)}\r\n.wsc-search{position:relative;display:flex;align-items:center;width:100%;color:var(--dsw-alias-label-tertiary)}\r\n.wsc-search>svg{position:absolute;left:12px;pointer-events:none}\r\n.wsc-search input{width:100%;height:32px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:0 34px 0 36px;outline:none;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;box-sizing:border-box}\r\n.wsc-search input::placeholder{color:var(--dsw-alias-label-tertiary)}\r\n.wsc-search input:focus-visible{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary) 18%,transparent)}\r\n/* Group pills: Skills / MCP switch above the single list; the summary keeps\r\n   the per-group enablement count visible without separate headings. */\r\n.wsc-group-pills{display:flex;gap:8px}\r\n.wsc-group-pill{display:inline-flex;align-items:center;gap:6px;min-width:0;padding:5px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;line-height:18px;font-weight:500;cursor:pointer;transition:border-color 0.15s var(--ds-ease-in-out),color 0.15s var(--ds-ease-in-out),background 0.15s var(--ds-ease-in-out)}\r\n.wsc-group-pill:hover{background:var(--dsw-alias-interactive-bg-hover)}\r\n.wsc-group-pill:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}\r\n.wsc-group-pill[data-active='true']{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}\r\n.wsc-pill-summary{font-size:11px;line-height:14px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;white-space:nowrap}\r\n.wsc-group-pill[data-active='true'] .wsc-pill-summary{color:var(--dsw-alias-label-secondary)}\r\n/* Fixed-height scroll region: header/toolbar/pills/actions stay pinned, only\r\n   the capability list scrolls. flex-basis 0 + min-height keeps it inside the\r\n   panel on short viewports too. */\r\n.wsc-list-scroll{flex:1 1 0;min-height:120px;overflow-y:auto;padding:2px}\r\n.wsc-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:8px;margin:0;padding:0;list-style:none}\r\n@media (min-width:1280px){.wsc-cards{grid-template-columns:repeat(3,minmax(0,1fr))}}\r\n.wsc-card{min-width:0;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-3)}\r\n.wsc-card-main{box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;min-height:40px;padding:8px 10px}\r\n.wsc-row{flex:1;min-width:0;display:flex;align-items:center;gap:6px;border:0;padding:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}\r\n.wsc-row:hover{background:var(--dsw-alias-interactive-bg-hover)}\r\n.wsc-row:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}\r\n.wsc-card-title{flex:1;min-width:0;overflow:hidden;font-size:13px;line-height:18px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}\r\n.wsc-tag{display:inline-flex;flex:none;align-items:center;min-height:20px;border-radius:5px;padding:1px 6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;white-space:nowrap}\r\n.wsc-tag[data-enabled='true']{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent);color:var(--dsw-alias-state-success-primary)}\r\n.wsc-details{display:grid;grid-template-columns:76px minmax(0,1fr);gap:6px 10px;margin:8px 0 0}\r\n.wsc-details div{display:contents}\r\n.wsc-details dt{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px}\r\n.wsc-details dd{min-width:0;margin:0;overflow-wrap:anywhere;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:17px}\r\n/* Inline translate affordance in the detail sheet description row. */\r\n.wsc-translate-btn{margin-left:6px;padding:1px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;cursor:pointer;vertical-align:baseline}\r\n.wsc-translate-btn:hover{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}\r\n.wsc-translate-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}\r\n.wsc-translate-error{display:block;margin-top:2px;color:var(--dsw-alias-state-error-primary);font-size:11px;line-height:15px}\r\n/* Detail sheet: a small centered popover above the panel. The list keeps its\r\n   steady grid; the sheet carries the full-width description instead. */\r\n.wsc-sheet-overlay{position:fixed;inset:0;z-index:1001;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-mask-1);pointer-events:auto}\r\n.wsc-sheet{width:min(560px,calc(100vw - 48px));max-height:min(480px,calc(100vh - 64px));overflow-y:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:16px;background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-shadow-lv3);padding:14px 18px 16px;box-sizing:border-box}\r\n.wsc-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}\r\n.wsc-sheet-title{font-size:14px;line-height:20px;font-weight:600;overflow-wrap:anywhere}\r\n.wsc-sheet-actions{display:flex;align-items:center;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l2)}\r\n.wsc-sheet-switch-label{font-size:12px;color:var(--dsw-alias-label-secondary)}\r\n.wsc-switch{display:inline-flex;flex:none;align-items:center;padding:0;border:0;background:transparent;cursor:pointer;border-radius:999px}\r\n.wsc-switch:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}\r\n.wsc-switch-track{position:relative;display:inline-block;width:28px;height:16px;border-radius:999px;background:var(--dsw-alias-border-l2);transition:background-color 120ms var(--ds-ease-in-out)}\r\n.wsc-switch-track[data-on='true']{background:var(--dsw-alias-state-business-primary)}\r\n.wsc-switch-thumb{position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:var(--dsw-alias-bg-layer-1);transition:transform 120ms var(--ds-ease-in-out)}\r\n.wsc-switch-track[data-on='true'] .wsc-switch-thumb{transform:translateX(12px)}\r\n.wsc-actions{display:flex;gap:8px;align-items:center;margin-top:2px}\r\n.wsc-btn{font-size:13px;line-height:22px;padding:4px 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:inherit;cursor:pointer;font-family:inherit}\r\n.wsc-btn:hover{border-color:var(--dsw-alias-border-l2)}\r\n.wsc-btn:disabled{opacity:.6;cursor:default}\r\n.wsc-notice{font-size:12px;color:var(--dsw-alias-state-success-primary);margin:0}\r\n.wsc-error{font-size:12px;color:var(--dsw-alias-state-error-primary);margin:0}\r\n.wsc-hint{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.6;margin:0}\r\n@media (max-width:680px){\r\n  /* Phone: the centered floating panel wastes too much width; become a\r\n     full-screen sheet (dvh keeps it correct under mobile browser chrome). */\r\n  .wsc-panel{width:100vw;max-width:none;height:100vh;height:100dvh;border-radius:0}\r\n  .wsc-panel-head{height:50px;padding:8px 10px 8px 16px}\r\n  .wsc-panel-body{padding:4px 14px 20px}\r\n  .wsc-chip{max-width:150px}\r\n  /* Vertical space is scarce on phones too: stack the toolbar, single column. */\r\n  .wsc-toolbar{flex-direction:column;align-items:stretch}\r\n  .wsc-toolbar .wsc-tabs{width:100%}\r\n  .wsc-group-pills{flex-wrap:wrap}\r\n  .wsc-cards{grid-template-columns:minmax(0,1fr)}\r\n  .wsc-details{grid-template-columns:64px minmax(0,1fr)}\r\n  .wsc-sheet{width:calc(100vw - 32px)}\r\n  .wsc-actions{flex-wrap:wrap}\r\n  .wsc-tab{font-size:12px;padding:7px 0}\r\n}\r\n";
		const classes = {
			"chip": "wsc-chip",
			"seatIcon": "wsc-seat-icon",
			"overlay": "wsc-overlay",
			"mask": "wsc-mask",
			"panel": "wsc-panel",
			"panelHead": "wsc-panel-head",
			"panelTitle": "wsc-panel-title",
			"headActions": "wsc-head-actions",
			"close": "wsc-close",
			"panelBody": "wsc-panel-body",
			"body": "wsc-body",
			"help": "wsc-help",
			"toolbar": "wsc-toolbar",
			"tabs": "wsc-tabs",
			"search": "wsc-search",
			"tab": "wsc-tab",
			"tabBadge": "wsc-tab-badge",
			"groupPills": "wsc-group-pills",
			"groupPill": "wsc-group-pill",
			"pillSummary": "wsc-pill-summary",
			"listScroll": "wsc-list-scroll",
			"cards": "wsc-cards",
			"card": "wsc-card",
			"cardMain": "wsc-card-main",
			"row": "wsc-row",
			"cardTitle": "wsc-card-title",
			"tag": "wsc-tag",
			"details": "wsc-details",
			"translateBtn": "wsc-translate-btn",
			"translateError": "wsc-translate-error",
			"sheetOverlay": "wsc-sheet-overlay",
			"sheet": "wsc-sheet",
			"sheetHead": "wsc-sheet-head",
			"sheetTitle": "wsc-sheet-title",
			"sheetActions": "wsc-sheet-actions",
			"sheetSwitchLabel": "wsc-sheet-switch-label",
			"switch": "wsc-switch",
			"switchTrack": "wsc-switch-track",
			"switchThumb": "wsc-switch-thumb",
			"actions": "wsc-actions",
			"btn": "wsc-btn",
			"notice": "wsc-notice",
			"error": "wsc-error",
			"hint": "wsc-hint"
		};
		const tagId = "dsh-workspace-scope/styles.module.css";
		const ownerId = "dsh-workspace-scope";
		if (typeof document !== "undefined") {
			let tag = document.querySelector("style[data-plugin-css=\"dsh-workspace-scope/styles.module.css\"]");
			if (tag === null) {
				tag = document.createElement("style");
				tag.dataset.pluginCss = tagId;
				document.head.appendChild(tag);
			}
			tag.dataset.plugin = ownerId;
			tag.textContent = css;
		}
		//#endregion
		//#region src/client/components.tsx
		function PresetIcon(props) {
			const maskId = `wsc${(0, react.useId)().replaceAll(":", "")}`;
			return /* @__PURE__ */ react.default.createElement("svg", {
				width: 16,
				height: 16,
				viewBox: "0 0 16 16",
				fill: "none",
				className: props.className
			}, /* @__PURE__ */ react.default.createElement("mask", {
				id: maskId,
				maskUnits: "userSpaceOnUse",
				x: "0",
				y: "0",
				width: "16",
				height: "16"
			}, /* @__PURE__ */ react.default.createElement("rect", {
				width: "16",
				height: "16",
				fill: "white"
			}), /* @__PURE__ */ react.default.createElement("circle", {
				cx: "7.9995",
				cy: "3.28319",
				r: "1.712",
				fill: "black"
			}), /* @__PURE__ */ react.default.createElement("circle", {
				cx: "3.51122",
				cy: "11.3855",
				r: "1.712",
				fill: "black"
			}), /* @__PURE__ */ react.default.createElement("circle", {
				cx: "12.4878",
				cy: "11.3855",
				r: "1.712",
				fill: "black"
			})), /* @__PURE__ */ react.default.createElement("path", {
				mask: `url(#${maskId})`,
				fill: "currentColor",
				d: "M12.2881 11.0425C12.6002 11.3723 13.0413 11.5786 13.5312 11.5786L13.5342 11.5776C13.1476 12.3233 12.6119 12.9785 11.9639 13.5005C10.9327 14.3309 9.6199 14.8286 8.19336 14.8286C7.29864 14.8285 6.45056 14.6313 5.6875 14.2808C6.08309 14.0281 6.36707 13.6189 6.45215 13.1392C6.99022 13.3561 7.57767 13.476 8.19336 13.4761C9.30019 13.4761 10.3157 13.0915 11.1152 12.4478C11.5935 12.0626 11.9924 11.5848 12.2881 11.0425ZM4.14746 4.36475C4.25569 4.83228 4.55488 5.2247 4.95898 5.4585C4.07956 6.30639 3.53144 7.49605 3.53125 8.81396C3.53125 9.69534 3.77613 10.5202 4.20117 11.2231C3.74959 11.3817 3.38395 11.7232 3.19531 12.1597C2.5541 11.2032 2.17969 10.052 2.17969 8.81396C2.17989 7.05087 2.93868 5.4646 4.14746 4.36475ZM8.19336 2.80029C8.85717 2.80029 9.49784 2.90834 10.0967 3.10791C12.3237 3.85044 13.9725 5.86061 14.1846 8.28369C13.9832 8.20048 13.7627 8.15382 13.5312 8.15381C13.2802 8.15381 13.042 8.20907 12.8271 8.30615C12.6281 6.47264 11.3666 4.95616 9.66895 4.39014C9.2063 4.236 8.70989 4.15186 8.19336 4.15186C7.96112 4.15189 7.7329 4.16981 7.50977 4.20264C7.51947 4.12886 7.52637 4.05348 7.52637 3.97705C7.52628 3.56604 7.3811 3.18914 7.13965 2.89404C7.48183 2.83352 7.83381 2.80033 8.19336 2.80029Z"
			}), /* @__PURE__ */ react.default.createElement("path", {
				fill: "currentColor",
				d: "M9.1123 3.28271C9.11205 2.66858 8.61322 2.17041 7.99902 2.17041C7.38504 2.17067 6.88697 2.66874 6.88672 3.28271C6.88672 3.89691 7.38489 4.39574 7.99902 4.396C8.61338 4.396 9.1123 3.89707 9.1123 3.28271ZM10.3115 3.28271C10.3115 4.55981 9.27612 5.59521 7.99902 5.59521C6.72214 5.59496 5.6875 4.55965 5.6875 3.28271C5.68776 2.00599 6.7223 0.971447 7.99902 0.971191C9.27596 0.971191 10.3113 2.00584 10.3115 3.28271Z"
			}), /* @__PURE__ */ react.default.createElement("path", {
				fill: "currentColor",
				d: "M4.62402 11.385C4.62377 10.7709 4.12494 10.2727 3.51074 10.2727C2.89676 10.273 2.39869 10.771 2.39844 11.385C2.39844 11.9992 2.89661 12.498 3.51074 12.4983C4.1251 12.4983 4.62402 11.9994 4.62402 11.385ZM5.82324 11.385C5.82324 12.6621 4.78784 13.6975 3.51074 13.6975C2.23386 13.6973 1.19922 12.6619 1.19922 11.385C1.19947 10.1083 2.23402 9.07374 3.51074 9.07349C4.78768 9.07349 5.82299 10.1081 5.82324 11.385Z"
			}), /* @__PURE__ */ react.default.createElement("path", {
				fill: "currentColor",
				d: "M13.6006 11.385C13.6003 10.7709 13.1015 10.2727 12.4873 10.2727C11.8733 10.273 11.3753 10.771 11.375 11.385C11.375 11.9992 11.8732 12.498 12.4873 12.4983C13.1017 12.4983 13.6006 11.9994 13.6006 11.385ZM14.7998 11.385C14.7998 12.6621 13.7644 13.6975 12.4873 13.6975C11.2104 13.6973 10.1758 12.6619 10.1758 11.385C10.176 10.1083 11.2106 9.07374 12.4873 9.07349C13.7642 9.07349 14.7995 10.1081 14.7998 11.385Z"
			}));
		}
		function CloseIcon() {
			return /* @__PURE__ */ react.default.createElement("svg", {
				width: 14,
				height: 14,
				viewBox: "0 0 14 14",
				fill: "none",
				"aria-hidden": "true"
			}, /* @__PURE__ */ react.default.createElement("path", {
				fill: "currentColor",
				d: "M7 5.84863L4.57617 3.4248L3.4248 4.57617L5.84863 7L3.4248 9.42383L4.57617 10.5752L7 8.15137L9.42383 10.5752L10.5752 9.42383L8.15137 7L10.5752 4.57617L9.4248 3.4248L7 5.84863Z"
			}));
		}
		function SearchIcon() {
			return /* @__PURE__ */ react.default.createElement("svg", {
				width: 16,
				height: 16,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true"
			}, /* @__PURE__ */ react.default.createElement("path", {
				fill: "currentColor",
				d: "M11.894845 6.647401C11.894845 3.725463 9.534486 1.356779 6.623219 1.35657C3.711786 1.35657 1.351635 3.725338 1.351635 6.647401C1.351843 9.569296 3.711911 11.938273 6.623219 11.938273C9.534361 11.938064 11.894637 9.569171 11.894845 6.647401ZM13.245462 6.647401C13.245254 10.317935 10.280401 13.293613 6.623219 13.293821C2.965871 13.293821 0.000204 10.31806 0 6.647401C0 2.976574 2.965746 0 6.623219 0C10.280526 0.000205 13.245462 2.9767 13.245462 6.647401Z"
			}), /* @__PURE__ */ react.default.createElement("path", {
				fill: "currentColor",
				d: "M16.000417 15.041079L15.044449 16.000433L11.530434 12.473588L12.486298 11.514234L16.000417 15.041079Z"
			}));
		}
		function InfoIcon() {
			return /* @__PURE__ */ react.default.createElement("svg", {
				width: 14,
				height: 14,
				viewBox: "0 0 14 14",
				fill: "none",
				"aria-hidden": "true"
			}, /* @__PURE__ */ react.default.createElement("circle", {
				cx: "7",
				cy: "7",
				r: "6",
				stroke: "currentColor",
				strokeWidth: "1.3"
			}), /* @__PURE__ */ react.default.createElement("path", {
				fill: "currentColor",
				d: "M6.3 5.9H7.7V10.4H6.3z"
			}), /* @__PURE__ */ react.default.createElement("circle", {
				cx: "7",
				cy: "4.2",
				r: "0.9",
				fill: "currentColor"
			}));
		}
		function WscSwitch(props) {
			return /* @__PURE__ */ react.default.createElement("button", {
				type: "button",
				role: "switch",
				"aria-checked": props.checked,
				"aria-label": props.label,
				className: classes.switch,
				onClick: props.onToggle
			}, /* @__PURE__ */ react.default.createElement("span", {
				className: classes.switchTrack,
				"data-on": props.checked ? "true" : void 0,
				"aria-hidden": "true"
			}, /* @__PURE__ */ react.default.createElement("span", { className: classes.switchThumb })));
		}
		function ScopeBar(props) {
			const open = useModalOpen();
			return /* @__PURE__ */ react.default.createElement("button", {
				type: "button",
				className: classes.chip,
				onClick: () => setModalOpen(!open),
				"aria-expanded": open,
				title: "按工作区限制当前 Agent 的 Skill 与 Host 全局 MCP"
			}, /* @__PURE__ */ react.default.createElement(PresetIcon, { className: classes.seatIcon }), /* @__PURE__ */ react.default.createElement("span", null, "工作区能力"));
		}
		const SCOPE_TABS = [
			{
				scope: "global",
				label: "全局"
			},
			{
				scope: "workspace",
				label: "工作区"
			},
			{
				scope: "session",
				label: "会话"
			}
		];
		function ScopeTabs(props) {
			return /* @__PURE__ */ react.default.createElement("div", {
				className: classes.tabs,
				role: "tablist",
				"aria-label": "作用域"
			}, SCOPE_TABS.map((tab) => {
				const badge = props.badges?.[tab.scope];
				return /* @__PURE__ */ react.default.createElement("button", {
					key: tab.scope,
					type: "button",
					role: "tab",
					"aria-selected": props.active === tab.scope,
					className: classes.tab,
					"data-active": props.active === tab.scope ? "true" : void 0,
					onClick: () => props.onChange(tab.scope)
				}, tab.label, badge !== void 0 && /* @__PURE__ */ react.default.createElement("span", {
					className: classes.tabBadge,
					"data-custom": badge === "已自定义" ? "true" : void 0,
					"aria-hidden": "true"
				}, badge));
			}));
		}
		function GroupPills(props) {
			return /* @__PURE__ */ react.default.createElement("div", {
				className: classes.groupPills,
				role: "tablist",
				"aria-label": "能力分组"
			}, /* @__PURE__ */ react.default.createElement("button", {
				type: "button",
				role: "tab",
				"aria-selected": props.active === "skills",
				className: classes.groupPill,
				"data-active": props.active === "skills" ? "true" : void 0,
				onClick: () => props.onChange("skills")
			}, "技能", /* @__PURE__ */ react.default.createElement("span", { className: classes.pillSummary }, props.skillsSummary)), /* @__PURE__ */ react.default.createElement("button", {
				type: "button",
				role: "tab",
				"aria-selected": props.active === "mcps",
				className: classes.groupPill,
				"data-active": props.active === "mcps" ? "true" : void 0,
				onClick: () => props.onChange("mcps")
			}, "MCP", /* @__PURE__ */ react.default.createElement("span", { className: classes.pillSummary }, props.mcpsSummary)));
		}
		function CapabilityRow(props) {
			return /* @__PURE__ */ react.default.createElement("li", { className: classes.card }, /* @__PURE__ */ react.default.createElement("div", { className: classes.cardMain }, /* @__PURE__ */ react.default.createElement(WscSwitch, {
				checked: props.enabled,
				onToggle: props.onToggle,
				label: `${props.enabled ? "禁用" : "启用"} ${props.label}`
			}), /* @__PURE__ */ react.default.createElement("button", {
				type: "button",
				className: classes.row,
				"aria-haspopup": "dialog",
				"aria-controls": `wsc-details-${props.id}`,
				onClick: props.onExpand
			}, /* @__PURE__ */ react.default.createElement("span", { className: classes.cardTitle }, props.label), /* @__PURE__ */ react.default.createElement("span", {
				className: classes.tag,
				"data-enabled": props.enabled ? "true" : "false"
			}, props.enabled ? "已启用" : "已禁用"))));
		}
		function DetailSheet(props) {
			const baseDescription = props.kind === "mcp" ? `${props.detail}（Host 全局 MCP 服务器）` : props.detail === "" ? "（无描述）" : props.detail;
			return /* @__PURE__ */ react.default.createElement("div", {
				className: classes.sheetOverlay,
				onClick: props.onClose
			}, /* @__PURE__ */ react.default.createElement("div", {
				className: classes.sheet,
				id: `wsc-details-${props.id}`,
				role: "dialog",
				"aria-label": `${props.label} 详情`,
				onClick: (event) => event.stopPropagation()
			}, /* @__PURE__ */ react.default.createElement("div", { className: classes.sheetHead }, /* @__PURE__ */ react.default.createElement("span", { className: classes.sheetTitle }, props.label), /* @__PURE__ */ react.default.createElement("button", {
				type: "button",
				className: classes.close,
				onClick: props.onClose,
				title: "关闭"
			}, /* @__PURE__ */ react.default.createElement(CloseIcon, null))), /* @__PURE__ */ react.default.createElement("dl", { className: classes.details }, /* @__PURE__ */ react.default.createElement("div", null, /* @__PURE__ */ react.default.createElement("dt", null, "状态"), /* @__PURE__ */ react.default.createElement("dd", null, props.enabled ? "已启用" : "已禁用")), /* @__PURE__ */ react.default.createElement("div", null, /* @__PURE__ */ react.default.createElement("dt", null, "描述"), /* @__PURE__ */ react.default.createElement("dd", null, /* @__PURE__ */ react.default.createElement("span", { title: props.translated !== void 0 ? props.detail : void 0 }, props.translating === true ? "翻译中…" : props.translated !== void 0 ? props.translated : baseDescription), props.translateError !== void 0 && /* @__PURE__ */ react.default.createElement("span", { className: classes.translateError }, "翻译失败：", props.translateError), props.onTranslate !== void 0 && props.translated === void 0 && props.translating !== true && /* @__PURE__ */ react.default.createElement("button", {
				type: "button",
				className: classes.translateBtn,
				onClick: props.onTranslate
			}, "翻译")))), /* @__PURE__ */ react.default.createElement("div", { className: classes.sheetActions }, /* @__PURE__ */ react.default.createElement(WscSwitch, {
				checked: props.enabled,
				onToggle: props.onToggle,
				label: `${props.enabled ? "禁用" : "启用"} ${props.label}`
			}), /* @__PURE__ */ react.default.createElement("span", { className: classes.sheetSwitchLabel }, props.enabled ? "已启用" : "已禁用"))));
		}
		//#endregion
		//#region src/shared/layers.ts
		function normalizeMode(value) {
			return value === "whitelist" || value === "blacklist" ? value : "default";
		}
		/**
		* One layer's verdict for a single name, ignoring that layer's own allow list
		* (an exception list only ever refines an inherited layer's denial).
		*/
		function layerNameEnabled(mode, listed, name) {
			if (mode === "default") return true;
			return mode === "whitelist" ? listed.has(name) : !listed.has(name);
		}
		/**
		* Effective verdict for one capability across an ordered chain of layers,
		* outermost first (global, workspace, session). Each layer either speaks or
		* inherits:
		* - no layer (null) or a `default` one: the inherited verdict stands;
		* - allow exception: this name is enabled, whatever the inherited verdict said;
		* - whitelist: closed world — the name is enabled when listed, and an unlisted
		*   name never leaks in from a broader layer;
		* - blacklist: its own listings deny, and names it never mentioned keep the
		*   inherited verdict — a capability installed later stays governed by the
		*   broader layers.
		* A nearer layer's allow list wins over every inherited denial, and a nearer
		* denial wins over an inherited enable unless the nearer layer allows it.
		*/
		function layeredEnabled(layers, kind, name) {
			let enabled = true;
			for (const layer of layers) {
				if (layer === null || layer === void 0 || layer.mode === "default") continue;
				if (layer.allow[kind].has(name)) {
					enabled = true;
					continue;
				}
				if (layer.mode === "whitelist") {
					enabled = layer[kind].has(name);
					continue;
				}
				if (layer[kind].has(name)) enabled = false;
			}
			return enabled;
		}
		//#endregion
		//#region src/client/model.ts
		const emptyAllow = () => ({
			skills: /* @__PURE__ */ new Set(),
			mcps: /* @__PURE__ */ new Set()
		});
		function describeError(error) {
			return String(error && error.message || error);
		}
		function draftFromConfig(config) {
			const value = config ?? {};
			return {
				mode: normalizeMode(value.mode),
				skills: new Set(value.skills ?? []),
				mcps: new Set(value.mcps ?? []),
				allow: {
					skills: new Set(value.allow?.skills ?? []),
					mcps: new Set(value.allow?.mcps ?? [])
				}
			};
		}
		function effectiveEnabled(layers, key, name) {
			return layeredEnabled([
				layers.global,
				layers.workspace,
				layers.session
			], key, name);
		}
		function allEnabled(draft) {
			return draft.mode === "default" || draft.mode === "blacklist" && draft.skills.size === 0 && draft.mcps.size === 0 && draft.allow.skills.size === 0 && draft.allow.mcps.size === 0;
		}
		function followsGlobal(draft, globalDraft) {
			if (globalDraft === null) return false;
			if (allEnabled(draft) && allEnabled(globalDraft)) return true;
			if (draft.mode !== globalDraft.mode) return false;
			const same = (a, b) => a.size === b.size && [...a].every((name) => b.has(name));
			return same(draft.skills, globalDraft.skills) && same(draft.mcps, globalDraft.mcps) && same(draft.allow.skills, globalDraft.allow.skills) && same(draft.allow.mcps, globalDraft.allow.mcps);
		}
		function workspaceDraftFromConfig(config) {
			const draft = draftFromConfig(config);
			const customized = draft.mode !== "default";
			return {
				draft: customized ? draft : null,
				customized
			};
		}
		function sessionDraftFromConfig(config) {
			return workspaceDraftFromConfig(config);
		}
		function nextWorkspaceDraft(next, globalDraft, customized) {
			if (followsGlobal(next, globalDraft)) return {
				draft: null,
				customized: false,
				save: customized ? "reset" : null
			};
			return {
				draft: next,
				customized: true,
				save: "draft"
			};
		}
		function capabilityViews(data, group, query) {
			const needle = query.trim().toLocaleLowerCase();
			const matches = (text) => needle === "" || text.toLocaleLowerCase().includes(needle);
			if (group === "mcps") return (data?.mcp ?? []).filter((mcp) => matches(mcp.server)).map((mcp) => ({
				id: `mcp:${mcp.server}`,
				label: mcp.server,
				detail: `${mcp.toolCount} 个工具`,
				kind: "mcp",
				key: "mcps"
			}));
			return (data?.skills ?? []).filter((skill) => matches(skill.name) || matches(skill.description)).map((skill) => ({
				id: `skill:${skill.name}`,
				label: skill.name,
				detail: skill.description,
				kind: "skill",
				key: "skills"
			}));
		}
		function savePayload(draft, target) {
			const allowIsEmpty = draft.allow.skills.size === 0 && draft.allow.mcps.size === 0;
			const payload = {
				mode: draft.mode,
				skills: [...draft.skills],
				mcps: [...draft.mcps]
			};
			if (!allowIsEmpty) payload.allow = {
				skills: [...draft.allow.skills],
				mcps: [...draft.allow.mcps]
			};
			return target.scope === "global" ? {
				...payload,
				scope: "global"
			} : {
				...payload,
				scope: target.scope,
				sessionId: target.sessionId
			};
		}
		function toggleCapability(draft, key, name, baseline) {
			if (draft.mode === "default") {
				if (baseline) return {
					mode: "blacklist",
					skills: new Set(key === "skills" ? [name] : []),
					mcps: new Set(key === "mcps" ? [name] : []),
					allow: emptyAllow()
				};
				return {
					mode: "blacklist",
					skills: /* @__PURE__ */ new Set(),
					mcps: /* @__PURE__ */ new Set(),
					allow: {
						skills: new Set(key === "skills" ? [name] : []),
						mcps: new Set(key === "mcps" ? [name] : [])
					}
				};
			}
			if (draft.allow[key].has(name)) {
				const allow = new Set(draft.allow[key]);
				allow.delete(name);
				return {
					...draft,
					allow: {
						...draft.allow,
						[key]: allow
					}
				};
			}
			if (draft.mode === "whitelist") {
				const listed = new Set(draft[key]);
				if (listed.has(name)) listed.delete(name);
				else listed.add(name);
				return {
					...draft,
					[key]: listed
				};
			}
			const listed = new Set(draft[key]);
			if (listed.has(name)) {
				listed.delete(name);
				const allow = new Set(draft.allow[key]);
				if (!baseline) allow.add(name);
				return {
					...draft,
					[key]: listed,
					allow: {
						...draft.allow,
						[key]: allow
					}
				};
			}
			if (baseline) {
				listed.add(name);
				return {
					...draft,
					[key]: listed
				};
			}
			const allow = new Set(draft.allow[key]);
			allow.add(name);
			return {
				...draft,
				allow: {
					...draft.allow,
					[key]: allow
				}
			};
		}
		function setAllCapabilities(draft, currentSkills, currentMcps, enabled, globalDeny) {
			if (draft.mode === "default") {
				if (enabled) return draft;
				return {
					mode: "blacklist",
					skills: currentSkills,
					mcps: currentMcps,
					allow: emptyAllow()
				};
			}
			if (draft.mode === "whitelist") {
				const update = (listed, current) => enabled ? /* @__PURE__ */ new Set([...listed, ...current]) : new Set([...listed].filter((name) => !current.has(name)));
				return {
					...draft,
					skills: update(draft.skills, currentSkills),
					mcps: update(draft.mcps, currentMcps)
				};
			}
			if (enabled) return {
				...draft,
				skills: /* @__PURE__ */ new Set(),
				mcps: /* @__PURE__ */ new Set(),
				allow: {
					skills: new Set([...draft.allow.skills].filter((name) => !currentSkills.has(name) || globalDeny.skills.has(name))),
					mcps: new Set([...draft.allow.mcps].filter((name) => !currentMcps.has(name) || globalDeny.mcps.has(name)))
				}
			};
			return {
				...draft,
				skills: /* @__PURE__ */ new Set([...draft.skills, ...currentSkills]),
				mcps: /* @__PURE__ */ new Set([...draft.mcps, ...currentMcps]),
				allow: {
					skills: new Set([...draft.allow.skills].filter((name) => !currentSkills.has(name))),
					mcps: new Set([...draft.allow.mcps].filter((name) => !currentMcps.has(name)))
				}
			};
		}
		//#endregion
		//#region src/client/transport.ts
		async function handle(response) {
			if (response.ok) return response.json();
			let detail = `HTTP ${response.status}`;
			try {
				const body = await response.json();
				if (typeof body?.error === "string" && body.error !== "") detail = body.error;
			} catch {}
			throw new Error(detail);
		}
		function callOverview(sessionId) {
			if (typeof host !== "undefined") return host.call("overview", { sessionId });
			return fetch(`/api/dsh-workspace-scope/overview?sessionId=${encodeURIComponent(sessionId)}`).then(handle);
		}
		function callSave(payload) {
			if (typeof host !== "undefined") return host.call("save", payload);
			return fetch("/api/dsh-workspace-scope/save", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			}).then(handle);
		}
		//#endregion
		//#region src/client/translate.ts
		async function translateWithEdge(text) {
			const response = await fetch("https://edge.microsoft.com/translate/translatetext?to=zh-Hans", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify([text])
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const translated = (await response.json())[0]?.translations?.[0]?.text;
			if (translated === void 0) throw new Error("翻译响应格式异常");
			return translated;
		}
		const MYMEMORY_CHUNK = 480;
		async function translateWithMyMemory(text) {
			const chunks = [];
			for (let rest = text; rest.length > 0;) {
				if (rest.length <= MYMEMORY_CHUNK) {
					chunks.push(rest);
					break;
				}
				let cut = rest.lastIndexOf(" ", MYMEMORY_CHUNK);
				if (cut <= 0) cut = MYMEMORY_CHUNK;
				chunks.push(rest.slice(0, cut));
				rest = rest.slice(cut).replace(/^\s+/, "");
			}
			const translated = [];
			for (const chunk of chunks) {
				const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|zh-CN`);
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const body = await response.json();
				const item = body.responseData?.translatedText;
				const status = typeof body.responseStatus === "number" ? body.responseStatus : Number(body.responseStatus ?? NaN);
				if (typeof item !== "string" || item === "") throw new Error("备用翻译响应异常");
				if (Number.isFinite(status) && status !== 200) throw new Error(item);
				translated.push(item);
			}
			return translated.join(" ");
		}
		async function translateText(text) {
			if (typeof host !== "undefined") throw new Error("翻译仅在静态安装的客户端可用");
			try {
				return await translateWithEdge(text);
			} catch {
				return await translateWithMyMemory(text);
			}
		}
		//#endregion
		//#region src/client/scope-modal.tsx
		function ScopeModalSeat(props) {
			return useModalOpen() ? /* @__PURE__ */ react.default.createElement(ScopeModal, props) : null;
		}
		function ScopeModal(props) {
			const [data, setData] = (0, react.useState)(null);
			const [wsDraft, setWsDraft] = (0, react.useState)(null);
			const [sessionDraft, setSessionDraft] = (0, react.useState)(null);
			const [globalDraft, setGlobalDraft] = (0, react.useState)(null);
			const [scope, setScope] = (0, react.useState)("workspace");
			const [group, setGroup] = (0, react.useState)("skills");
			const [query, setQuery] = (0, react.useState)("");
			const [notice, setNotice] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [expanded, setExpanded] = (0, react.useState)(null);
			const [translations, setTranslations] = (0, react.useState)({});
			const [showHelp, setShowHelp] = (0, react.useState)(false);
			const panelRef = (0, react.useRef)(null);
			const sessionRef = (0, react.useRef)(void 0);
			const wsCustomizedRef = (0, react.useRef)(false);
			const sessionCustomizedRef = (0, react.useRef)(false);
			const mainSession = props.useSessions((state) => Object.values(state.byId).find((row) => (row.retainedBy.mainView ?? 0) > 0));
			const sessionId = mainSession?.id;
			const agentPreset = mainSession?.projectionValues?.agentPreset;
			(0, react.useEffect)(() => {
				sessionRef.current = sessionId;
				setData(null);
				setWsDraft(null);
				setSessionDraft(null);
				setGlobalDraft(null);
				setScope("workspace");
				setNotice(null);
				setError(null);
				setExpanded(null);
				setTranslations({});
				setQuery("");
				if (!sessionId) return;
				let current = true;
				callOverview(sessionId).then((overview) => {
					if (!current) return;
					setData(overview);
					setGlobalDraft(draftFromConfig(overview.globalConfig));
					const ws = workspaceDraftFromConfig(overview.config);
					wsCustomizedRef.current = ws.customized;
					setWsDraft(ws.draft);
					const session = sessionDraftFromConfig(overview.sessionConfig);
					sessionCustomizedRef.current = session.customized;
					setSessionDraft(session.draft);
				}).catch((loadError) => {
					if (current) setError(describeError(loadError));
				});
				return () => {
					current = false;
				};
			}, [sessionId, agentPreset]);
			(0, react.useEffect)(() => {
				panelRef.current?.focus();
				const onKey = (event) => {
					if (event.key === "Escape") {
						setModalOpen(false);
						return;
					}
					if (event.key !== "Tab") return;
					const panel = panelRef.current;
					if (!panel) return;
					const focusables = [...panel.querySelectorAll("button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])")];
					if (focusables.length === 0) return;
					const first = focusables[0];
					const last = focusables[focusables.length - 1];
					const active = document.activeElement;
					if (event.shiftKey && (active === first || !panel.contains(active))) {
						event.preventDefault();
						last.focus();
					} else if (!event.shiftKey && (active === last || !panel.contains(active))) {
						event.preventDefault();
						first.focus();
					}
				};
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, []);
			const activeDraft = scope === "global" ? globalDraft : scope === "workspace" ? wsDraft ?? globalDraft : sessionDraft ?? wsDraft ?? globalDraft;
			const inheritedEnabled = (key, name) => effectiveEnabled({
				global: globalDraft,
				workspace: wsDraft,
				session: null
			}, key, name);
			const baselineEnabled = (key, name) => scope === "session" ? inheritedEnabled(key, name) : globalDraft === null || layerNameEnabled(globalDraft.mode, globalDraft[key], name);
			const inheritedDeny = () => ({
				skills: new Set(skills.map((skill) => skill.name).filter((name) => !baselineEnabled("skills", name))),
				mcps: new Set(mcps.map((mcp) => mcp.server).filter((server) => !baselineEnabled("mcps", server)))
			});
			const shownEnabled = (key, name) => {
				if (scope === "global") return activeDraft !== null && layerNameEnabled(activeDraft.mode, activeDraft[key], name);
				if (scope === "workspace" && wsDraft === null) return activeDraft !== null && layerNameEnabled(activeDraft.mode, activeDraft[key], name);
				return effectiveEnabled({
					global: globalDraft,
					workspace: wsDraft,
					session: scope === "session" ? sessionDraft : null
				}, key, name);
			};
			const autosave = (next) => {
				if (sessionId === void 0) return;
				setNotice(null);
				const requested = sessionId;
				const savingScope = scope;
				callSave(savePayload(next, savingScope === "global" ? { scope: "global" } : savingScope === "session" ? {
					scope: "session",
					sessionId: requested
				} : {
					scope: "workspace",
					sessionId: requested
				})).then((result) => {
					if (requested !== sessionRef.current) return;
					setNotice(result.saved === true ? {
						kind: "ok",
						text: savingScope === "global" ? "已保存 ✓（全局策略，实时对所有会话生效）" : savingScope === "session" ? "已保存 ✓（仅本会话生效）" : "已保存 ✓（工作区策略，实时对该工作区的会话生效）"
					} : {
						kind: "err",
						text: `保存失败：${result.reason ?? "未知"}`
					});
				}).catch((saveError) => {
					if (requested !== sessionRef.current) return;
					setNotice({
						kind: "err",
						text: `保存失败：${describeError(saveError)}`
					});
				});
			};
			const skills = data?.skills ?? [];
			const mcps = data?.mcp ?? [];
			const activeRows = capabilityViews(data, group, query);
			const detailRow = expanded === null ? null : activeRows.find((row) => row.id === expanded) ?? null;
			const applyDraft = (next) => {
				if (scope === "global") {
					setGlobalDraft(next);
					autosave(next);
					return;
				}
				if (scope === "session") {
					setSessionDraft(next);
					sessionCustomizedRef.current = true;
					autosave(next);
					return;
				}
				const outcome = nextWorkspaceDraft(next, globalDraft, wsCustomizedRef.current);
				wsCustomizedRef.current = outcome.customized;
				setWsDraft(outcome.draft);
				if (outcome.save === "draft") {
					autosave(next);
					return;
				}
				if (outcome.save === "reset") {
					if (sessionId !== void 0) callSave(savePayload(draftFromConfig(void 0), {
						scope: "workspace",
						sessionId
					})).catch(() => void 0);
				}
				setNotice({
					kind: "ok",
					text: "与全局策略一致，本工作区跟随全局"
				});
			};
			const toggle = (key, name) => {
				if (activeDraft) applyDraft(toggleCapability(activeDraft, key, name, baselineEnabled(key, name)));
			};
			const setAll = (enabled) => {
				if (!activeDraft) return;
				applyDraft(setAllCapabilities(activeDraft, group === "skills" ? new Set(skills.map((skill) => skill.name)) : /* @__PURE__ */ new Set(), group === "mcps" ? new Set(mcps.map((mcp) => mcp.server)) : /* @__PURE__ */ new Set(), enabled, inheritedDeny()));
			};
			const resetSession = () => {
				if (sessionId === void 0) return;
				const requested = sessionId;
				setSessionDraft(null);
				sessionCustomizedRef.current = false;
				setNotice(null);
				callSave(savePayload(draftFromConfig(void 0), {
					scope: "session",
					sessionId: requested
				})).then((result) => {
					if (requested !== sessionRef.current) return;
					setNotice(result.saved === true ? {
						kind: "ok",
						text: "本会话已恢复跟随工作区"
					} : {
						kind: "err",
						text: `保存失败：${result.reason ?? "未知"}`
					});
				}).catch((resetError) => {
					if (requested !== sessionRef.current) return;
					setNotice({
						kind: "err",
						text: `保存失败：${describeError(resetError)}`
					});
				});
			};
			const switchScope = (next) => {
				if (next === scope) return;
				setScope(next);
				setExpanded(null);
				setNotice(null);
			};
			const translateRow = (rowId, text) => {
				if (translations[rowId]?.text !== void 0 || translations[rowId]?.loading === true) return;
				setTranslations((prev) => ({
					...prev,
					[rowId]: { loading: true }
				}));
				translateText(text).then((translated) => {
					setTranslations((prev) => ({
						...prev,
						[rowId]: { text: translated }
					}));
				}).catch((translateError) => {
					setTranslations((prev) => ({
						...prev,
						[rowId]: { error: describeError(translateError) }
					}));
				});
			};
			const shownSummary = (key) => {
				if (activeDraft === null) return "";
				const rows = capabilityViews(data, key, query).map((row) => row.label);
				return `${rows.filter((name) => shownEnabled(key, name)).length} / ${rows.length} 已启用`;
			};
			return /* @__PURE__ */ react.default.createElement("div", { className: classes.overlay }, /* @__PURE__ */ react.default.createElement("div", {
				className: classes.mask,
				onClick: () => setModalOpen(false)
			}), /* @__PURE__ */ react.default.createElement("div", {
				className: classes.panel,
				ref: panelRef,
				tabIndex: -1,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "工作区能力"
			}, /* @__PURE__ */ react.default.createElement("div", { className: classes.panelHead }, /* @__PURE__ */ react.default.createElement("span", { className: classes.panelTitle }, "工作区能力"), /* @__PURE__ */ react.default.createElement("div", { className: classes.headActions }, /* @__PURE__ */ react.default.createElement("button", {
				type: "button",
				className: classes.close,
				onClick: () => setShowHelp(!showHelp),
				"aria-expanded": showHelp,
				"aria-controls": "wsc-help",
				title: "使用说明"
			}, /* @__PURE__ */ react.default.createElement(InfoIcon, null)), /* @__PURE__ */ react.default.createElement("button", {
				type: "button",
				className: classes.close,
				onClick: () => setModalOpen(false),
				title: "关闭"
			}, /* @__PURE__ */ react.default.createElement(CloseIcon, null)))), /* @__PURE__ */ react.default.createElement("div", { className: classes.panelBody }, data === null ? /* @__PURE__ */ react.default.createElement("div", { className: classes.hint }, error ?? (sessionId ? "正在加载…" : "当前没有可用的会话上下文，请先新建或打开一个会话。")) : /* @__PURE__ */ react.default.createElement("div", { className: classes.body }, showHelp && /* @__PURE__ */ react.default.createElement("div", {
				id: "wsc-help",
				className: classes.help
			}, /* @__PURE__ */ react.default.createElement("p", { className: classes.hint }, scope === "session" ? "改动即时保存，仅对本会话生效。" : "改动即时保存，对所有会话立即生效。"), /* @__PURE__ */ react.default.createElement("p", { className: classes.hint }, scope === "global" ? "全局配置是所有工作区和会话的默认值；下层未单独配置时遵循此处的开关。" : scope === "workspace" ? "工作区未配置时遵循全局默认值；配置后以此处为准，会话未单独配置时再跟随工作区。" : "会话默认跟随其工作区（工作区再跟随全局）；在此处开关后仅对本会话生效，可点「恢复跟随工作区」撤回。")), /* @__PURE__ */ react.default.createElement("div", { className: classes.toolbar }, /* @__PURE__ */ react.default.createElement(ScopeTabs, {
				active: scope,
				onChange: switchScope,
				badges: {
					workspace: wsDraft !== null ? "已自定义" : "跟随全局",
					session: sessionDraft !== null ? "已自定义" : "跟随工作区"
				}
			}), /* @__PURE__ */ react.default.createElement("label", { className: classes.search }, /* @__PURE__ */ react.default.createElement(SearchIcon, null), /* @__PURE__ */ react.default.createElement("input", {
				type: "search",
				value: query,
				placeholder: "搜索技能或 MCP…",
				"aria-label": "搜索技能或 MCP",
				onChange: (event) => setQuery(event.currentTarget.value)
			}))), /* @__PURE__ */ react.default.createElement(GroupPills, {
				active: group,
				onChange: (next) => {
					setGroup(next);
					setExpanded(null);
				},
				skillsSummary: shownSummary("skills"),
				mcpsSummary: shownSummary("mcps")
			}), /* @__PURE__ */ react.default.createElement("div", { className: classes.listScroll }, activeRows.length > 0 ? /* @__PURE__ */ react.default.createElement("ul", { className: classes.cards }, activeRows.map((row) => {
				return /* @__PURE__ */ react.default.createElement(CapabilityRow, {
					key: row.id,
					id: row.id,
					label: row.label,
					kind: row.kind,
					enabled: shownEnabled(row.key, row.label),
					onToggle: () => toggle(row.key, row.label),
					onExpand: () => setExpanded(row.id)
				});
			})) : /* @__PURE__ */ react.default.createElement("p", { className: classes.hint }, group === "skills" ? "没有匹配的技能。" : "没有匹配的 MCP 服务器。")), /* @__PURE__ */ react.default.createElement("div", { className: classes.actions }, /* @__PURE__ */ react.default.createElement("button", {
				type: "button",
				className: classes.btn,
				onClick: () => setAll(true)
			}, "全部启用"), /* @__PURE__ */ react.default.createElement("button", {
				type: "button",
				className: classes.btn,
				onClick: () => setAll(false)
			}, "全部禁用"), scope === "session" && sessionDraft !== null && /* @__PURE__ */ react.default.createElement("button", {
				type: "button",
				className: classes.btn,
				onClick: resetSession
			}, "恢复跟随工作区")), notice && /* @__PURE__ */ react.default.createElement("p", { className: notice.kind === "ok" ? classes.notice : classes.error }, notice.text)))), detailRow !== null && /* @__PURE__ */ react.default.createElement(DetailSheet, {
				id: detailRow.id,
				label: detailRow.label,
				detail: detailRow.detail,
				kind: detailRow.kind,
				enabled: shownEnabled(detailRow.key, detailRow.label),
				translated: detailRow.kind === "skill" ? translations[detailRow.id]?.text : void 0,
				translating: detailRow.kind === "skill" ? translations[detailRow.id]?.loading : void 0,
				translateError: detailRow.kind === "skill" ? translations[detailRow.id]?.error : void 0,
				onTranslate: detailRow.kind === "skill" && detailRow.detail !== "" ? () => translateRow(detailRow.id, detailRow.detail) : void 0,
				onToggle: () => toggle(detailRow.key, detailRow.label),
				onClose: () => setExpanded(null)
			}));
		}
		//#endregion
		//#region src/client/index.tsx
		/** dsh-workspace-scope — Client entry and slot registration. */
		const name = "workspace-scope-client";
		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
				name: "conversation.input.right",
				id: "workspace-scope",
				order: 30,
				label: "工作区能力"
			}, (props) => (0, react.createElement)(ScopeBar, props)));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "workspace-scope-modal",
				order: 50
			}, (props) => (0, react.createElement)(ScopeModalSeat, props)));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map